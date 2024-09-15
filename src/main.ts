import express from 'express';
import { createServer } from 'http';
import morgan from 'morgan';
import requestIp from 'request-ip';
import { rateLimiting } from './middleware/rate-limit.mw';
import { apiRoutes } from './routes';
import { createStore } from './store';
import { Config } from './config';

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
  httpServer.on('listening', () =>
    console.log('🚀 Server ready at on port', `${Config.PORT}`)
  );

  httpServer.on('error', (error: Error) =>
    console.log(`An error occurred on the server: ${error}`)
  );

  httpServer.listen(Config.PORT, '0.0.0.0');
})();
