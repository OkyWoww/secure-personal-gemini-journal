import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';

// We need a 32-byte key for AES-256
export function encrypt(text: string, keyString: string): string {
  // Hash the key to ensure it's exactly 32 bytes
  const key = crypto.createHash('sha256').update(keyString).digest();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  
  const authTag = cipher.getAuthTag().toString('base64');
  
  // Format: iv:authTag:encryptedData
  return `${iv.toString('base64')}:${authTag}:${encrypted}`;
}

export function decrypt(ciphertext: string, keyString: string): string {
  const key = crypto.createHash('sha256').update(keyString).digest();
  
  const parts = ciphertext.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid ciphertext format');
  }
  
  const iv = Buffer.from(parts[0], 'base64');
  const authTag = Buffer.from(parts[1], 'base64');
  const encrypted = parts[2];
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, 'base64', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}
