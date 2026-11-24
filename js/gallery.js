// Ada'nın resimleri: iPad'in içinde (IndexedDB) saklanır, internet gerekmez.

const DB_NAME = 'ada-cizim';
const STORE = 'drawings';
let dbp = null;

function open() {
  if (dbp) return dbp;
  dbp = new Promise((resolve, reject) => {
    const rq = indexedDB.open(DB_NAME, 1);
    rq.onupgradeneeded = () => {
      const db = rq.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' });
    };
    rq.onsuccess = () => resolve(rq.result);
    rq.onerror = () => { dbp = null; reject(rq.error); };
  });
  return dbp;
}

async function run(mode, fn) {
  const db = await open();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const req = fn(t.objectStore(STORE));
    t.oncomplete = () => resolve(req ? req.result : undefined);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  });
}

export const put = (rec) => run('readwrite', (st) => st.put(rec));
export const get = (id) => run('readonly', (st) => st.get(id));
export const remove = (id) => run('readwrite', (st) => st.delete(id));
export const all = async () => ((await run('readonly', (st) => st.getAll())) || []).sort((a, b) => b.updatedAt - a.updatedAt);

/** Tarayıcıdan, resimleri kendiliğinden silmemesini iste. */
export async function persist() {
  try { if (navigator.storage && navigator.storage.persist) await navigator.storage.persist(); } catch { /* yok say */ }
}
