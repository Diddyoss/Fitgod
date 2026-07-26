/**
 * Garment photos live in IndexedDB, not in the persisted zustand store —
 * localStorage would blow its quota within a handful of images. IndexedDB is
 * always the render source; Supabase Storage is durability and cross-device
 * restore only.
 */

const DB_NAME = "fitgod-images";
const STORE = "blobs";
const VERSION = 1;

let dbPromise: Promise<IDBDatabase | null> | null = null;
const urlCache = new Map<string, string>();

function openDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve) => {
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
  });
  return dbPromise;
}

function tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>) {
  return openDb().then(
    (db) =>
      new Promise<T | null>((resolve) => {
        if (!db) return resolve(null);
        const request = run(db.transaction(STORE, mode).objectStore(STORE));
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => resolve(null);
      }),
  );
}

export async function putImage(id: string, blob: Blob): Promise<void> {
  await tx("readwrite", (s) => s.put(blob, id) as IDBRequest<IDBValidKey>);
  const stale = urlCache.get(id);
  if (stale) {
    URL.revokeObjectURL(stale);
    urlCache.delete(id);
  }
}

export async function getImageBlob(id: string): Promise<Blob | null> {
  const blob = await tx<Blob>("readonly", (s) => s.get(id) as IDBRequest<Blob>);
  return blob instanceof Blob ? blob : null;
}

/** Object URLs are cached per id — creating one per render leaks. */
export async function getImageUrl(id: string): Promise<string | null> {
  const cached = urlCache.get(id);
  if (cached) return cached;

  const blob = await getImageBlob(id);
  if (!blob) return null;

  const url = URL.createObjectURL(blob);
  urlCache.set(id, url);
  return url;
}

export async function deleteImage(id: string): Promise<void> {
  await tx("readwrite", (s) => s.delete(id) as IDBRequest<undefined>);
  const url = urlCache.get(id);
  if (url) {
    URL.revokeObjectURL(url);
    urlCache.delete(id);
  }
}

export async function hasImage(id: string): Promise<boolean> {
  return (await getImageBlob(id)) !== null;
}
