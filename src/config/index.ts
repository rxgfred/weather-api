import 'dotenv/config';

const {
  DATABASE_URL,
  NODE_ENV,
  PORT,
  CACHE_TTL,
  LRU_SIZE,
  EVICTION_FREQUENCY,
  BASE_API_URL,
} = process.env;

if (!BASE_API_URL) {
  console.error(
    'BASE_API_URL not found in environment variables. Please add it to your .env and restart server'
  );
  process.exit(1);
}

export const Config = {
  DATABASE_URL: DATABASE_URL ?? ':memory:',
  NODE_ENV: NODE_ENV ?? 'development',
  PORT: parseInt(PORT ?? '3000', 10),
  // TTL: Defaults to 5 minutes
  CACHE_TTL: parseInt(CACHE_TTL ?? '300000'),
  // clear cache every EVICTION_FREQUENCY milliseconds.
  EVICTION_FREQUENCY: parseInt(EVICTION_FREQUENCY ?? '600000'),
  //Maximum LRU Size: Defaults to 10,000
  LRU_SIZE: parseInt(LRU_SIZE ?? '10000'),
  BASE_API_URL: BASE_API_URL,
};
