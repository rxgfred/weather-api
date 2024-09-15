import express, { ErrorRequestHandler } from 'express';
import { createServer } from 'http';
import morgan from 'morgan';
import requestIp from 'request-ip';
import { rateLimiting } from './middleware/rate-limit.mw';
import { apiRoutes } from './routes';
import { createStore, SqliteStoreImpl } from './store';
import { Config } from './config';
import httpStatusCodes from 'http-status-codes';

void (async function () {
  const store = await createStore();
  const app = express();
  const httpServer = createServer(app);

  app.use(
    morgan(':method :url :status :res[content-length] - :response-time ms')
  );
  app.use(requestIp.mw());
  app.use(rateLimiting());
  app.use('/api/v1', apiRoutes(store));

  app.use(function (err, _req, res, _next) {
    return res
      .status(httpStatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: err.message });
  } as ErrorRequestHandler);

  httpServer.on('listening', () =>
    console.log('🚀 Server ready at on port', `${Config.PORT}`)
  );

  httpServer.on('error', (error: Error) =>
    console.log(`An error occurred on the server: ${error}`)
  );

  httpServer.listen(Config.PORT, '0.0.0.0');

  process.on('SIGINT', () => {
    // cleanup
    httpServer.close(function () {
      (store as SqliteStoreImpl).close();
      process.exit(0);
    });
  });
})();
