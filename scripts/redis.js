// MOCKED — in-memory store for Redis compatibility in AI Studio sandbox
const store = new Map();
const timeouts = new Map();

const redis = {
  get: async (k) => store.get(k) ?? null,
  set: async (k, v, mode, duration) => {
    store.set(k, String(v));
    
    if (timeouts.has(k)) {
      clearTimeout(timeouts.get(k));
      timeouts.delete(k);
    }
    
    if (mode === 'EX' && typeof duration === 'number') {
      const t = setTimeout(() => {
        store.delete(k);
        timeouts.delete(k);
      }, duration * 1000);
      // Unref to not block node process exit if needed, though in express it's fine
      if (t.unref) t.unref();
      timeouts.set(k, t);
    }
    return 'OK';
  },
  del: async (k) => {
    store.delete(k);
    if (timeouts.has(k)) {
      clearTimeout(timeouts.get(k));
      timeouts.delete(k);
    }
    return 1;
  },
  incr: async (k) => {
    const n = (Number(store.get(k)) || 0) + 1;
    store.set(k, String(n));
    return n;
  },
  on: () => {},
};

module.exports = redis;
