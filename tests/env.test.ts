import { describe, it, expect } from 'vitest';
import { validateEnv, parseCorsOrigins } from '../src/config/env.js';

describe('Environment Configuration', () => {
  describe('validateEnv', () => {
    it('should validate valid environment with defaults', () => {
      const valid = validateEnv({
        NODE_ENV: 'test',
        PORT: '4000',
      });

      expect(valid.NODE_ENV).toBe('test');
      expect(valid.PORT).toBe(4000);
      expect(valid.HOST).toBe('0.0.0.0');
      expect(valid.LOG_LEVEL).toBe('info');
      expect(valid.BODY_LIMIT).toBe(1048576);
    });

    it('should throw an error on invalid NODE_ENV', () => {
      expect(() =>
        validateEnv({
          NODE_ENV: 'nonexistent-env',
        }),
      ).toThrowError(/Environment validation failed/);
    });

    it('should throw an error on non-numeric or invalid PORT', () => {
      expect(() =>
        validateEnv({
          PORT: 'not-a-port',
        }),
      ).toThrowError(/Environment validation failed/);

      expect(() =>
        validateEnv({
          PORT: '999999',
        }),
      ).toThrowError(/Environment validation failed/);
    });

    it('should throw an error on invalid LOG_LEVEL', () => {
      expect(() =>
        validateEnv({
          LOG_LEVEL: 'verbose',
        }),
      ).toThrowError(/Environment validation failed/);
    });
  });

  describe('parseCorsOrigins', () => {
    it('should return true for wildcard *', () => {
      expect(parseCorsOrigins('*')).toBe(true);
      expect(parseCorsOrigins('')).toBe(true);
    });

    it('should return a single origin string when one origin is passed', () => {
      expect(parseCorsOrigins('http://localhost:3000')).toBe('http://localhost:3000');
    });

    it('should return an array of origins for comma-separated string', () => {
      const result = parseCorsOrigins('http://localhost:3000, http://localhost:5173');
      expect(result).toEqual(['http://localhost:3000', 'http://localhost:5173']);
    });
  });
});

