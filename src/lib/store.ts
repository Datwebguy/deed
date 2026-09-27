import { promises as fs } from "fs";
import path from "path";
import type { Trust, TrustRequest } from "./types";

// One JSON document per record, addressed by path. Local disk in development;
// Vercel Blob when BLOB_READ_WRITE_TOKEN is set. Requests live under their
// trust's folder so a trust page only reads its own.

interface Backend {
  get<T>(key: string): Promise<T | null>;
  put<T>(key: string, value: T): Promise<void>;
  // Documents directly inside a folder (not in its subfolders).
  list<T>(folder: string): Promise<T[]>;
}

const DATA_DIR = path.join(process.cwd(), "data");

const fileStore: Backend = {
  async get(key) {
    try {
      return JSON.parse(await fs.readFile(path.join(DATA_DIR, `${key}.json`), "utf8"));
    } catch {
      return null;
    }
  },
  async put(key, value) {
    const file = path.join(DATA_DIR, `${key}.json`);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, JSON.stringify(value, null, 2));
  },
  async list(folder) {
    try {
      const files = await fs.readdir(path.join(DATA_DIR, folder));
      const items = await Promise.all(
        files.filter((f) => f.endsWith(".json")).map((f) => fileStore.get(`${folder}/${f.slice(0, -5)}`)),
      );
      return items.filter(Boolean) as never[];
    } catch {
      return [];
    }
  },
};

// Trust records hold family details, so the store is private.
async function readBlob(pathname: string) {
  const { get } = await import("@vercel/blob");
  const res = await get(pathname, { access: "private", useCache: false });
  if (!res || res.statusCode !== 200) return null;
  return JSON.parse(await new Response(res.stream).text());
}

const blobStore: Backend = {
  async get(key) {
    try {
      return await readBlob(`${key}.json`);
    } catch {
      return null;
    }
  },
  async put(key, value) {
    const { put } = await import("@vercel/blob");
    await put(`${key}.json`, JSON.stringify(value), {
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json",
    });
  },
  async list(folder) {
    const { list } = await import("@vercel/blob");
    const found: string[] = [];
    let cursor: string | undefined;
    do {
      const page = await list({ prefix: `${folder}/`, mode: "folded", cursor });
      found.push(...page.blobs.map((b) => b.pathname));
      cursor = page.hasMore ? page.cursor : undefined;
    } while (cursor);
    const items = await Promise.all(found.map((p) => readBlob(p).catch(() => null)));
    return items.filter(Boolean);
  },
};

const db: Backend = process.env.BLOB_READ_WRITE_TOKEN ? blobStore : fileStore;

export const getTrust = (id: string) => db.get<Trust>(`trusts/${id}`);
export const saveTrust = (t: Trust) => db.put(`trusts/${t.id}`, t);

export const saveRequest = (r: TrustRequest) => db.put(`requests/${r.trustId}/${r.id}`, r);

// Requests saved before per-trust folders sit loose in requests/; they are
// only read for trusts made before the change.
const FOLDERS_SINCE = "2026-09-28";

export async function listRequests(t: Pick<Trust, "id" | "createdAt">) {
  const [own, loose] = await Promise.all([
    db.list<TrustRequest>(`requests/${t.id}`),
    t.createdAt < FOLDERS_SINCE ? db.list<TrustRequest>("requests") : Promise.resolve([]),
  ]);
  return [...own, ...loose.filter((r) => r.trustId === t.id)].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export const newId = () => Math.random().toString(36).slice(2, 10);
