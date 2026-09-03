import * as dotenv from 'dotenv';
dotenv.config();

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

let appOptions: any = { projectId: process.env.FIREBASE_PROJECT_ID || "genai-track3-coffee" };

// Detect and load service account credentials if available
const possibleCredentialPaths = [
  process.env.GOOGLE_APPLICATION_CREDENTIALS,
  path.resolve(process.cwd(), 'service-account.json'),
  path.resolve(process.cwd(), 'backend/service-account.json'),
  path.resolve(process.cwd(), 'service-account.json.json'),
].filter(Boolean) as string[];

for (const p of possibleCredentialPaths) {
  const resolvedPath = path.resolve(p);
  if (fs.existsSync(resolvedPath)) {
    try {
      const sa = JSON.parse(fs.readFileSync(resolvedPath, 'utf8'));
      appOptions.credential = cert(sa);
      if (sa.project_id) {
        appOptions.projectId = sa.project_id;
      }
      console.log(`[Firebase Admin] Loaded service account credentials from ${resolvedPath}`);
      break;
    } catch (e: any) {
      console.warn(`[Firebase Admin] Failed to parse service account from ${resolvedPath}:`, e.message);
    }
  }
}

const apps = getApps();
const app = apps.length === 0 ? initializeApp(appOptions) : apps[0];

const hasCredentials = Boolean(
  appOptions.credential ||
  process.env.GOOGLE_APPLICATION_CREDENTIALS ||
  process.env.FIRESTORE_EMULATOR_HOST ||
  process.env.K_SERVICE ||
  process.env.GAE_ENV
);

const FIRESTORE_DATABASE_ID = process.env.FIRESTORE_DATABASE_ID || "ai-studio-0ee1644e-e438-48cd-9473-106f79f87abb";

let rawDb: any = null;
if (hasCredentials) {
  try {
    rawDb = getAdminFirestore(app, FIRESTORE_DATABASE_ID);
    console.log(`[Firebase Admin] Initialized Firestore database: ${FIRESTORE_DATABASE_ID}`);
  } catch (e) {
    try {
      rawDb = getAdminFirestore(app);
      console.log("[Firebase Admin] Initialized default Firestore database");
    } catch (err: any) {
      console.warn("[Firebase Admin] Could not initialize remote Firestore instance, using in-memory fallback:", err.message);
    }
  }
}

// In-Memory resilient document store for sandbox environments without GCP Admin service account binding
interface MemoryDoc {
  id: string;
  data: any;
  createdAt?: string;
}

const inMemoryDatabase = new Map<string, MemoryDoc>();

class ResilientDocRef {
  private path: string;
  public id: string;

  constructor(path: string, id: string) {
    this.path = path;
    this.id = id;
  }

  async get() {
    if (rawDb) {
      try {
        const snap = await rawDb.doc(this.path).get();
        if (snap.exists) return snap;
      } catch (err: any) {
        console.warn(`[ResilientFirestore] doc.get() error on ${this.path}, falling back to memory:`, err.message);
      }
    }
    const mem = inMemoryDatabase.get(this.path);
    return {
      id: this.id,
      exists: Boolean(mem),
      data: () => mem ? mem.data : undefined
    };
  }

  async set(data: any) {
    if (rawDb) {
      try {
        await rawDb.doc(this.path).set(data);
        inMemoryDatabase.set(this.path, { id: this.id, data, createdAt: data.createdAt });
        return true;
      } catch (err: any) {
        console.warn(`[ResilientFirestore] doc.set() error on ${this.path}:`, err.message);
      }
    }
    inMemoryDatabase.set(this.path, { id: this.id, data, createdAt: data.createdAt });
    return true;
  }

  async delete() {
    if (rawDb) {
      try {
        await rawDb.doc(this.path).delete();
      } catch (err: any) {
        console.warn(`[ResilientFirestore] doc.delete() error on ${this.path}:`, err.message);
      }
    }
    inMemoryDatabase.delete(this.path);
    return true;
  }

  collection(subName: string) {
    return new ResilientCollectionRef(`${this.path}/${subName}`);
  }
}

class ResilientQuery {
  private path: string;
  private filters: Array<{ field: string; op: string; value: any }>;
  private order: { field: string; direction: 'asc' | 'desc' } | null;
  private limitCount: number | null;

  constructor(
    path: string, 
    filters: Array<{ field: string; op: string; value: any }> = [],
    order: { field: string; direction: 'asc' | 'desc' } | null = null,
    limitCount: number | null = null
  ) {
    this.path = path;
    this.filters = [...filters];
    this.order = order;
    this.limitCount = limitCount;
  }

  where(field: string, op: string, value: any) {
    return new ResilientQuery(this.path, [...this.filters, { field, op, value }], this.order, this.limitCount);
  }

  orderBy(field: string, direction: 'asc' | 'desc' = 'asc') {
    return new ResilientQuery(this.path, this.filters, { field, direction }, this.limitCount);
  }

  limit(count: number) {
    return new ResilientQuery(this.path, this.filters, this.order, count);
  }

  async get() {
    if (rawDb) {
      try {
        let q: any = rawDb.collection(this.path);
        for (const f of this.filters) {
          q = q.where(f.field, f.op, f.value);
        }
        if (this.order) {
          q = q.orderBy(this.order.field, this.order.direction);
        }
        if (this.limitCount && this.limitCount > 0) {
          q = q.limit(this.limitCount);
        }
        const snap = await q.get();
        return snap;
      } catch (err: any) {
        console.warn(`[ResilientFirestore] Query failed on ${this.path}, falling back to memory store:`, err.message);
      }
    }

    const prefix = `${this.path}/`;
    let matchedDocs: MemoryDoc[] = [];
    
    for (const [key, val] of inMemoryDatabase.entries()) {
      if (key.startsWith(prefix) && key.split('/').length === this.path.split('/').length + 1) {
        let pass = true;
        for (const f of this.filters) {
          const docVal = val.data?.[f.field];
          if (f.op === '==' && docVal !== f.value) pass = false;
          if (f.op === '>=' && (docVal === undefined || docVal < f.value)) pass = false;
          if (f.op === '<=' && (docVal === undefined || docVal > f.value)) pass = false;
          if (f.op === '>' && (docVal === undefined || docVal <= f.value)) pass = false;
          if (f.op === '<' && (docVal === undefined || docVal >= f.value)) pass = false;
        }
        if (pass) {
          matchedDocs.push(val);
        }
      }
    }

    if (this.order) {
      const { field, direction } = this.order;
      matchedDocs.sort((a, b) => {
        const aVal = a.data?.[field] || '';
        const bVal = b.data?.[field] || '';
        return direction === 'desc' ? String(bVal).localeCompare(String(aVal)) : String(aVal).localeCompare(String(bVal));
      });
    }

    if (this.limitCount && this.limitCount > 0) {
      matchedDocs = matchedDocs.slice(0, this.limitCount);
    }

    const docs = matchedDocs.map(d => ({
      id: d.id,
      data: () => d.data
    }));

    return {
      empty: docs.length === 0,
      docs,
      forEach: (cb: (doc: { id: string; data: () => any }) => void) => docs.forEach(cb)
    };
  }
}

class ResilientCollectionRef {
  private path: string;

  constructor(path: string) {
    this.path = path;
  }

  doc(id?: string) {
    const docId = id || randomUUID();
    return new ResilientDocRef(`${this.path}/${docId}`, docId);
  }

  async add(data: any) {
    if (rawDb) {
      try {
        const ref = await rawDb.collection(this.path).add(data);
        const fullPath = `${this.path}/${ref.id}`;
        inMemoryDatabase.set(fullPath, { id: ref.id, data, createdAt: data.createdAt });
        return new ResilientDocRef(fullPath, ref.id);
      } catch (err: any) {
        console.warn(`[ResilientFirestore] add() failed on ${this.path}, falling back to memory:`, err.message);
      }
    }

    const docId = `entry_${randomUUID().replace(/-/g, '').substring(0, 16)}`;
    const fullPath = `${this.path}/${docId}`;
    inMemoryDatabase.set(fullPath, { id: docId, data, createdAt: data.createdAt });
    return new ResilientDocRef(fullPath, docId);
  }

  where(field: string, op: string, value: any) {
    return new ResilientQuery(this.path, [{ field, op, value }]);
  }

  limit(maxCount: number) {
    return new ResilientQuery(this.path, [], null, maxCount);
  }

  orderBy(field: string, direction: 'asc' | 'desc' = 'asc') {
    return new ResilientQuery(this.path, [], { field, direction });
  }

  async get() {
    return new ResilientQuery(this.path).get();
  }
}

class ResilientFirestore {
  collection(colName: string) {
    return new ResilientCollectionRef(colName);
  }
  doc(docPath: string) {
    const parts = docPath.split('/');
    const id = parts[parts.length - 1];
    return new ResilientDocRef(docPath, id);
  }
}

export const db = new ResilientFirestore() as any;
export const adminAuth = getAuth(app);
