import rateLimit from 'express-rate-limit';

/**
 * Rate limiter para endpoints de autenticación
 * Limita a 5 intentos por IP cada 15 minutos
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // máximo 5 intentos por ventana
  validate: { trustProxy: false },
  message: {
    status: 'error',
    code: 'TOO_MANY_REQUESTS',
    message: 'Demasiados intentos de autenticación. Intente de nuevo en 15 minutos.',
  },
  standardHeaders: true, // Devuelve info de rate limit en headers `RateLimit-*`
  legacyHeaders: false, // Deshabilita headers `X-RateLimit-*`
  skipSuccessfulRequests: false, // Cuenta todos los requests
});

/**
 * Rate limiter general para API
 * Limita a 100 requests por IP cada minuto
 */
export const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 100, // máximo 100 requests por ventana
  validate: { trustProxy: false },
  message: {
    status: 'error',
    code: 'TOO_MANY_REQUESTS',
    message: 'Demasiadas solicitudes. Intente de nuevo en un momento.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
