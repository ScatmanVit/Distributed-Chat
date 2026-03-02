import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_for_integration_tests_only_do_not_use_in_production';

export function generateTestToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '1h' });
}

export function generateExpiredToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '-1h' });
}

export function generateInvalidToken(): string {
  return 'invalid.token.here';
}
