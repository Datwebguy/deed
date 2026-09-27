import { promises as fs } from "fs";
import path from "path";
import type { Trust, TrustRequest } from "./types";

// One JSON document per record. Local disk in development; Vercel Blob when
// BLOB_READ_WRITE_TOKEN is set (see blobStore below).

type Kind = "trusts" | "requests";

interface Backend {
  get<T>(kind: Kind, id: string): Promise<T | null>;
  put<T>(kind: Kind, id: string, value: T): Promise<void>;
  list<T>(kind: Kind): Promise<T[]>;
}

const DATA_DIR = path.join(process.cwd(), "data");

const fileStore: Backend = {
  async get(kind, id) {
    try {
      return JSON.parse(await fs.readFile(path.join(DATA_DIR, kind, `${id}.json`), "utf8"));
    } catch {
      return null;
    }
  },
  async put(kind, id, value) {
    await fs.mkdir(path.join(DATA_DIR, kind), { recursive: true });
    await fs.writeFile(path.join(DATA_DIR, kind, `${id}.json`), JSON.stringify(value, null, 2));
  },
  async list(kind) {
    try {
      const files = await fs.readdir(path.join(DATA_DIR, kind));
      const items = await Promise.all(
        files.filter((f) => f.endsWith(".json")).map((f) => fileStore.get(kind, f.slice(0, -5))),
      );
      return items.filter(Boolean) as never[];
    } catch {
      return [];
    }
  },
};

const blobStore: Backend = {
  async get(kind, id) {
    const { head } = await import("@vercel/blob");
    try {
      const meta = await head(`${kind}/${id}.json`);
      const res = await fetch(`${meta.url}?t=${Date.now()}`, { cache: "no-store" });
      return res.ok ? await res.json() : null;
    } catch {
      return null;
    }
  },
  async put(kind, id, value) {
    const { put } = await import("@vercel/blob");
    await put(`${kind}/${id}.json`, JSON.stringify(value), {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json",
      cacheControlMaxAge: 0,
    });
  },
  async list(kind) {
    const { list } = await import("@vercel/blob");
    const { blobs } = await list({ prefix: `${kind}/` });
    const items = await Promise.all(
      blobs.map((b) => fetch(`${b.url}?t=${Date.now()}`, { cache: "no-store" }).then((r) => (r.ok ? r.json() : null))),
    );
    return items.filter(Boolean);
  },
};

const db: Backend = process.env.BLOB_READ_WRITE_TOKEN ? blobStore : fileStore;

export const getTrust = (id: string) => db.get<Trust>("trusts", id);
export const saveTrust = (t: Trust) => db.put("trusts", t.id, t);
export const listTrusts = () => db.list<Trust>("trusts");

export const getRequest = (id: string) => db.get<TrustRequest>("requests", id);
export const saveRequest = (r: TrustRequest) => db.put("requests", r.id, r);
export async function listRequests(trustId: string) {
  const all = await db.list<TrustRequest>("requests");
  return all
    .filter((r) => r.trustId === trustId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export const newId = () => Math.random().toString(36).slice(2, 10);
