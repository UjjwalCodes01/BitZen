import { ec, hash, num, RpcProvider, typedData as starknetTypedData } from 'starknet';
import { logger } from './logger';

// Provider for on-chain signature verification
const rpcUrl = process.env.STARKNET_RPC_URL;
if (!rpcUrl) {
  throw new Error('STARKNET_RPC_URL environment variable is required');
}
const provider = new RpcProvider({
  nodeUrl: rpcUrl,
});

// ─── SNIP-12 Typed Data for BitZen Login ──────────────────────────────────────

const BITZEN_DOMAIN = {
  name: 'BitZen',
  chainId: process.env.STARKNET_NETWORK === 'mainnet' ? 'SN_MAIN' : 'SN_SEPOLIA',
  version: '1',
  revision: '1',
};

const BITZEN_LOGIN_TYPES = {
  StarknetDomain: [
    { name: 'name', type: 'shortstring' },
    { name: 'chainId', type: 'shortstring' },
    { name: 'version', type: 'shortstring' },
    { name: 'revision', type: 'shortstring' },
  ],
  BitZenLogin: [
    { name: 'address', type: 'ContractAddress' },
    { name: 'nonce', type: 'felt' },
  ],
};

/**
 * Build the SNIP-12 TypedData that both frontend and backend use for login.
 * The nonce MUST be ≤ 31 bytes (62 hex chars) to fit in a felt252.
 */
export function buildLoginTypedData(address: string, nonce: string) {
  return {
    types: BITZEN_LOGIN_TYPES,
    primaryType: 'BitZenLogin' as const,
    domain: BITZEN_DOMAIN,
    message: {
      address,
      nonce: '0x' + nonce,
    },
  };
}

/**
 * Verify a Starknet account signature over SNIP-12 typed data.
 *
 * Uses a two-pronged approach:
 * 1. Local ECDSA verification via public key recovery — works for any signer
 *    (plugins, wallets) regardless of account contract format.
 * 2. Falls back to on-chain `is_valid_signature` if local verification fails
 *    (handles Argent/Braavos extended signature formats).
 */
export async function verifyStarknetTypedDataSignature(
  address: string,
  loginTypedData: ReturnType<typeof buildLoginTypedData>,
  signature: string[]
): Promise<boolean> {
  try {
    if (!signature || signature.length < 2) {
      logger.warn('Typed data verification: insufficient signature elements');
      return false;
    }

    // Compute the SNIP-12 message hash — same hash the wallet signed
    const msgHash = starknetTypedData.getMessageHash(loginTypedData, address);
    logger.debug(`SNIP-12 message hash for ${address}: ${msgHash}`);

    // ── Step 1: Get the expected public key (stark key) from the account ──
    let expectedStarkKey: string | null = null;
    for (const entrypoint of ['get_owner', 'get_public_key', 'getPublicKey', 'getSigner']) {
      try {
        const result = await provider.callContract({
          contractAddress: address,
          entrypoint,
          calldata: [],
        });
        if (result && result[0]) {
          expectedStarkKey = result[0];
          logger.debug(`Got public key via ${entrypoint}: ${expectedStarkKey}`);
          break;
        }
      } catch {
        // Try next entrypoint
      }
    }

    // ── Step 2: Try local ECDSA verification via public key recovery ──
    if (expectedStarkKey) {
      try {
        const r = BigInt(signature[0]);
        const s = BigInt(signature[1]);
        const SigClass = ec.starkCurve.Signature;

        // Zero-pad hash to 64 hex chars (required by @noble/curves recovery)
        const hashHex = msgHash.replace('0x', '').padStart(64, '0');

        // Try both recovery bits (0 and 1) to find the matching public key
        for (const bit of [0, 1]) {
          try {
            const recSig = new SigClass(r, s).addRecoveryBit(bit);
            const recovered = recSig.recoverPublicKey(hashHex);
            const recoveredHex = recovered.toHex(false); // uncompressed: 04 + x(64) + y(64)
            const recoveredX = '0x' + recoveredHex.substring(2, 66);

            if (BigInt(recoveredX) === BigInt(expectedStarkKey)) {
              // Recovered key matches — verify the full ECDSA signature
              const isValid = ec.starkCurve.verify(recSig, hashHex, recovered.toRawBytes(false));
              if (isValid) {
                logger.info(`Typed data signature verified locally for ${address}`);
                return true;
              }
            }
          } catch {
            // Recovery with this bit failed, try the other
          }
        }
        logger.debug('Local ECDSA recovery did not match expected key, trying on-chain...');
      } catch (localErr: any) {
        logger.debug(`Local ECDSA verification error: ${localErr.message}, trying on-chain...`);
      }
    }

    // ── Step 3: Fall back to on-chain is_valid_signature ──
    // This handles wallet signatures (Argent/Braavos) that may have extended formats
    try {
      const result = await provider.callContract({
        contractAddress: address,
        entrypoint: 'is_valid_signature',
        calldata: [
          msgHash,
          signature.length.toString(),
          ...signature.map(s => num.toHex(num.toBigInt(s))),
        ],
      });

      const VALID_MAGIC = BigInt('0x56414c4944');
      const isValid = BigInt(result[0]) === VALID_MAGIC;

      if (isValid) {
        logger.info(`Typed data signature verified on-chain for ${address}`);
      } else {
        logger.warn(`Typed data signature FAILED for ${address}: got ${result[0]}`);
      }

      return isValid;
    } catch (onChainErr: any) {
      logger.error('On-chain signature verification also failed:', onChainErr.message || onChainErr);
      return false;
    }
  } catch (error: any) {
    logger.error('Typed data signature verification error:', error.message || error);
    return false;
  }
}

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
