const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const FormData = require('form-data');

const app = express();

// ─── 1. Security Headers & Hardening ─────────────────────────────────────────
app.disable('x-powered-by');

app.use((req, res, next) => {
  // Prevent MIME-sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // Prevent clickjacking via iframes
  res.setHeader('X-Frame-Options', 'DENY');
  // Cross-site scripting filter
  res.setHeader('X-XSS-Protection', '1; mode=block');
  // Strict Referrer Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  // Enforce HTTPS
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  // Restrict sensitive browser APIs
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  // Content Security Policy
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:;"
  );
  next();
});

// ─── 2. CORS & Body Parser Limits (DoS Defense) ──────────────────────────────
app.use(
  cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'expo-platform',
      'expo-runtime-version',
      'expo-protocol-version',
      'expo-current-update-id',
      'expo-sfv-version',
    ],
  })
);

// Limit JSON payload to 500KB to prevent memory exhaustion DoS attacks
app.use(express.json({ limit: '500kb' }));

// Recursive NoSQL injection defense (strips keys starting with $ or containing .)
function sanitizeNoSql(obj) {
  if (!obj || typeof obj !== 'object') return;
  for (const key of Object.keys(obj)) {
    if (key.startsWith('$') || key.includes('.')) {
      delete obj[key];
    } else if (typeof obj[key] === 'object') {
      sanitizeNoSql(obj[key]);
    }
  }
}

app.use((req, res, next) => {
  if (req.body) sanitizeNoSql(req.body);
  if (req.query) sanitizeNoSql(req.query);
  if (req.params) sanitizeNoSql(req.params);
  next();
});

// ─── 3. In-Memory Sliding-Window Rate Limiter ────────────────────────────────
function createRateLimiter({ windowMs, maxRequests, message }) {
  const hits = new Map();

  // Periodic cleanup every 5 minutes to prevent memory leaks
  setInterval(() => {
    const now = Date.now();
    for (const [ip, record] of hits.entries()) {
      if (now - record.resetTime > windowMs) {
        hits.delete(ip);
      }
    }
  }, 300000).unref();

  return (req, res, next) => {
    const ip =
      req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      req.socket.remoteAddress ||
      'unknown';
    const now = Date.now();
    const record = hits.get(ip) || { count: 0, resetTime: now + windowMs };

    if (now > record.resetTime) {
      record.count = 1;
      record.resetTime = now + windowMs;
    } else {
      record.count += 1;
    }
    hits.set(ip, record);

    if (record.count > maxRequests) {
      const retryAfter = Math.ceil((record.resetTime - now) / 1000);
      res.setHeader('Retry-After', retryAfter);
      return res.status(429).json({
        error: message || 'Too many requests. Please try again later.',
      });
    }
    next();
  };
}

// Strict limiter for authentication endpoints (prevents brute-force)
const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 15,
  message: 'Too many authentication attempts. Please try again in 15 minutes.',
});

// General limiter for transactions and sync
const apiLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 120,
  message: 'API rate limit exceeded. Please slow down.',
});

// ─── 4. Input Sanitization & Defense ─────────────────────────────────────────
function sanitizeString(val, maxLen = 200) {
  if (typeof val !== 'string') return '';
  return val.replace(/[\x00-\x1F\x7F]/g, '').trim().slice(0, maxLen);
}

function isValidEmail(email) {
  if (typeof email !== 'string') return false;
  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email.trim());
}

// Dummy hash for constant-time comparison against nonexistent users (timing attack defense)
const DUMMY_HASH = '$2a$10$wT1dO7jYf8F2vB3kE1pQ6ex4K1vF5.bJ7qN3zY9wX1uM8pL5kO9q';

// ─── 5. Config ───────────────────────────────────────────────────────────────
const MONGO_URI =
  process.env.MONGO_URI ||
  'mongodb+srv://cryptxerox_db_user:Helloworld%40123@cluster0.pbap0ap.mongodb.net/fundmanager?retryWrites=true&w=majority&appName=Cluster0';
const JWT_SECRET = process.env.JWT_SECRET || 'fm_suwan_jwt_2024_secret';
const PORT = process.env.PORT || 3001;

// ─── 6. Schemas & Models ─────────────────────────────────────────────────────
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  name:  { type: String, required: true, trim: true },
  passwordHash: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const User = mongoose.model('User', userSchema);

const transactionSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  userEmail: { type: String, default: '', lowercase: true, trim: true, index: true },
  txId: { type: String, required: true },
  type: { type: String, required: true, enum: ['income', 'expense'] },
  amount: { type: Number, required: true },
  note: { type: String, default: '', maxlength: 120 },
  category: { type: String, required: true, maxlength: 40 },
  date: { type: String, required: true },
  createdAt: { type: Number, required: true },
  updatedAt: { type: Number, required: true },
  time: { type: Number, required: true },
});

transactionSchema.index({ userId: 1, txId: 1 });
transactionSchema.index({ userEmail: 1, txId: 1 });
const ServerTransaction = mongoose.model('Transaction', transactionSchema);

// ─── 7. MongoDB Connection ───────────────────────────────────────────────────
mongoose
  .connect(MONGO_URI)
  .then(() => console.log('✅ Connected to MongoDB Atlas'))
  .catch(err => {
    const safeMsg = (err.message || '').replace(/:([^:@]+)@/, ':***@');
    console.error('❌ MongoDB connection error:', safeMsg);
    process.exit(1);
  });

// ─── 8. Auth Helpers & Middleware ────────────────────────────────────────────
const makeToken = (user) =>
  jwt.sign(
    { id: user._id.toString(), email: user.email },
    JWT_SECRET,
    { algorithm: 'HS256', expiresIn: '60d' }
  );

const sanitizeUser = (u) => ({
  id: u._id.toString(),
  email: u.email,
  name: u.name,
  createdAt: u.createdAt ? (u.createdAt.getTime ? u.createdAt.getTime() : new Date(u.createdAt).getTime()) : Date.now(),
});

// Protect sensitive endpoints: require verified JWT
const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required. Missing Bearer token.' });
  }

  const token = authHeader.slice(7).trim();
  if (!token || token === 'local_token' || token === 'bio_offline_token') {
    return res.status(401).json({ error: 'Please log in with your email and password to connect to cloud.' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
    req.user = payload; // { id, email }
    next();
  } catch {
    return res.status(401).json({ error: 'Session expired or invalid token. Please log in again.' });
  }
};

// ─── 9. Public Routes & Portal ───────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));

// Root welcome / Minimal landing page
app.get('/', (req, res) => {
  if (req.headers.accept && req.headers.accept.includes('application/json') && !req.headers.accept.includes('text/html')) {
    return res.json({
      name: "Suwan's FundManager API",
      status: 'online',
      version: '1.0.0',
      runtime: `Node.js ${process.version}`,
      cloud: 'Azure App Service',
      security: 'TLS 1.3 / JWT / Rate-Limited',
      time: new Date().toISOString(),
    });
  }
  const indexPath = path.join(__dirname, 'public', 'index.html');
  if (fs.existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }
  res.json({
    name: "Suwan's FundManager API",
    status: 'online',
    version: '1.0.0',
    runtime: `Node.js ${process.version}`,
    cloud: 'Azure App Service',
    time: new Date().toISOString(),
  });
});

// Direct APK Download endpoint
app.get(['/download/apk', '/download/FundManager.apk'], (req, res) => {
  const localApk = path.join(__dirname, 'public', 'FundManager.apk');
  if (fs.existsSync(localApk)) {
    return res.download(localApk, 'FundManager.apk');
  }
  res.redirect('https://github.com/suwandhital/fundmanager/releases/latest/download/FundManager.apk');
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

// Version & OTA metadata endpoint
app.get('/api/version', (req, res) => {
  res.json({
    name: "Suwan's FundManager",
    version: '1.0.0',
    otaEnabled: true,
    latestApkUrl: 'https://github.com/suwandhital/fundmanager/releases/latest',
  });
});

// ─── 10. Authentication Routes ───────────────────────────────────────────────

// Register (Rate-Limited, Strict Validation)
app.post('/api/auth/register', authLimiter, async (req, res) => {
  try {
    const rawName = sanitizeString(req.body.name, 60);
    const rawEmail = sanitizeString(req.body.email, 120).toLowerCase();
    const rawPassword = typeof req.body.password === 'string' ? req.body.password : '';

    if (!rawName || !rawEmail || !rawPassword) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }
    if (rawPassword.length < 4 || rawPassword.length > 100) {
      return res.status(400).json({ error: 'Password must be between 4 and 100 characters' });
    }
    if (!isValidEmail(rawEmail)) {
      return res.status(400).json({ error: 'Invalid email address format' });
    }

    let user = await User.findOne({ email: rawEmail });
    if (user) {
      const valid = await bcrypt.compare(rawPassword, user.passwordHash);
      if (valid) {
        return res.json({ user: sanitizeUser(user), token: makeToken(user) });
      }
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const passwordHash = await bcrypt.hash(rawPassword, 10);
    user = await User.create({ name: rawName, email: rawEmail, passwordHash });
    console.log(`[API] ✅ Registered user: ${user._id} (${user.email})`);

    res.status(201).json({ user: sanitizeUser(user), token: makeToken(user) });
  } catch (err) {
    console.error('Register error:', err.message);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

// Login (Rate-Limited, Timing-Attack Resistant)
app.post('/api/auth/login', authLimiter, async (req, res) => {
  try {
    const rawEmail = sanitizeString(req.body.email, 120).toLowerCase();
    const rawPassword = typeof req.body.password === 'string' ? req.body.password : '';

    if (!rawEmail || !rawPassword) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await User.findOne({ email: rawEmail });

    // Timing-attack defense: compare against dummy hash if user not found
    if (!user) {
      await bcrypt.compare(rawPassword, DUMMY_HASH);
      return res.status(401).json({ error: 'Account not found. Please register first.' });
    }

    const valid = await bcrypt.compare(rawPassword, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Incorrect password' });
    }

    console.log(`[API] ✅ Logged in user: ${user._id} (${user.email})`);
    res.json({ user: sanitizeUser(user), token: makeToken(user) });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

// Update Profile (Authenticated, Self-Scoped Only)
const handleProfileUpdate = async (req, res) => {
  try {
    const authUserId = req.user.id;
    const user = await User.findById(authUserId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const rawName = sanitizeString(req.body.name, 60);
    const rawNewEmail = sanitizeString(req.body.newEmail, 120).toLowerCase();
    const rawPassword = typeof req.body.password === 'string' ? req.body.password : '';

    if (rawName) {
      user.name = rawName;
    }
    if (rawNewEmail && rawNewEmail !== user.email) {
      if (!isValidEmail(rawNewEmail)) {
        return res.status(400).json({ error: 'Invalid new email format' });
      }
      const existing = await User.findOne({ email: rawNewEmail });
      if (existing && existing._id.toString() !== user._id.toString()) {
        return res.status(409).json({ error: 'Email already in use by another account' });
      }
      user.email = rawNewEmail;
    }
    if (rawPassword && rawPassword.length >= 4) {
      user.passwordHash = await bcrypt.hash(rawPassword, 10);
    }

    await user.save();
    console.log(`[API] ✅ Updated profile for user: ${user._id} (${user.email})`);
    res.json({ success: true, user: sanitizeUser(user), token: makeToken(user) });
  } catch (err) {
    console.error('Update profile error:', err.message);
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

app.put('/api/auth/profile', apiLimiter, requireAuth, handleProfileUpdate);
app.post('/api/auth/profile', apiLimiter, requireAuth, handleProfileUpdate);

// ─── 11. Transaction Routes (JWT Protected & IDOR Defended) ─────────────────

// Fetch user transactions (Strictly scoped to authenticated user)
app.get('/api/transactions', apiLimiter, requireAuth, async (req, res) => {
  try {
    const authUserId = req.user.id;
    const authEmail = req.user.email.toLowerCase().trim();

    // Query is strictly bounded to the authenticated caller's identity
    const query = {
      $or: [{ userId: authUserId }, { userEmail: authEmail }],
    };

    const docs = await ServerTransaction.find(query).sort({ time: -1 }).limit(2000).lean();
    const transactions = docs.map(d => ({
      id: d.txId,
      type: d.type,
      amount: d.amount,
      note: d.note || '',
      category: d.category,
      date: d.date,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
      time: d.time,
      synced: true,
    }));

    res.json({ transactions });
  } catch (err) {
    console.error('Get transactions error:', err.message);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// Delete transaction (Strictly scoped to authenticated user)
app.delete('/api/transactions/:txId', apiLimiter, requireAuth, async (req, res) => {
  try {
    const cleanTxId = sanitizeString(req.params.txId, 64);
    if (!cleanTxId) return res.status(400).json({ error: 'Valid txId required' });

    const authUserId = req.user.id;
    const authEmail = req.user.email.toLowerCase().trim();

    const query = {
      txId: cleanTxId,
      $or: [{ userId: authUserId }, { userEmail: authEmail }],
    };

    const result = await ServerTransaction.deleteMany(query);
    console.log(`[API] Deleted transaction ${cleanTxId} for user ${authEmail}: count=${result.deletedCount}`);
    res.json({ success: true, deletedCount: result.deletedCount });
  } catch (err) {
    console.error('Delete transaction error:', err.message);
    res.status(500).json({ error: 'Failed to delete transaction' });
  }
});

// Sync transactions (Strictly scoped & validated)
app.post('/api/sync', apiLimiter, requireAuth, async (req, res) => {
  try {
    const { transactions: incoming } = req.body;
    const authUserId = req.user.id;
    const authEmail = req.user.email.toLowerCase().trim();

    if (!Array.isArray(incoming)) {
      return res.status(400).json({ error: 'Transactions array required' });
    }

    if (incoming.length > 500) {
      return res.status(400).json({ error: 'Maximum 500 transactions allowed per sync batch' });
    }

    if (incoming.length === 0) {
      return res.json({ success: true, count: 0 });
    }

    // Build sanitized bulk operations strictly bounded to authenticated identity
    const bulkOps = [];
    for (const t of incoming) {
      if (!t || typeof t !== 'object') continue;

      const cleanId = sanitizeString(t.id, 64);
      const cleanType = t.type === 'income' ? 'income' : 'expense';
      const cleanAmount = Number(t.amount);
      const cleanNote = sanitizeString(t.note || '', 120);
      const cleanCat = sanitizeString(t.category || 'Other', 40);
      const cleanDate = sanitizeString(t.date || '', 10);
      const cleanCreated = Number(t.createdAt) || Date.now();
      const cleanUpdated = Number(t.updatedAt) || Date.now();
      const cleanTime = Number(t.time) || cleanCreated;

      if (!cleanId || !isFinite(cleanAmount) || cleanAmount <= 0) {
        continue;
      }

      bulkOps.push({
        updateOne: {
          filter: {
            txId: cleanId,
            $or: [{ userId: authUserId }, { userEmail: authEmail }],
          },
          update: {
            $set: {
              userId: authUserId,
              userEmail: authEmail,
              txId: cleanId,
              type: cleanType,
              amount: Math.round(cleanAmount * 100) / 100,
              note: cleanNote,
              category: cleanCat,
              date: cleanDate,
              createdAt: cleanCreated,
              updatedAt: cleanUpdated,
              time: cleanTime,
            },
          },
          upsert: true,
        },
      });
    }

    if (bulkOps.length === 0) {
      return res.status(400).json({ error: 'No valid transactions found in payload' });
    }

    const result = await ServerTransaction.bulkWrite(bulkOps);
    console.log(`[API] ✅ Synced ${bulkOps.length} transactions for ${authEmail}`);
    res.json({ success: true, count: bulkOps.length });
  } catch (err) {
    console.error('Sync error:', err.message);
    res.status(500).json({ error: 'Failed to synchronize transactions' });
  }
});

// ─── 12. Self-Hosted Over-The-Air (OTA) Protocol v1 Server ───────────────────
function getBase64URLEncoding(base64EncodedString) {
  return base64EncodedString.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function convertSHA256HashToUUID(value) {
  return `${value.slice(0, 8)}-${value.slice(8, 12)}-${value.slice(12, 16)}-${value.slice(16, 20)}-${value.slice(20, 32)}`;
}

function getMimeType(ext) {
  if (!ext) return 'application/octet-stream';
  const clean = ext.toLowerCase().replace(/^\./, '');
  const types = {
    hbc: 'application/javascript',
    js: 'application/javascript',
    bundle: 'application/javascript',
    json: 'application/json',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    ttf: 'font/ttf',
    otf: 'font/otf',
  };
  return types[clean] || 'application/octet-stream';
}

app.get('/api/manifest', (req, res) => {
  try {
    const platform = sanitizeString(req.headers['expo-platform'] || req.query.platform || 'android', 20);
    const runtimeVersion = sanitizeString(req.headers['expo-runtime-version'] || req.query['runtime-version'] || '1.0.0', 20);
    const currentUpdateId = req.headers['expo-current-update-id'];
    const protocolVersion = parseInt(req.headers['expo-protocol-version'] || '1', 10);

    const safeRuntime = runtimeVersion.replace(/[^a-zA-Z0-9._-]/g, '') || '1.0.0';
    const updateDir = path.join(__dirname, 'updates', safeRuntime);
    const metadataPath = path.join(updateDir, 'metadata.json');

    if (!fs.existsSync(metadataPath)) {
      if (protocolVersion === 1) {
        const form = new FormData();
        form.append('directive', JSON.stringify({ type: 'noUpdateAvailable' }), {
          contentType: 'application/json',
          header: { 'content-type': 'application/json; charset=utf-8' },
        });
        res.setHeader('expo-protocol-version', 1);
        res.setHeader('expo-sfv-version', 0);
        res.setHeader('cache-control', 'private, max-age=0');
        res.setHeader('content-type', `multipart/mixed; boundary=${form.getBoundary()}`);
        return res.status(200).send(form.getBuffer());
      }
      return res.status(204).end();
    }

    const metadataRaw = fs.readFileSync(metadataPath, 'utf8');
    const metadata = JSON.parse(metadataRaw);
    const fileStat = fs.statSync(metadataPath);

    const hashId = crypto.createHash('sha256').update(metadataRaw).digest('hex');
    const updateId = convertSHA256HashToUUID(hashId);

    // If client is already running this exact update ID:
    if (currentUpdateId === updateId) {
      if (protocolVersion === 1) {
        const form = new FormData();
        form.append('directive', JSON.stringify({ type: 'noUpdateAvailable' }), {
          contentType: 'application/json',
          header: { 'content-type': 'application/json; charset=utf-8' },
        });
        res.setHeader('expo-protocol-version', 1);
        res.setHeader('expo-sfv-version', 0);
        res.setHeader('cache-control', 'private, max-age=0');
        res.setHeader('content-type', `multipart/mixed; boundary=${form.getBoundary()}`);
        return res.status(200).send(form.getBuffer());
      }
      return res.status(204).end();
    }

    const platformMetadata = metadata.fileMetadata && metadata.fileMetadata[platform];
    if (!platformMetadata) {
      return res.status(404).json({ error: `Platform ${platform} not available` });
    }

    const bundleRelPath = platformMetadata.bundle;
    const bundleFullPath = path.join(updateDir, bundleRelPath);

    let bundleHash = '';
    let bundleKey = 'bundle';
    if (fs.existsSync(bundleFullPath)) {
      const bundleBuf = fs.readFileSync(bundleFullPath);
      bundleHash = getBase64URLEncoding(crypto.createHash('sha256').update(bundleBuf).digest('base64'));
      bundleKey = crypto.createHash('md5').update(bundleBuf).digest('hex');
    }

    const baseUrl = `https://${req.get('host') || 'fundmanager-api-aphxbabxdvd2g5a0.uaenorth-01.azurewebsites.net'}`;

    // Map assets if present
    const assets = (platformMetadata.assets || []).map((asset) => {
      const assetRelPath = asset.path;
      const assetFullPath = path.join(updateDir, assetRelPath);
      let assetHash = '';
      let assetKey = asset.ext || 'asset';
      if (fs.existsSync(assetFullPath)) {
        const buf = fs.readFileSync(assetFullPath);
        assetHash = getBase64URLEncoding(crypto.createHash('sha256').update(buf).digest('base64'));
        assetKey = crypto.createHash('md5').update(buf).digest('hex');
      }
      return {
        key: assetKey,
        hash: assetHash,
        fileExtension: asset.ext ? `.${asset.ext.replace(/^\./, '')}` : '',
        contentType: getMimeType(asset.ext),
        url: `${baseUrl}/api/assets?asset=${encodeURIComponent(assetRelPath)}&runtimeVersion=${encodeURIComponent(safeRuntime)}&platform=${encodeURIComponent(platform)}`,
      };
    });

    const manifest = {
      id: updateId,
      createdAt: fileStat.mtime.toISOString(),
      runtimeVersion: safeRuntime,
      launchAsset: {
        key: bundleKey,
        hash: bundleHash,
        fileExtension: '.bundle',
        contentType: 'application/javascript',
        url: `${baseUrl}/api/assets?asset=${encodeURIComponent(bundleRelPath)}&runtimeVersion=${encodeURIComponent(safeRuntime)}&platform=${encodeURIComponent(platform)}`,
      },
      assets: assets,
      metadata: {},
      extra: {
        expoClient: {
          name: "Suwan's FundManager",
          slug: "fundmanager-app",
        },
      },
    };

    // Protocol v1 requires multipart/mixed response with manifest and extensions
    if (protocolVersion === 1) {
      const assetRequestHeaders = {};
      [...manifest.assets, manifest.launchAsset].forEach((asset) => {
        assetRequestHeaders[asset.key] = {};
      });

      const form = new FormData();
      form.append('manifest', JSON.stringify(manifest), {
        contentType: 'application/json',
        header: {
          'content-type': 'application/json; charset=utf-8',
        },
      });
      form.append('extensions', JSON.stringify({ assetRequestHeaders }), {
        contentType: 'application/json',
      });

      res.setHeader('expo-protocol-version', 1);
      res.setHeader('expo-sfv-version', 0);
      res.setHeader('cache-control', 'private, max-age=0');
      res.setHeader('content-type', `multipart/mixed; boundary=${form.getBoundary()}`);
      return res.status(200).send(form.getBuffer());
    }

    // Fallback for Protocol v0
    res.setHeader('expo-protocol-version', 0);
    res.setHeader('cache-control', 'private, max-age=0');
    res.setHeader('content-type', 'application/expo+json; charset=utf-8');
    res.json(manifest);
  } catch (err) {
    console.error('[OTA] Error serving manifest:', err.message);
    res.status(500).json({ error: 'Internal update error' });
  }
});

// Distribute OTA bundle & assets with Path Traversal Protection
app.get('/api/assets', (req, res) => {
  try {
    const { asset, runtimeVersion } = req.query;
    if (!asset || typeof asset !== 'string') {
      return res.status(400).json({ error: 'asset query param required' });
    }

    const safeRuntime = (typeof runtimeVersion === 'string' && runtimeVersion.replace(/[^a-zA-Z0-9._-]/g, '')) || '1.0.0';
    const baseDir = path.resolve(__dirname, 'updates', safeRuntime);
    const resolvedPath = path.resolve(baseDir, path.normalize(asset));

    // Path traversal defense: ensure resolved path stays strictly within baseDir
    if (!resolvedPath.startsWith(baseDir)) {
      console.warn(`[Security] Blocked path traversal attempt: ${asset}`);
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!fs.existsSync(resolvedPath)) {
      console.warn(`[OTA] Asset not found: ${resolvedPath}`);
      return res.status(404).json({ error: 'Asset not found' });
    }

    const ext = path.extname(resolvedPath).toLowerCase();
    res.setHeader('content-type', getMimeType(ext));
    res.setHeader('access-control-allow-origin', '*');
    res.setHeader('cache-control', 'public, max-age=31536000, immutable');
    res.sendFile(resolvedPath);
  } catch (err) {
    console.error('[OTA] Error serving asset:', err.message);
    res.status(500).json({ error: 'Failed to serve asset' });
  }
});

// ─── 13. Global 404 & Error Handler ──────────────────────────────────────────
app.use((_, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

app.use((err, req, res, next) => {
  console.error('[Server Error]', err.stack || err.message);
  res.status(500).json({ error: 'An unexpected internal error occurred' });
});

// ─── 14. Start ───────────────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 FundManager API running securely at http://0.0.0.0:${PORT}`);
});
