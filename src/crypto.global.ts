import { randomUUID } from 'node:crypto';

const globalWithCrypto = globalThis as typeof globalThis & {
  crypto?: { randomUUID?: () => string };
};

if (!globalWithCrypto.crypto) {
  globalWithCrypto.crypto = { randomUUID };
} else if (!globalWithCrypto.crypto.randomUUID) {
  globalWithCrypto.crypto.randomUUID = randomUUID;
}
