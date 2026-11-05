/** Tiny in-memory TTL cache so repeated dashboard loads don't burn GA4 / GSC quota. */
export class TtlCache {
  constructor(ttlMs) {
    this.ttlMs = ttlMs;
    this.store = new Map();
  }
  get(key) {
    const hit = this.store.get(key);
    if (!hit) return undefined;
    if (Date.now() > hit.expires) {
      this.store.delete(key);
      return undefined;
    }
    return hit.value;
  }
  set(key, value) {
    this.store.set(key, { value, expires: Date.now() + this.ttlMs });
    return value;
  }
  async wrap(key, fn) {
    const cached = this.get(key);
    if (cached !== undefined) return cached;
    const value = await fn();
    return this.set(key, value);
  }
  clear() {
    this.store.clear();
  }
}
