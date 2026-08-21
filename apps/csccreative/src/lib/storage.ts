import type {
  AppSettings,
  BrandProfile,
  CreativeProject,
  CreativeStyleProfile,
  ReferenceAsset,
  StoredAsset,
} from "@/lib/types";

const DB_NAME = "csc-creative-studio";
const DB_VERSION = 2;
const PROJECTS = "projects";
const ASSETS = "assets";
const BRANDS = "brands";
const REFERENCES = "references";
const STYLE_PROFILES = "styleProfiles";
const SETTINGS = "settings";

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
      if (!database.objectStoreNames.contains(BRANDS)) {
        database.createObjectStore(BRANDS, { keyPath: "id" });
      }
      if (!database.objectStoreNames.contains(REFERENCES)) {
        database.createObjectStore(REFERENCES, { keyPath: "id" });
      }
      if (!database.objectStoreNames.contains(STYLE_PROFILES)) {
        database.createObjectStore(STYLE_PROFILES, { keyPath: "id" });
      }
      if (!database.objectStoreNames.contains(SETTINGS)) {
        database.createObjectStore(SETTINGS, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function listRecords<T>(storeName: string) {
  return storeRequest<T[]>(storeName, "readonly", (store) => store.getAll());
}

function saveRecord<T>(storeName: string, record: T) {
  return storeRequest<IDBValidKey>(storeName, "readwrite", (store) => store.put(record));
}

function removeRecord(storeName: string, id: string) {
  return storeRequest<undefined>(storeName, "readwrite", (store) => store.delete(id));
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

export function removeAsset(id: string) {
  return removeRecord(ASSETS, id);
}

export function listBrands() {
  return listRecords<BrandProfile>(BRANDS);
}

export function saveBrand(brand: BrandProfile) {
  return saveRecord(BRANDS, brand);
}

export function listReferences() {
  return listRecords<ReferenceAsset>(REFERENCES);
}

export function saveReference(reference: ReferenceAsset) {
  return saveRecord(REFERENCES, reference);
}

export function removeReference(id: string) {
  return removeRecord(REFERENCES, id);
}

export function listStyleProfiles() {
  return listRecords<CreativeStyleProfile>(STYLE_PROFILES);
}

export function saveStyleProfile(profile: CreativeStyleProfile) {
  return saveRecord(STYLE_PROFILES, profile);
}

export async function getSettings() {
  return storeRequest<AppSettings | undefined>(SETTINGS, "readonly", (store) => store.get("app"));
}

export function saveSettings(settings: AppSettings) {
  return saveRecord(SETTINGS, settings);
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
