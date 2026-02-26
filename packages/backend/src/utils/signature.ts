import { hash, num, RpcProvider } from 'starknet';
import { logger } from './logger';

// Provider for on-chain signature verification
const provider = new RpcProvider({
  nodeUrl: process.env.STARKNET_RPC_URL || 'https://rpc.starknet-testnet.lava.build',
});

/**
 * Verify a Starknet account signature by calling `is_valid_signature` on the
 * account contract at `address`.
 *
 * Protocol:
 *   1. Hash the UTF-8 message into a felt252 array using computeHashOnElements,
 *      chunking every 31 bytes (max felt252 size).
 *   2. Call `is_valid_signature(hash, [r, s])` on the account contract.
 *   3. A compliant account (Argent X, Braavos, OZ) returns felt252('VALID') = 0x56414c4944.
 *
 * Fails CLOSED on any error — a missing/undeployed account returns false, not true.
 */
export async function verifyStarknetSignature(
  address: string,
  message: string,
  signature: string[]
): Promise<boolean> {
  try {
    if (!signature || signature.length < 2) {
      logger.warn('Signature verification: insufficient signature elements');
      return false;
    }

    const r = num.toBigInt(signature[0]);
    const s = num.toBigInt(signature[1]);
    if (r === 0n || s === 0n) {
      logger.warn('Signature verification: zero r or s value');
      return false;
    }

    // Encode the UTF-8 message as an array of felt252 (31 bytes per chunk)
    const msgBytes = Buffer.from(message, 'utf8');
    const felts: string[] = [];
    for (let i = 0; i < msgBytes.length; i += 31) {
      const chunk = msgBytes.slice(i, i + 31);
      felts.push(num.toHex(BigInt('0x' + chunk.toString('hex'))));
    }
    const msgHash = hash.computeHashOnElements(felts);

    // Call is_valid_signature on the account contract
    const result = await provider.callContract({
      contractAddress: address,
      entrypoint: 'is_valid_signature',
      calldata: [
        num.toHex(BigInt(msgHash)),
        '2',
        num.toHex(r),
        num.toHex(s),
      ],
    });

    // OZ / Argent / Braavos return felt252('VALID') = 0x56414c4944
    const VALID_MAGIC = BigInt('0x56414c4944');
    const isValid = BigInt(result[0]) === VALID_MAGIC;

    if (isValid) {
      logger.info(`Signature verified for ${address}`);
    } else {
      logger.warn(`Signature verification FAILED for ${address}: got ${result[0]}`);
    }

    return isValid;
  } catch (error: any) {
    logger.error('Signature verification error:', error.message || error);
    // Fail CLOSED — a missing or undeployed account returns false, not true
    return false;
  }
}

/**
 * Returns the same message hash that verifyStarknetSignature uses,
 * so the frontend can reproduce it for signing.
 */
export function generateMessageHash(message: string): string {
  const msgBytes = Buffer.from(message, 'utf8');
  const felts: string[] = [];
  for (let i = 0; i < msgBytes.length; i += 31) {
    const chunk = msgBytes.slice(i, i + 31);
    felts.push(num.toHex(BigInt('0x' + chunk.toString('hex'))));
  }
  return hash.computeHashOnElements(felts);
}
