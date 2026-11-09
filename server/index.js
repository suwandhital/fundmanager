const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
app.use(cors());
app.use(express.json());

// ─── Config ───────────────────────────────────────────────────────────────────
// @ in password must be percent-encoded as %40 in connection string
const MONGO_URI =
  process.env.MONGO_URI ||
  'mongodb+srv://cryptxerox_db_user:Helloworld%40123@cluster0.pbap0ap.mongodb.net/fundmanager?retryWrites=true&w=majority&appName=Cluster0';
const JWT_SECRET = process.env.JWT_SECRET || 'fm_suwan_jwt_2024_secret';
const PORT = process.env.PORT || 3001;

// ─── Schema ───────────────────────────────────────────────────────────────────
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  name:  { type: String, required: true, trim: true },
  passwordHash: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const User = mongoose.model('User', userSchema);

const transactionSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  txId: { type: String, required: true },
  type: { type: String, required: true },
  amount: { type: Number, required: true },
  note: { type: String, default: '' },
  category: { type: String, required: true },
  date: { type: String, required: true },
  createdAt: { type: Number, required: true },
  updatedAt: { type: Number, required: true },
  time: { type: Number, required: true },
});

transactionSchema.index({ userId: 1, txId: 1 }, { unique: true });
const ServerTransaction = mongoose.model('Transaction', transactionSchema);

// ─── MongoDB connect ───────────────────────────────────────────────────────────
mongoose
  .connect(MONGO_URI)
  .then(() => console.log('✅ Connected to MongoDB Atlas (cluster0.pbap0ap.mongodb.net/fundmanager)'))
  .catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });

// ─── Auth helpers ──────────────────────────────────────────────────────────────
const makeToken = (user) =>
  jwt.sign({ id: user._id.toString(), email: user.email }, JWT_SECRET, { expiresIn: '60d' });

const sanitizeUser = (u) => ({
  id: u._id.toString(),
  email: u.email,
  name: u.name,
  createdAt: u.createdAt ? (u.createdAt.getTime ? u.createdAt.getTime() : new Date(u.createdAt).getTime()) : Date.now(),
});

// ─── Routes ───────────────────────────────────────────────────────────────────

// Root welcome
app.get('/', (_, res) => {
  res.json({
    name: "Suwan's FundManager API",
    status: 'online',
    version: '1.0.0',
    runtime: `Node.js ${process.version}`,
    cloud: 'Azure App Service',
    time: new Date().toISOString(),
  });
});

// Health check
app.get('/api/health', (_, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    console.log(`[API] Register request for email: ${email}`);

    if (!name || !email || !password)
      return res.status(400).json({ error: 'Name, email, and password are required' });
    if (password.length < 4)
      return res.status(400).json({ error: 'Password must be at least 4 characters' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return res.status(400).json({ error: 'Invalid email format' });

    const cleanEmail = email.toLowerCase().trim();
    let user = await User.findOne({ email: cleanEmail });
    if (user) {
      // User already exists, check password or return error
      const valid = await bcrypt.compare(password, user.passwordHash);
      if (valid) {
        console.log(`[API] User ${cleanEmail} already exists, logged in instead`);
        return res.json({ user: sanitizeUser(user), token: makeToken(user) });
      }
      return res.status(409).json({ error: 'Email already registered with another password' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    user = await User.create({ name: name.trim(), email: cleanEmail, passwordHash });
    console.log(`[API] ✅ Created user in MongoDB Atlas: ${user._id} (${user.email})`);

    res.status(201).json({ user: sanitizeUser(user), token: makeToken(user) });
  } catch (err) {
    console.error('Register error:', err.message);
    res.status(500).json({ error: 'Server error during registration: ' + err.message });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log(`[API] Login request for email: ${email}`);

    if (!email || !password)
      return res.status(400).json({ error: 'Email and password are required' });

    const cleanEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: cleanEmail });

    if (!user) {
      console.log(`[API] Login failed: User not found for ${cleanEmail}`);
      return res.status(401).json({ error: 'Account not found. Please register first.' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      console.log(`[API] Invalid password attempt for ${cleanEmail}`);
      return res.status(401).json({ error: 'Incorrect password' });
    }

    console.log(`[API] ✅ User logged in from MongoDB Atlas: ${user._id} (${user.email})`);
    res.json({ user: sanitizeUser(user), token: makeToken(user) });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ error: 'Server error during login: ' + err.message });
  }
});

// Update profile (accepts PUT or POST, authenticated via token or email)
const handleProfileUpdate = async (req, res) => {
  try {
    const { name, email, newEmail, password, userId } = req.body;
    console.log(`[API] Profile update request for user:`, { name, email, newEmail, userId });

    let user = null;
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';

    if (token) {
      try {
        const payload = jwt.verify(token, JWT_SECRET);
        user = await User.findById(payload.id);
      } catch {}
    }

    if (!user && userId) {
      user = await User.findById(userId).catch(() => null);
    }

    if (!user && email) {
      user = await User.findOne({ email: email.toLowerCase().trim() });
    }

    if (!user) {
      return res.status(404).json({ error: 'User not found in MongoDB' });
    }

    if (name && name.trim()) {
      user.name = name.trim();
    }
    if (newEmail && newEmail.trim() && newEmail.toLowerCase().trim() !== user.email) {
      const cleanNew = newEmail.toLowerCase().trim();
      const existing = await User.findOne({ email: cleanNew });
      if (existing && existing._id.toString() !== user._id.toString()) {
        return res.status(409).json({ error: 'Email already in use by another account' });
      }
      user.email = cleanNew;
    }
    if (password && password.length >= 4) {
      user.passwordHash = await bcrypt.hash(password, 10);
    }

    await user.save();
    console.log(`[API] ✅ Profile updated in MongoDB Atlas for: ${user._id} (${user.email})`);
    res.json({ success: true, user: sanitizeUser(user), token: makeToken(user) });
  } catch (err) {
    console.error('Update profile error:', err.message);
    res.status(500).json({ error: 'Server error updating profile: ' + err.message });
  }
};

app.put('/api/auth/profile', handleProfileUpdate);
app.post('/api/auth/profile', handleProfileUpdate);

// Fetch user transactions from MongoDB Atlas
app.get('/api/transactions', async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: 'userId required' });

    const docs = await ServerTransaction.find({ userId }).sort({ time: -1 }).lean();
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

    console.log(`[API] Fetched ${transactions.length} transactions from MongoDB Atlas for userId: ${userId}`);
    res.json({ transactions });
  } catch (err) {
    console.error('Get transactions error:', err.message);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// Delete transaction from MongoDB Atlas
app.delete('/api/transactions/:txId', async (req, res) => {
  try {
    const { txId } = req.params;
    const { userId } = req.query;
    if (!txId) return res.status(400).json({ error: 'txId required' });

    const query = { txId };
    if (userId) query.userId = userId;

    const result = await ServerTransaction.deleteOne(query);
    console.log(`[API] Deleted transaction ${txId} from MongoDB Atlas:`, result.deletedCount);
    res.json({ success: true, deletedCount: result.deletedCount });
  } catch (err) {
    console.error('Delete transaction error:', err.message);
    res.status(500).json({ error: 'Failed to delete transaction' });
  }
});

// Sync transactions to MongoDB Atlas
app.post('/api/sync', async (req, res) => {
  try {
    const { userId, transactions: incoming } = req.body;
    console.log(`[API] Sync request from userId: ${userId}, count: ${incoming?.length || 0}`);

    if (!userId || !Array.isArray(incoming)) {
      return res.status(400).json({ error: 'userId and transactions array required' });
    }

    if (incoming.length === 0) {
      return res.json({ success: true, count: 0 });
    }

    const bulkOps = incoming.map(t => ({
      updateOne: {
        filter: { userId, txId: t.id },
        update: {
          $set: {
            userId,
            txId: t.id,
            type: t.type,
            amount: t.amount,
            note: t.note || '',
            category: t.category,
            date: t.date,
            createdAt: t.createdAt,
            updatedAt: t.updatedAt,
            time: t.time,
          },
        },
        upsert: true,
      },
    }));

    const result = await ServerTransaction.bulkWrite(bulkOps);
    console.log(
      `[API] ✅ Synced ${bulkOps.length} transactions to MongoDB Atlas for ${userId} (upserted: ${result.upsertedCount}, modified: ${result.modifiedCount})`
    );
    res.json({ success: true, count: bulkOps.length });
  } catch (err) {
    console.error('Sync error:', err.message);
    res.status(500).json({ error: 'Failed to sync to MongoDB Atlas: ' + err.message });
  }
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

// ─── Self-Hosted Expo Updates Server (Zero Expo Token OTA) ──────────────────
function getBase64URLEncoding(base64EncodedString) {
  return base64EncodedString.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function convertSHA256HashToUUID(value) {
  return `${value.slice(0, 8)}-${value.slice(8, 12)}-${value.slice(12, 16)}-${value.slice(16, 20)}-${value.slice(20, 32)}`;
}

app.get('/api/manifest', (req, res) => {
  try {
    const platform = req.headers['expo-platform'] || req.query.platform || 'android';
    const runtimeVersion = req.headers['expo-runtime-version'] || req.query['runtime-version'] || '1.0.0';
    const currentUpdateId = req.headers['expo-current-update-id'];
    const protocolVersion = parseInt(req.headers['expo-protocol-version'] || '1', 10);

    const updateDir = path.join(__dirname, 'updates', runtimeVersion);
    const metadataPath = path.join(updateDir, 'metadata.json');

    if (!fs.existsSync(metadataPath)) {
      return res.status(204).end();
    }

    const metadataRaw = fs.readFileSync(metadataPath, 'utf8');
    const metadata = JSON.parse(metadataRaw);
    const fileStat = fs.statSync(metadataPath);

    const hashId = crypto.createHash('sha256').update(metadataRaw).digest('hex');
    const updateId = convertSHA256HashToUUID(hashId);

    // If client is already running this exact update ID, nothing to download
    if (currentUpdateId === updateId) {
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

    const manifest = {
      id: updateId,
      createdAt: fileStat.mtime.toISOString(),
      runtimeVersion: runtimeVersion,
      launchAsset: {
        key: bundleKey,
        hash: bundleHash,
        contentType: 'application/javascript',
        url: `${baseUrl}/api/assets?asset=${encodeURIComponent(bundleRelPath)}&runtimeVersion=${encodeURIComponent(runtimeVersion)}&platform=${encodeURIComponent(platform)}`,
      },
      assets: [],
      metadata: {},
      extra: {
        expoClient: {
          name: "Suwan's FundManager",
          slug: "fundmanager-app",
        },
      },
    };

    res.setHeader('expo-protocol-version', protocolVersion);
    res.setHeader('expo-sfv-version', 0);
    res.setHeader('cache-control', 'private, max-age=0');
    res.setHeader('content-type', 'application/expo+json; charset=utf-8');
    res.json(manifest);
  } catch (err) {
    console.error('[OTA] Error serving manifest:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/assets', (req, res) => {
  try {
    const { asset, runtimeVersion } = req.query;
    if (!asset || typeof asset !== 'string') {
      return res.status(400).json({ error: 'asset query param required' });
    }

    const safeRuntime = (typeof runtimeVersion === 'string' && runtimeVersion) || '1.0.0';
    const filePath = path.join(__dirname, 'updates', safeRuntime, path.normalize(asset));

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    res.setHeader('content-type', 'application/javascript');
    res.sendFile(filePath);
  } catch (err) {
    console.error('[OTA] Error serving asset:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 FundManager API running at http://0.0.0.0:${PORT}`);
});
