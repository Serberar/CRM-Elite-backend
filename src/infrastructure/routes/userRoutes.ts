import { Router } from 'express';
import { UserController } from '@infrastructure/express/controllers/UserController';
import { validateRequest } from '@infrastructure/express/middleware/validateRequest';
import {
  registerUserSchema,
  loginUserSchema,
  refreshTokenSchema,
  logoutUserSchema,
} from '@infrastructure/express/validation/userSchemas';
import { authRateLimiter } from '@infrastructure/express/middleware/rateLimiter';
import { csrfTokenEndpoint, csrfProtection } from '@infrastructure/express/middleware/csrfMiddleware';

const router = Router();

// Endpoint para obtener token CSRF (solo necesario si USE_COOKIE_AUTH=true)
router.get('/csrf-token', csrfTokenEndpoint);

// Rate limiting estricto para autenticación
router.post(
  '/register',
  authRateLimiter,
  csrfProtection, // CSRF protection para registro
  validateRequest(registerUserSchema),
  UserController.register.bind(UserController)
);

router.post(
  '/login',
  authRateLimiter,
  validateRequest(loginUserSchema),
  UserController.login
);

router.post(
  '/refresh',
  authRateLimiter,
  csrfProtection, // CSRF protection para refresh
  UserController.refresh.bind(UserController)
);

router.post(
  '/logout',
  csrfProtection, // CSRF protection para logout
  validateRequest(logoutUserSchema),
  UserController.logout.bind(UserController)
);

export default router;
