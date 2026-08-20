import type { CreativeProject, StoredAsset } from "@/lib/types";

const DB_NAME = "csc-creative-studio";
const DB_VERSION = 1;
const PROJECTS = "projects";
const ASSETS = "assets";

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(PROJECTS)) {
        database.createObjectStore(PROJECTS, { keyPath: "id" });
      }
      if (!database.objectStoreNames.contains(ASSETS)) {
        const assets = database.createObjectStore(ASSETS, { keyPath: "id" });
        assets.createIndex("projectId", "projectId", { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function storeRequest<T>(
  storeName: string,
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>,
) {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(storeName, mode);
    const completion = new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
    const result = await requestResult(operation(transaction.objectStore(storeName)));
    await completion;
    return result;
  } finally {
    database.close();
  }
}

export async function listProjects() {
  const projects = await storeRequest<CreativeProject[]>(
    PROJECTS,
    "readonly",
    (store) => store.getAll(),
  );
  return projects.sort(
    (a, b) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime(),
  );
}

export function saveProject(project: CreativeProject) {
  return storeRequest<IDBValidKey>(PROJECTS, "readwrite", (store) =>
    store.put(project),
  );
}

export function removeProject(id: string) {
  return storeRequest<undefined>(PROJECTS, "readwrite", (store) =>
    store.delete(id),
  );
}

export function saveAsset(asset: StoredAsset) {
  return storeRequest<IDBValidKey>(ASSETS, "readwrite", (store) =>
    store.put(asset),
  );
}

export function getAsset(id: string) {
  return storeRequest<StoredAsset | undefined>(ASSETS, "readonly", (store) =>
    store.get(id),
  );
}

export async function removeAssetsForProject(projectId: string) {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(ASSETS, "readwrite");
    const index = transaction.objectStore(ASSETS).index("projectId");
    const cursorRequest = index.openCursor(IDBKeyRange.only(projectId));
    await new Promise<void>((resolve, reject) => {
      cursorRequest.onsuccess = () => {
        const cursor = cursorRequest.result;
        if (!cursor) return;
        cursor.delete();
        cursor.continue();
      };
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  } finally {
    database.close();
  }
}
