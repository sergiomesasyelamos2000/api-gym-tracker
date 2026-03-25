import { randomUUID } from 'node:crypto';

const globalWithCrypto = globalThis as typeof globalThis & {
  crypto?: {
    randomUUID?: () => string;
    getRandomValues?: (array: Uint8Array) => Uint8Array;
  };
};

if (!globalWithCrypto.crypto) {
  (globalWithCrypto as unknown as { crypto: Record<string, unknown> }).crypto = {
    randomUUID,
    getRandomValues: (array: Uint8Array) => {
      for (let i = 0; i < array.length; i += 1) {
        array[i] = Math.floor(Math.random() * 256);
      }
      return array;
    },
  };
} else if (!globalWithCrypto.crypto.randomUUID) {
  globalWithCrypto.crypto.randomUUID = randomUUID;
}
