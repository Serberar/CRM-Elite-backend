import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import ip from 'ip';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from '@infrastructure/express/swagger/swaggerConfig';

// Routes
import userRoutes from '@infrastructure/routes/userRoutes';
import clientRoutes from '@infrastructure/routes/clientRoutes';
import productRoutes from '@infrastructure/routes/productRoutes';
import saleStatusRoutes from '@infrastructure/routes/saleStatusRoutes';
import saleRoutes from '@infrastructure/routes/saleRoutes';
import recordingRoutes from '@infrastructure/routes/recordingRoutes';

// Middleware
import logger, { morganStream } from '@infrastructure/observability/logger/logger';
import { monitoringMiddleware } from '@infrastructure/express/middleware/monitoringMiddleware';
import { errorHandler } from '@infrastructure/express/middleware/errorHandler';
import healthRoutes from '@infrastructure/routes/healthRoutes';
import {
  prometheusMiddleware,
  metricsHandler,
} from '@infrastructure/observability/metrics/prometheusMetrics';

/**
 * Configuración de la aplicación Express
 */
export class App {
  public app: Application;

  constructor() {
    this.app = express();
    this.configureMiddleware();
    this.configureRoutes();
    this.configureErrorHandling();
  }

  /**
   * Configuración de middlewares
   */
  private configureMiddleware(): void {
    // Trust proxy
    this.app.set('trust proxy', true);

    const FILTER_IPS = process.env.FILTER_IPS === 'true';
    const ALLOW_ALL_CORS = process.env.ALLOW_ALL_CORS === 'true';

    // === Helmet: Headers de seguridad HTTP ===
    this.app.use(helmet());

    // === Filtrado de IPs ===
    if (FILTER_IPS) {
      this.app.use(this.ipFilterMiddleware());
    }

    // === CORS (corregido completamente) ===
    this.app.use(this.corsMiddleware(ALLOW_ALL_CORS));

    // === Body parsing ===
    this.app.use(express.json());
    this.app.use(cookieParser());

    // === Logging HTTP ===
    this.app.use(morgan('combined', { stream: morganStream }));

    // === Métricas Prometheus ===
    this.app.use(prometheusMiddleware);

    // === Monitorización ===
    this.app.use(monitoringMiddleware);
  }

  /**
   * Middleware de filtrado por IP
   */
  private ipFilterMiddleware() {
    const allowedIps = [process.env.IP1, process.env.IP2, process.env.IP3]
      .filter((ip): ip is string => Boolean(ip))
      .map((ip) => ip.trim());

    return (req: Request, res: Response, next: NextFunction) => {
      let clientIp: string | undefined;
      const forwarded = req.headers['x-forwarded-for'];

      if (typeof forwarded === 'string') {
        clientIp = forwarded.split(',')[0].trim();
      } else if (Array.isArray(forwarded)) {
        clientIp = forwarded[0].trim();
      } else {
        clientIp = req.socket.remoteAddress;
      }

      clientIp = this.normalizeIp(clientIp);

      const isAllowed =
        (clientIp && ip.isPrivate(clientIp)) || (clientIp && allowedIps.includes(clientIp));

      if (isAllowed) return next();

      logger.warn(`Acceso denegado desde IP: ${clientIp}`);
      res.status(403).json({ message: 'Acceso no autorizado', ip: clientIp });
    };
  }

  /**
   * Middleware CORS corregido para preflight OPTIONS
   */
  private corsMiddleware(allowAll: boolean) {
    const allowedOrigins = [process.env.CORS1, process.env.CORS2, process.env.CORS3].filter(
      Boolean
    );

    return (req: Request, res: Response, next: NextFunction) => {
      const origin = req.headers.origin;

      // Preflight: permitir SIEMPRE
      if (req.method === 'OPTIONS') {
        res.header('Access-Control-Allow-Origin', origin || '*');
        res.header('Access-Control-Allow-Credentials', 'true');
        res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
        return res.sendStatus(200);
      }

      // Validación de origen normal
      if (allowAll || !origin || allowedOrigins.includes(origin)) {
        res.header('Access-Control-Allow-Origin', origin || '*');
        res.header('Access-Control-Allow-Credentials', 'true');
        return next();
      }

      logger.warn(`Origen CORS no permitido: ${origin}`);
      return res.status(403).json({ message: 'CORS: Origen no permitido', origin });
    };
  }

  /**
   * Normaliza IPs IPv6 a IPv4
   */
  private normalizeIp(ip?: string): string | undefined {
    if (!ip) return;
    if (ip.startsWith('::ffff:')) return ip.replace('::ffff:', '');
    if (ip === '::1') return '127.0.0.1';
    return ip;
  }

  /**
   * Configuración de rutas
   */
  private configureRoutes(): void {
    // === Favicon: silenciar petición automática del navegador ===
    this.app.get('/favicon.ico', (_req, res) => res.status(204).end());

    // === Swagger API Docs ===
    this.app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
      explorer: true,
      customSiteTitle: 'CRM Backend API - Docs',
    }));
    this.app.get('/api-docs.json', (_req, res) => res.json(swaggerSpec));

    // === API Routes ===
    this.app.use('/api/users', userRoutes);
    this.app.use('/api/clients', clientRoutes);
    this.app.use('/api/products', productRoutes);
    this.app.use('/api/sale-status', saleStatusRoutes);
    this.app.use('/api/sales', saleRoutes);
    this.app.use('/api/sales', recordingRoutes);
    
    // === Health checks ===
    this.app.use('/', healthRoutes);

    // === Métricas Prometheus ===
    this.app.get('/metrics', metricsHandler);
    this.app.get('/api/metrics', metricsHandler);

    // === Ruta 404 ===
    this.app.use((req: Request, res: Response) => {
      res.status(404).json({
        status: 'error',
        code: 'NOT_FOUND',
        message: 'Ruta no encontrada',
        path: req.path,
      });
    });
  }

  /**
   * Configuración de manejo de errores
   */
  private configureErrorHandling(): void {
    this.app.use(errorHandler); // último middleware
  }

  /**
   * Obtiene la instancia de Express
   */
  public getApp(): Application {
    return this.app;
  }
}
