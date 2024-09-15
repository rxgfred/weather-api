import BetterSqlite3, { Database } from 'better-sqlite3';
import cbor from 'cbor';

export interface IStore {
  getItemFromCache(key: string): Promise<string>;

  addItemToCache(
    key: string,
    value: any,
    opts?: { ttl?: number }
  ): Promise<void>;

  removeItemFromCache(key: string): Promise<void>;
}

// cache implementation that uses TTL
export class SqliteStoreImpl implements IStore {
  private readonly interval: NodeJS.Timeout;

  constructor(
    readonly db: Database,
    // TTL: Defaults to 5 minutes
    private readonly ttl: number = 300_000
  ) {
    this.db = db;
    this.ttl = ttl;
    // clear cache every 10 minutes
    this.interval = setInterval(() => this.evictExpiredItems(db), 600_000);
  }

  async evictExpiredItems(db: Database): Promise<void> {
    try {
      db.prepare(
        `DELETE
         FROM cache
         WHERE expiresAt < @now`
      ).run({ now: Date.now() });
    } catch (e) {
      console.log(
        `An error occurred while evicting expired items from cache.`,
        e
      );
    }
  }

  async getItemFromCache(key: string): Promise<any> {
    const getItemStmt = this.db.prepare<{ key: string; now: number }, any>(
      `SELECT value
       from cache
       WHERE key = @key
         AND (expiresAt > @now OR expiresAt IS NULL)`
    );

    const res = getItemStmt.get({
      key: key,
      now: Date.now(),
    });

    if (!res) {
      return undefined;
    }

    let value: Buffer = res.value;

    return cbor.decode(value);
  }

  async addItemToCache(
    key: string,
    value: any,
    opts?: { ttl?: number }
  ): Promise<void> {
    const ttl = opts?.ttl ? opts.ttl : this.ttl;
    const expiresAt = new Date(Date.now() + ttl);
    const setItemStmt = this.db.prepare(
      `INSERT OR
       REPLACE
       INTO cache (key, value, expiresAt)
       VALUES (@key, @value, @expiresAt)`
    );

    setItemStmt.run({
      key,
      value: cbor.encode(value),
      expiresAt: expiresAt.getTime(),
    });
  }

  async removeItemFromCache(key: string): Promise<void> {
    const deleteItemStmt = this.db.prepare(
      `DELETE
       FROM cache
       WHERE key = @key`
    );
    deleteItemStmt.run({
      key,
    });
  }

  async close() {
    clearInterval(this.interval);
    this.db.close();
  }
}

let _store: IStore | undefined;
export const createStore = async (): Promise<IStore> => {
  if (!_store) {
    const db = new BetterSqlite3('test.sqlite');

    db.transaction(() => {
      const createTableStmt = `
          CREATE TABLE IF NOT EXISTS cache
          (
              key            TEXT PRIMARY KEY,
              value          BLOB,
              expiresAt      INT
          )
      `;

      db.prepare(createTableStmt).run();

      db.prepare(
        `CREATE INDEX IF NOT EXISTS expires ON cache (expiresAt)`
      ).run();
    })();

    _store = new SqliteStoreImpl(db);
  }

  return _store;
};
