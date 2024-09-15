import express from 'express';
import { createServer } from 'http';
import morgan from 'morgan';
import requestIp from 'request-ip';
import { rateLimiting } from './middleware/rate-limit.mw';
import { apiRoutes } from './routes';

const PORT = 3000;
void (async function () {
  const app = express();
  const httpServer = createServer(app);

  app.use(
    morgan(':method :url :status :res[content-length] - :response-time ms')
  );
  app.use(requestIp.mw());
  app.use(rateLimiting());
  app.use('/api/v1', apiRoutes());
  httpServer.on('listening', () =>
    console.log('🚀 Server ready at on port', `${PORT}`)
  );

  httpServer.on('error', (error: Error) =>
    console.log(`An error occurred on the server: ${error}`)
  );

  httpServer.listen(PORT, '0.0.0.0');
})();
