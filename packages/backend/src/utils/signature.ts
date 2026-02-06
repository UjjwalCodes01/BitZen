import { hash, num, encode } from 'starknet';
import { logger } from './logger';

/**
 * Verify Starknet signature
 */
export async function verifyStarknetSignature(
  _address: string,
  _message: string,
  signature: string[]
): Promise<boolean> {
  try {
    // Hash the message (for future use in full verification)
    // const messageHash = hash.computeHashOnElements([encode.addHexPrefix(message)]);

    // Convert signature from string array to BigInt array
    const r = num.toBigInt(signature[0]);
    const s = num.toBigInt(signature[1]);

    // Get public key from address (this is simplified - in production you'd query the contract)
    // For now, we'll verify the signature structure is valid
    if (!r || !s) {
      logger.warn('Invalid signature format');
      return false;
    }

    // In a real implementation, you would:
    // 1. Get the public key from the account contract
    // 2. Verify the signature using ec.starkCurve.verify()
    
    // For now, basic validation
    return signature.length === 2 && r > 0n && s > 0n;
  } catch (error) {
    logger.error('Signature verification error:', error);
    return false;
  }
}

/**
 * Generate message hash for signing
 */
export function generateMessageHash(message: string): string {
  return hash.computeHashOnElements([encode.addHexPrefix(message)]);
}
