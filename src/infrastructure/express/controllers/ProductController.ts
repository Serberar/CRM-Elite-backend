import { Request, Response } from 'express';
import { serviceContainer } from '@infrastructure/container/ServiceContainer';
import { parsePaginationOptions } from '@domain/types';

export class ProductController {
  static async listProducts(req: Request, res: Response) {
    try {
      const currentUser = req.user;
      if (!currentUser) {
        return res.status(401).json({ message: 'No autorizado' });
      }

      const products = await serviceContainer.listProductsUseCase.execute(currentUser);
      res.status(200).json(products);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      if (errorMessage.includes('permiso')) {
        return res.status(403).json({ message: errorMessage });
      }
      res.status(500).json({ message: errorMessage });
    }
  }

  /**
   * Listado paginado de productos
   * Query params: page, limit
   */
  static async listProductsPaginated(req: Request, res: Response) {
    try {
      const currentUser = req.user;
      if (!currentUser) {
        return res.status(401).json({ message: 'No autorizado' });
      }

      const pagination = parsePaginationOptions(
        req.query.page as string | undefined,
        req.query.limit as string | undefined
      );

      const result = await serviceContainer.productRepository.findAllPaginated(pagination);

      res.status(200).json({
        data: result.data.map((p) => p.toPrisma()),
        meta: result.meta,
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      if (errorMessage.includes('permiso')) {
        return res.status(403).json({ message: errorMessage });
      }
      res.status(500).json({ message: errorMessage });
    }
  }

  static async getProduct(req: Request, res: Response) {
    try {
      const currentUser = req.user;
      if (!currentUser) {
        return res.status(401).json({ message: 'No autorizado' });
      }

      const product = await serviceContainer.getProductUseCase.execute(req.body, currentUser);

      if (!product) {
        return res.status(404).json({ message: 'Producto no encontrado' });
      }

      res.status(200).json(product);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      if (errorMessage.includes('permiso')) {
        return res.status(403).json({ message: errorMessage });
      }
      res.status(500).json({ message: errorMessage });
    }
  }

  static async createProduct(req: Request, res: Response) {
    try {
      const currentUser = req.user;
      if (!currentUser) {
        return res.status(401).json({ message: 'No autorizado' });
      }

      const product = await serviceContainer.createProductUseCase.execute(req.body, currentUser);

      res.status(201).json({ message: 'Producto creado correctamente', product });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      if (errorMessage.includes('permiso')) {
        return res.status(403).json({ message: errorMessage });
      }
      res.status(500).json({ message: errorMessage });
    }
  }

  static async updateProduct(req: Request, res: Response) {
    try {
      const currentUser = req.user;
      if (!currentUser) {
        return res.status(401).json({ message: 'No autorizado' });
      }

      const id = req.params.id;
      if (!id) {
        return res.status(400).json({ message: 'ID de producto no proporcionado' });
      }

      const product = await serviceContainer.updateProductUseCase.execute(
        { id, ...req.body },
        currentUser
      );

      return res.status(200).json({
        message: 'Producto actualizado correctamente',
        product,
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Error desconocido';

      if (msg.includes('permiso')) {
        return res.status(403).json({ message: msg });
      }

      if (msg.includes('no encontrado')) {
        return res.status(404).json({ message: msg });
      }

      return res.status(500).json({ message: msg });
    }
  }

  static async toggleActive(req: Request, res: Response) {
    try {
      const currentUser = req.user;
      if (!currentUser) {
        return res.status(401).json({ message: 'No autorizado' });
      }

      const id = req.params.id;

      const product = await serviceContainer.toggleProductActiveUseCase.execute(
        { id },
        currentUser
      );

      return res.status(200).json({
        message: `Producto ${product.active ? 'activado' : 'desactivado'} correctamente`,
        product,
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';

      if (errorMessage.includes('permiso')) {
        return res.status(403).json({ message: errorMessage });
      }
      if (errorMessage.includes('no encontrado')) {
        return res.status(404).json({ message: errorMessage });
      }

      return res.status(500).json({ message: errorMessage });
    }
  }
}
