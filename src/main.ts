import express, { Request, Response } from 'express';
import { createServer } from 'http';

const PORT = 3000;
void (async function () {
  const app = express();
  const httpServer = createServer(app);
  app.get('/', (req: Request, res: Response) => {
    res.status(200).send('hello world');
  });

  httpServer.on('listening', () =>
    console.log('🚀 Server ready at on port', `${PORT}`)
  );

  httpServer.on('error', (error: Error) =>
    console.log(`An error occurred on the server: ${error}`)
  );

  httpServer.listen(PORT, '0.0.0.0');
})();
