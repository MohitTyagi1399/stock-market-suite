import { Injectable } from '@nestjs/common';
import crypto from 'node:crypto';

type Envelope = {
  nonce: string;
  ciphertext: string;
  tag: string;
};

const mustGetEnv = (key: string) => {
  const v = process.env[key];
  if (!v) throw new Error(`Missing env var: ${key}`);
  return v;
};

@Injectable()
export class CryptoService {
  private getKey(): Buffer {
    const raw = mustGetEnv('APP_ENCRYPTION_KEY');
    const key = Buffer.from(raw, 'base64');
    if (key.length !== 32) throw new Error('APP_ENCRYPTION_KEY must be base64-encoded 32 bytes');
    return key;
  }

  encryptJson(value: unknown): string {
    const key = this.getKey();
    const nonce = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, nonce);
    const plaintext = Buffer.from(JSON.stringify(value), 'utf8');
    const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const tag = cipher.getAuthTag();
    const env: Envelope = {
      nonce: nonce.toString('base64'),
      ciphertext: ciphertext.toString('base64'),
      tag: tag.toString('base64'),
    };
    return Buffer.from(JSON.stringify(env), 'utf8').toString('base64');
  }

  decryptJson<T>(encoded: string): T {
    const key = this.getKey();
    const env = JSON.parse(Buffer.from(encoded, 'base64').toString('utf8')) as Envelope;
    const nonce = Buffer.from(env.nonce, 'base64');
    const ciphertext = Buffer.from(env.ciphertext, 'base64');
    const tag = Buffer.from(env.tag, 'base64');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, nonce);
    decipher.setAuthTag(tag);
    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return JSON.parse(plaintext.toString('utf8')) as T;
  }
}

