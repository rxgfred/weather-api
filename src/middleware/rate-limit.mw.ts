import { RateLimiterMemory } from 'rate-limiter-flexible';
import { RequestHandler } from 'express';
import httpStatusCodes from 'http-status-codes';

const rateLimiter = new RateLimiterMemory({
  points: 10, // number of requests
  duration: 10, // per second
});

export const rateLimiting = (): RequestHandler => {
  return async function (req, res, next) {
    rateLimiter
      .consume(req.clientIp ?? '')
      .then(() => {
        next();
      })
      .catch(() => {
        return res.status(httpStatusCodes.TOO_MANY_REQUESTS).json({
          error: 'You have been rate-limited. Please try again later',
        });
      });
  };
};
