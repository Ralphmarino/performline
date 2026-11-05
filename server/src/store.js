/**
 * Persistent report store so the dashboard serves yesterday's refresh instantly and only hits
 * GA4 / Search Console once a day (or when a never-seen range is requested).
 *
 *  - On Netlify: Netlify Blobs (shared by the API function and the scheduled refresh function).
 *  - Elsewhere: JSON files under server/.cache (git-ignored).
 *  - Falls back to a no-op store if neither is available, which just means every request is live.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const safeKey = (key) => key.replace(/[^\w.-]/g, '_');

export class FileStore {
  constructor(dir) {
    this.dir = dir;
  }
  async get(key) {
    try {
      return JSON.parse(await fs.readFile(path.join(this.dir, `${safeKey(key)}.json`), 'utf8'));
    } catch {
      return null;
    }
  }
  async set(key, value) {
    await fs.mkdir(this.dir, { recursive: true });
    await fs.writeFile(path.join(this.dir, `${safeKey(key)}.json`), JSON.stringify(value));
  }
}

export class BlobStore {
  constructor(store) {
    this.store = store;
  }
  async get(key) {
    try {
      return (await this.store.get(safeKey(key), { type: 'json' })) ?? null;
    } catch (err) {
      console.warn('blob get failed', err.message);
      return null;
    }
  }
  async set(key, value) {
    try {
      await this.store.setJSON(safeKey(key), value);
    } catch (err) {
      console.warn('blob set failed', err.message);
    }
  }
}

export const NullStore = { get: async () => null, set: async () => {} };

/** Pick the store for this runtime. `blobs` is the already-imported @netlify/blobs module when on Netlify. */
export function createStore({ blobs = null } = {}) {
  if (blobs) {
    try {
      return new BlobStore(blobs.getStore({ name: 'reports', consistency: 'strong' }));
    } catch (err) {
      console.warn('Netlify Blobs unavailable, serving live data without a persistent store:', err.message);
      return NullStore;
    }
  }
  if (process.env.NETLIFY === 'true') return NullStore;
  // import.meta.url is undefined inside Netlify's CommonJS function bundle; fall back to the working directory.
  const here = import.meta.url ? path.dirname(fileURLToPath(import.meta.url)) : process.cwd();
  const dir = process.env.REPORT_CACHE_DIR || path.resolve(here, import.meta.url ? '../.cache' : '.cache');
  return new FileStore(dir);
}
