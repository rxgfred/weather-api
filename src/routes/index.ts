import bodyParser from 'body-parser';
import { Router } from 'express';

export function apiRoutes(): Router {
  const router = Router();

  router.post('/weather', bodyParser.json(), (req, res) => {
    // fake endpoint
    return res.status(200).json({ celsius: 10 });
  });

  return router;
}
