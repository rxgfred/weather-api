# Weather API

##### Author: Godfred Asamoah ([@gfredtech](https://github.com/gfredtech))

## Requirements
- [Node.js 18+](https://nodejs.org/en/download/)
- [Docker](https://www.docker.com/products/docker-desktop/)
- [SQLite](https://sqlite.org/)

## Local Setup

- Clone the repo
- Add the environment variables (e.g. in an `.env` file in the root directory) following the format in [.env.example](./.env.example)
- Install dependencies (`npm install`)
- Run `npm run start:dev` to start the server.
    ### Docker Setup
    - configure port, e.g.: `export PORT=8080`.
    - Build image: `docker build -t --build-arg PORT weather-api .`
    - Start container, specifying the env file as shown: `docker run -p $PORT:$PORT --env-file <your env file here> weather-api`

## Tests
- Tests have been included in the project. run `npm test` from root directory to run them.


## Features and design decisions
- Sane defaults have been provided for the configuration except for BASE_API_URL, which must be specified. See [config/index.ts](./src/config/index.ts).
- I combined the use of TTL (time-to-live) to ensure the freshness of data and LRU to manage space effectively in the cache implementation.
- I did not make the `retryCount` for calling the external API configurable. (partly to make the tests run as quickly as possible).
- Made use of an exponential backoff policy for calling the external API.
- Made use of an in-memory rate limiter. An external service like Redis would be better in a multi-instance setting.

## Improvements
- use a docker volume for the sqlite.
