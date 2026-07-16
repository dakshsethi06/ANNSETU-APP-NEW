const db = require('../../../config/database');
const idempotencyMiddleware = require('../idempotency.middleware');

jest.mock('../../../config/database', () => ({
  query: jest.fn()
}));

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.statusCode = 200;
  return res;
};

describe('Idempotency Middleware Tests', () => {
  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();
    req = { headers: {} };
    res = mockRes();
    next = jest.fn();
  });

  test('returns 400 if Idempotency-Key header is missing', async () => {
    await idempotencyMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'Idempotency-Key header is required.'
    });
    expect(next).not.toHaveBeenCalled();
  });

  test('returns cached response if key exists in DB', async () => {
    req.headers['idempotency-key'] = 'uuid-key-123';
    const cachedResponse = { success: true, message: 'Cached' };
    db.query.mockResolvedValueOnce({ rows: [{ response: cachedResponse }] });

    await idempotencyMiddleware(req, res, next);

    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('SELECT response'),
      ['uuid-key-123']
    );
    expect(res.json).toHaveBeenCalledWith(cachedResponse);
    expect(next).not.toHaveBeenCalled();
  });

  test('calls next() and intercepts json call if key does not exist', async () => {
    req.headers['idempotency-key'] = 'uuid-key-123';
    db.query.mockResolvedValueOnce({ rows: [] }); // key not found

    await idempotencyMiddleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.json).not.toBe(mockRes().json); // check it was overridden

    // Trigger intercepted json method with a successful response
    const resBody = { success: true };
    db.query.mockResolvedValueOnce({}); // mock the INSERT

    res.statusCode = 200;
    res.json(resBody);

    // Wait a brief moment for async query catch/execute block
    await new Promise(resolve => setTimeout(resolve, 10));

    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO "IdempotencyRecord"'),
      ['uuid-key-123', resBody]
    );
  });

  test('does not insert into DB if response status is error (e.g. 500)', async () => {
    req.headers['idempotency-key'] = 'uuid-key-123';
    db.query.mockResolvedValueOnce({ rows: [] });

    await idempotencyMiddleware(req, res, next);
    expect(next).toHaveBeenCalled();

    res.statusCode = 500;
    res.json({ success: false });

    expect(db.query).not.toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO "IdempotencyRecord"'),
      expect.any(Array)
    );
  });

  test('logs error and does not crash if INSERT query fails', async () => {
    req.headers['idempotency-key'] = 'uuid-key-123';
    db.query.mockResolvedValueOnce({ rows: [] });

    await idempotencyMiddleware(req, res, next);
    expect(next).toHaveBeenCalled();

    db.query.mockRejectedValueOnce(new Error('INSERT failed'));
    const spyWarn = jest.spyOn(console, 'error').mockImplementation(() => {});

    res.statusCode = 200;
    res.json({ success: true });

    await new Promise(resolve => setTimeout(resolve, 10));

    expect(spyWarn).toHaveBeenCalledWith(
      expect.stringContaining('[Idempotency] Failed to save response'),
      expect.any(String)
    );
    spyWarn.mockRestore();
  });

  test('calls next if database query throws error', async () => {
    req.headers['idempotency-key'] = 'uuid-key-123';
    db.query.mockRejectedValueOnce(new Error('DB connection failed'));

    await idempotencyMiddleware(req, res, next);

    expect(next).toHaveBeenCalled();
  });
});
