import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'dtf_auto_super_secret_jwt_key_2026';

/**
 * Strict Brazilian CPF validation algorithm (checks length, identical digits and mod 11 check digits)
 */
export function validateCPF(cpfRaw: string): boolean {
  if (!cpfRaw) return false;
  const cpf = cpfRaw.replace(/\D/g, '');

  if (cpf.length !== 11) return false;
  // Reject repetitive numbers (00000000000, 11111111111, etc.)
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  let sum = 0;
  let remainder: number;

  for (let i = 1; i <= 9; i++) {
    sum += parseInt(cpf.substring(i - 1, i), 10) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cpf.substring(9, 10), 10)) return false;

  sum = 0;
  for (let i = 1; i <= 10; i++) {
    sum += parseInt(cpf.substring(i - 1, i), 10) * (12 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cpf.substring(10, 11), 10)) return false;

  return true;
}

/**
 * Normalize CPF: remove non-digits
 */
export function normalizeCPF(cpf: string): string {
  return (cpf || '').replace(/\D/g, '');
}

/**
 * Mask CPF for display: ***.456.789-**
 */
export function maskCPF(cpfRaw: string): string {
  const cpf = normalizeCPF(cpfRaw);
  if (cpf.length !== 11) return '***.***.***-**';
  return `***.${cpf.substring(3, 6)}.${cpf.substring(6, 9)}-**`;
}

/**
 * Hash password with bcrypt salt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

/**
 * Verify password against hash with legacy plaintext fallback
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (!hash || !password) return false;
  if (hash.startsWith('$2a$') || hash.startsWith('$2b$')) {
    return bcrypt.compare(password, hash);
  }
  // Legacy migration comparison
  return password === hash;
}

/**
 * Create signed JWT token for session
 */
export function signSessionToken(payload: { id: string; email: string; name: string; role?: string }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' });
}

/**
 * Verify session token
 */
export function verifySessionToken(token: string): { id: string; email: string; name: string; role?: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as any;
  } catch (err) {
    return null;
  }
}
