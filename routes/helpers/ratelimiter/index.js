const { RateLimiterPostgres } = require('rate-limiter-flexible');
const { DB }  = include('config/')

const rateLimiter = new RateLimiterPostgres({
  storeClient: DB.general,
  keyPrefix: 'middleware',
  points: 10, // 10 requests
  duration: 1, // per 1 second by IP
});

const rateLimiterMiddleware = (req, res, next) => {
  rateLimiter.consume(req.ip)
    .then(() => {
      next();
    })
    .catch((rateLimiterRes) => {
      res.status(429).send('Too Many Requests');
    });
};

module.exports = rateLimiterMiddleware;