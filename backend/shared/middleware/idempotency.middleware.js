const db = require('../../config/database');

async function idempotencyMiddleware(req, res, next) {
  const key = req.headers['idempotency-key'];
  if (!key) {
    return res.status(400).json({
      success: false,
      error: 'Idempotency-Key header is required.'
    });
  }

  try {
    const existing = await db.query('SELECT response FROM "IdempotencyRecord" WHERE "key" = $1', [key]);
    if (existing.rows.length > 0) {
      console.log(`[Idempotency] Returning cached response for key: ${key}`);
      return res.json(existing.rows[0].response);
    }

    const originalJson = res.json;
    res.json = function (body) {
      res.json = originalJson;

      const isSuccess = res.statusCode >= 200 && res.statusCode < 300;
      if (isSuccess) {
        db.query(
          'INSERT INTO "IdempotencyRecord" ("key", "response", "createdAt") VALUES ($1, $2, NOW()) ON CONFLICT ("key") DO NOTHING',
          [key, body]
        ).catch(err => {
          console.error('[Idempotency] Failed to save response:', err.message);
        });
      }

      return originalJson.call(this, body);
    };

    next();
  } catch (err) {
    console.error('[Idempotency] Middleware error:', err.message);
    next();
  }
}

module.exports = idempotencyMiddleware;
