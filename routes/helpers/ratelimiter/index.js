const { RateLimiterMemory } = require('rate-limiter-flexible');

const rateLimiter = new RateLimiterMemory({
  points: 10, // Maximum consecutive failed login attempt
  duration: 60 * 60 * 1, // per 1 hrs by IP
  blockDuration: 24 * 60 * 60, // Block for 24 hours
});

const rateLimiterMiddleware = (req, res, next) => {
  rateLimiter.consume(req.ip)
    .then((rateLimiterRes) => {
        if(rateLimiterRes?.remainingPoints <= 3){
            req.session.attemptmessage = 'You have ' + rateLimiterRes?.remainingPoints + " attempts remaining."
        }
      next();
    })
    .catch((rateLimiterRes) => {
        req.session.errormessage = 'Too many failed login requests. Please try again after 24 hours or contact system admin.'
        res.redirect('/login');
    });
};

module.exports = rateLimiterMiddleware;