// MOCKED — in-memory store for Redis compatibility in AI Studio sandbox
const store = new Map();

const redis = {
  get: async (k) => store.get(k) ?? null,
  set: async (k, v, mode, duration) => {
    store.set(k, v);
    return 'OK';
  },
  del: async (k) => store.delete(k),
  incr: async (k) => {
    const n = (Number(store.get(k)) || 0) + 1;
    store.set(k, n);
    return n;
  },
  on: () => {},
};

module.exports = redis;
