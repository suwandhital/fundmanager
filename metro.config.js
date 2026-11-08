const { getDefaultConfig } = require('expo/metro-config');
const http = require('http');

const config = getDefaultConfig(__dirname);

const originalEnhance = config.server.enhanceMiddleware;
config.server.enhanceMiddleware = (metroMiddleware, server) => {
  const enhanced = originalEnhance
    ? originalEnhance(metroMiddleware, server)
    : metroMiddleware;

  return (req, res, next) => {
    // Intercept any backend API calls and proxy to Express on port 3001
    if (req.url && req.url.startsWith('/api/')) {
      const proxyReq = http.request(
        {
          hostname: '127.0.0.1',
          port: 3001,
          path: req.url,
          method: req.method,
          headers: {
            ...req.headers,
            host: '127.0.0.1:3001',
          },
        },
        (proxyRes) => {
          res.writeHead(proxyRes.statusCode, proxyRes.headers);
          proxyRes.pipe(res);
        }
      );

      proxyReq.on('error', (err) => {
        console.error('Metro API proxy error:', err.message);
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Backend API unreachable' }));
      });

      req.pipe(proxyReq);
      return;
    }

    return enhanced(req, res, next);
  };
};

module.exports = config;

