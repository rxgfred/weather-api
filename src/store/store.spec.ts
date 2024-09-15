import { Database } from 'better-sqlite3';
import cbor from 'cbor';
import { SqliteStoreImpl } from './index';

describe('SqliteStoreImpl', () => {
  const db = <any>{
    // mock calling of close() on sqlite instance
    close: jest.fn(),
  };

  describe('addItemToCache', () => {
    it('should add an item to the cache with default TTL', async () => {
      const store = new SqliteStoreImpl(db as Database);
      const key = 'some_key';
      const value = { some: 'value' };

      const mockRun = jest.fn().mockReturnValue({});
      db.prepare = jest.fn().mockReturnValue({ run: mockRun });

      try {
        await store.addItemToCache(key, value);
      } finally {
        await store.close();
      }

      expect(mockRun).toHaveBeenCalledWith({
        key,
        value: cbor.encode(value),
        expiresAt: expect.any(Number),
      });
    });

    it('should add an item with custom TTL', async () => {
      const store = new SqliteStoreImpl(db as Database);
      const key = 'some_key';
      const value = { some: 'value' };
      const opts = { ttl: 60000 };

      const mockRun = jest.fn().mockReturnValue({});
      db.prepare = jest.fn().mockReturnValue({ run: mockRun });

      try {
        await store.addItemToCache(key, value, opts);
      } finally {
        await store.close();
      }

      expect(mockRun).toHaveBeenCalledWith({
        key,
        value: cbor.encode(value),
        expiresAt: expect.any(Number),
      });
    });
  });

  describe('getItemFromCache', () => {
    it('should return the cached item if it exists and has not expired', async () => {
      const store = new SqliteStoreImpl(db as Database);
      const key = 'some_key';
      const cachedValue = cbor.encode({ some: 'value' });
      const mockGet = jest.fn().mockReturnValue({ value: cachedValue });

      db.prepare = jest.fn().mockReturnValue({ get: mockGet });

      try {
        const result = await store.getItemFromCache(key);

        expect(mockGet).toHaveBeenCalledWith({
          key,
          now: expect.any(Number),
        });
        expect(result).toEqual({ some: 'value' });
      } finally {
        await store.close();
      }
    });

    it('should return undefined if the item is not found or has expired', async () => {
      const store = new SqliteStoreImpl(db as Database);
      const key = 'some_key';
      const mockGet = jest.fn().mockReturnValue(undefined);

      db.prepare = jest.fn().mockReturnValue({ get: mockGet });

      try {
        const result = await store.getItemFromCache(key);
        expect(result).toBeUndefined();
      } finally {
        await store.close();
      }
    });
  });

  describe('removeItemFromCache', () => {
    it('should remove the specified item from the cache', async () => {
      const store = new SqliteStoreImpl(db as Database);
      const key = 'some_key';

      const mockRun = jest.fn().mockReturnValue({});
      db.prepare = jest.fn().mockReturnValue({ run: mockRun });

      try {
        await store.removeItemFromCache(key);
      } finally {
        await store.close();
      }

      expect(mockRun).toHaveBeenCalledWith({
        key,
      });
    });
  });

  describe('evictExpiredItems', () => {
    it('should delete expired items from the cache', async () => {
      const store = new SqliteStoreImpl(db as Database);
      const mockRun = jest.fn().mockReturnValue({});
      db.prepare = jest.fn().mockReturnValue({ run: mockRun });

      try {
        await store.evictExpiredItems(db);
      } finally {
        await store.close();
      }

      expect(mockRun).toHaveBeenCalledWith({
        now: expect.any(Number),
      });
    });

    it('should handle errors during eviction', async () => {
      const store = new SqliteStoreImpl(db as Database);
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const mockRun = jest.fn().mockImplementation(() => {
        throw new Error('Eviction error');
      });
      db.prepare = jest.fn().mockReturnValue({ run: mockRun });

      try {
        await store.evictExpiredItems(db);
      } finally {
        await store.close();
      }

      expect(consoleSpy).toHaveBeenCalledWith(
        'An error occurred while evicting expired items from cache.',
        expect.any(Error)
      );
      consoleSpy.mockRestore();
    });
  });
});
