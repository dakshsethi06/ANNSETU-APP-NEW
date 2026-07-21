const { hashMpin, verifyMpin } = require('../mpinUtils');

describe('mpinUtils', () => {
  describe('hashMpin', () => {
    test('returns a 64-char hex hash for a valid mpin', () => {
      const hash = hashMpin('1234');
      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    test('same input always produces same hash', () => {
      expect(hashMpin('1234')).toBe(hashMpin('1234'));
    });

    test('different inputs produce different hashes', () => {
      expect(hashMpin('1234')).not.toBe(hashMpin('4321'));
    });

    test('handles numeric input', () => {
      expect(hashMpin(1234)).toBe(hashMpin('1234'));
    });

    test('returns empty string for empty/null input', () => {
      expect(hashMpin('')).toBe('');
      expect(hashMpin(null)).toBe('');
      expect(hashMpin(undefined)).toBe('');
    });
  });

  describe('verifyMpin', () => {
    test('verifies correct mpin against its hash', () => {
      const hash = hashMpin('1234');
      expect(verifyMpin('1234', hash)).toBe(true);
    });

    test('rejects wrong mpin against a hash', () => {
      const hash = hashMpin('1234');
      expect(verifyMpin('9999', hash)).toBe(false);
    });

    test('verifies legacy plain-text stored mpin (non-64-char)', () => {
      expect(verifyMpin('1234', '1234')).toBe(true);
    });

    test('rejects wrong mpin against legacy plain-text', () => {
      expect(verifyMpin('9999', '1234')).toBe(false);
    });

    test('handles numeric mpin against legacy string', () => {
      expect(verifyMpin(1234, '1234')).toBe(true);
    });

    test('returns false when storedHash is missing', () => {
      expect(verifyMpin('1234', null)).toBe(false);
      expect(verifyMpin('1234', '')).toBe(false);
    });

    test('returns false when mpin is missing', () => {
      const hash = hashMpin('1234');
      expect(verifyMpin(null, hash)).toBe(false);
      expect(verifyMpin('', hash)).toBe(false);
    });
  });
});
