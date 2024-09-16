import BetterSqlite3, { Database } from 'better-sqlite3';
import cbor from 'cbor';
import { Config } from '../config';

export interface IStore {
  getItemFromCache(key: string): Promise<string>;

  addItemToCache(
    key: string,
    value: any,
    opts?: { ttl?: number }
  ): Promise<void>;

  removeItemFromCache(key: string): Promise<void>;
}

// cache implementation that combines both TTL and LRU
// TTL and LRU cache size can be specified as opts passed to the constructor
export class SqliteStoreImpl implements IStore {
  private readonly interval: NodeJS.Timeout;

  constructor(
    readonly db: Database,
    // TTL: Defaults to 5 minutes
    private readonly ttl: number = Config.CACHE_TTL,
    // Maximum size for LRU eviction
    private readonly lruSize: number = Config.LRU_SIZE
  ) {
    this.db = db;
    this.ttl = ttl;
    // clear cache every EVICTION_FREQUENCY milliseconds.
    this.interval = setInterval(
      () => this.evictExpiredItems(db),
      Config.EVICTION_FREQUENCY
    );
  }

  async evictExpiredItems(db: Database): Promise<void> {
    try {
      db.prepare(
        `DELETE
         FROM cache
         WHERE expiresAt < @now`
      ).run({ now: Date.now() });
      if (this.lruSize > 0) {
        db.prepare(
          `WITH lru AS (SELECT key FROM cache ORDER BY lastAccessedAt DESC LIMIT -1 OFFSET @lruSize)
      DELETE FROM cache WHERE key IN lru
      `
        ).run({ lruSize: this.lruSize });
      }
    } catch (e) {
      console.log(
        `An error occurred while evicting expired items from cache.`,
        e
      );
    }
  }

  async getItemFromCache(key: string): Promise<any> {
    const getItemStmt = this.db.prepare<{ key: string; now: number }, any>(
      `UPDATE OR IGNORE cache
       SET lastAccessedAt = @now
       WHERE key = @key
         AND (expiresAt > @now OR expiresAt IS NULL)
       RETURNING value`
    );

    const res = getItemStmt.get({
      key: key,
      now: Date.now(),
    });

    if (!res) {
      return undefined;
    }

    return cbor.decode(res.value);
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
       INTO cache (key, value, expiresAt, lastAccessedAt)
       VALUES (@key, @value, @expiresAt, @lastAccessedAt)`
    );

    setItemStmt.run({
      key,
      value: cbor.encode(value),
      expiresAt: expiresAt.getTime(),
      lastAccessedAt: Date.now(),
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
    // clear timer for interval
    clearInterval(this.interval);
    this.db.close();
  }
}

let _store: IStore | undefined;
export const createStore = async (): Promise<IStore> => {
  if (!_store) {
    const db = new BetterSqlite3(Config.DATABASE_URL);

    // https://github.com/WiseLibs/better-sqlite3/blob/master/docs/performance.md
    db.pragma('journal_mode = WAL');

    db.transaction(() => {
      const createTableStmt = `
          CREATE TABLE IF NOT EXISTS cache
          (
              key            TEXT PRIMARY KEY,
              value          BLOB,
              expiresAt      INT,
              lastAccessedAt INT
          )
      `;

      db.prepare(createTableStmt).run();

      db.prepare(
        `CREATE INDEX IF NOT EXISTS expiresAt ON cache (expiresAt)`
      ).run();
      db.prepare(
        `CREATE INDEX IF NOT EXISTS lastAccessedAt ON cache (lastAccessedAt)`
      ).run();
    })();

    _store = new SqliteStoreImpl(db);
  }

  return _store;
};
