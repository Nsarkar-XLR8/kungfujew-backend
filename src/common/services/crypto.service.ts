import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class CryptoService {
  /**
   * Generates a cryptographically secure numeric OTP
   * @param length The length of the OTP (default: 6)
   * @returns A secure numeric string
   */
  generateSecureOtp(length: number = 6): string {
    // Determine the min and max bounds for the requested length
    const min = Math.pow(10, length - 1);
    const max = Math.pow(10, length) - 1;
    
    // Generate a random integer between min (inclusive) and max (inclusive)
    const otp = crypto.randomInt(min, max + 1);
    
    return otp.toString();
  }

  /**
   * Hash a token using SHA-256 for secure storage
   * Never store raw tokens - only hashes
   */
  hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Generates a cryptographically secure random ID (hex string)
   * Used for JTI (JWT ID) to prevent collisions
   */
  generateSecureId(): string {
    return crypto.randomBytes(32).toString('hex');
  }
}
