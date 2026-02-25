// Type declaration for circomlibjs (no official @types package)
declare module 'circomlibjs' {
  export function buildPoseidon(): Promise<{
    (inputs: (bigint | string | number)[]): Uint8Array;
    F: {
      toString(val: Uint8Array, base?: number): string;
      toObject(val: Uint8Array): bigint;
    };
  }>;
  export function buildBabyjub(): Promise<any>;
  export function buildMimc7(): Promise<any>;
  export function buildMimcSponge(): Promise<any>;
  export function buildEddsa(): Promise<any>;
  export function buildPedersenHash(): Promise<any>;
}
