export interface IStore {
  getItemFromCache(key: string): Promise<string>;

  addItemToCache(
    key: string,
    value: any,
    opts?: { ttl?: number }
  ): Promise<void>;

  removeItemFromCache(key: string): Promise<void>;
}
