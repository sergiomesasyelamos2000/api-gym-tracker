import { isIP } from 'net';
import { lookup } from 'dns/promises';

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'metadata.google.internal',
  'metadata',
]);

function isPrivateIpv4(ip: string): boolean {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some(n => Number.isNaN(n))) return false;
  const [a, b] = parts;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  return false;
}

function isPrivateIpv6(ip: string): boolean {
  const normalized = ip.toLowerCase();
  return (
    normalized === '::1' ||
    normalized.startsWith('fc') ||
    normalized.startsWith('fd') ||
    normalized.startsWith('fe80')
  );
}

export function isBlockedIp(ip: string): boolean {
  const version = isIP(ip);
  if (version === 4) return isPrivateIpv4(ip);
  if (version === 6) return isPrivateIpv6(ip);
  return true;
}

export function isAllowedHttpsImageUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') return false;
    if (parsed.username || parsed.password) return false;
    const host = parsed.hostname.toLowerCase();
    if (BLOCKED_HOSTNAMES.has(host)) return false;
    if (host.endsWith('.localhost') || host.endsWith('.local')) return false;
    if (isIP(host) && isBlockedIp(host)) return false;
    return true;
  } catch {
    return false;
  }
}

/**
 * Resolve hostname and reject private/link-local targets (SSRF guard).
 */
export async function assertSafeHttpsImageUrl(url: string): Promise<boolean> {
  if (!isAllowedHttpsImageUrl(url)) return false;

  try {
    const { hostname } = new URL(url);
    if (isIP(hostname)) {
      return !isBlockedIp(hostname);
    }
    const records = await lookup(hostname, { all: true });
    if (!records.length) return false;
    return records.every(record => !isBlockedIp(record.address));
  } catch {
    return false;
  }
}
