import { ProductController } from '@infrastructure/express/controllers/ProductController';
import { Request, Response } from 'express';
import { CurrentUser } from '@application/shared/types/CurrentUser';
import { serviceContainer } from '@infrastructure/container/ServiceContainer';

jest.mock('@infrastructure/container/ServiceContainer', () => ({
  serviceContainer: {
    listProductsUseCase: { execute: jest.fn() },
    getProductUseCase: { execute: jest.fn() },
    createProductUseCase: { execute: jest.fn() },
    updateProductUseCase: { execute: jest.fn() },
    toggleProductActiveUseCase: { execute: jest.fn() },
    productRepository: { findAllPaginated: jest.fn() },
  },
}));

describe('ProductController', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let statusMock: jest.Mock;
  let jsonMock: jest.Mock;

  const currentUser: CurrentUser = { id: 'user-1', role: 'administrador', firstName: 'Admin' };

  beforeEach(() => {
    statusMock = jest.fn().mockReturnThis();
    jsonMock = jest.fn();
    res = { status: statusMock, json: jsonMock };
    req = { user: currentUser, params: {}, body: {}, query: {} };
    jest.clearAllMocks();
  });

  describe('listProducts', () => {
    it('should return 401 if user is not authenticated', async () => {
      req.user = undefined;

      await ProductController.listProducts(req as any, res as any);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({ message: 'No autorizado' });
    });

    it('should return 200 with products list', async () => {
      const products = [{ id: 'product-1', name: 'Product 1' }];
      (serviceContainer.listProductsUseCase.execute as jest.Mock).mockResolvedValue(products);

      await ProductController.listProducts(req as any, res as any);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(products);
    });

    it('should return 403 for permission errors', async () => {
      (serviceContainer.listProductsUseCase.execute as jest.Mock).mockRejectedValue(
        new Error('No tiene permiso')
      );

      await ProductController.listProducts(req as any, res as any);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({ message: 'No tiene permiso' });
    });

    it('should return 500 for other errors', async () => {
      (serviceContainer.listProductsUseCase.execute as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      await ProductController.listProducts(req as any, res as any);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({ message: 'Database error' });
    });
  });

  describe('getProduct', () => {
    it('should return 401 if user is not authenticated', async () => {
      req.user = undefined;

      await ProductController.getProduct(req as any, res as any);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({ message: 'No autorizado' });
    });

    it('should return 404 if product not found', async () => {
      req.body = { id: 'product-1' };
      (serviceContainer.getProductUseCase.execute as jest.Mock).mockResolvedValue(null);

      await ProductController.getProduct(req as any, res as any);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({ message: 'Producto no encontrado' });
    });

    it('should return 200 with product', async () => {
      const product = { id: 'product-1', name: 'Product 1' };
      req.body = { id: 'product-1' };
      (serviceContainer.getProductUseCase.execute as jest.Mock).mockResolvedValue(product);

      await ProductController.getProduct(req as any, res as any);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(product);
    });

    it('should return 403 for permission errors', async () => {
      req.body = { id: 'product-1' };
      (serviceContainer.getProductUseCase.execute as jest.Mock).mockRejectedValue(
        new Error('No tiene permiso')
      );

      await ProductController.getProduct(req as any, res as any);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({ message: 'No tiene permiso' });
    });
  });

  describe('createProduct', () => {
    it('should return 401 if user is not authenticated', async () => {
      req.user = undefined;

      await ProductController.createProduct(req as any, res as any);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({ message: 'No autorizado' });
    });

    it('should return 201 with created product', async () => {
      const product = { id: 'product-1', name: 'New Product' };
      req.body = { name: 'New Product', price: 100 };
      (serviceContainer.createProductUseCase.execute as jest.Mock).mockResolvedValue(product);

      await ProductController.createProduct(req as any, res as any);

      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith({
        message: 'Producto creado correctamente',
        product,
      });
    });

    it('should return 403 for permission errors', async () => {
      req.body = { name: 'New Product' };
      (serviceContainer.createProductUseCase.execute as jest.Mock).mockRejectedValue(
        new Error('No tiene permiso')
      );

      await ProductController.createProduct(req as any, res as any);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({ message: 'No tiene permiso' });
    });

    it('should return 500 for other errors', async () => {
      req.body = { name: 'New Product' };
      (serviceContainer.createProductUseCase.execute as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      await ProductController.createProduct(req as any, res as any);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({ message: 'Database error' });
    });
  });

  describe('updateProduct', () => {
    it('should return 401 if user is not authenticated', async () => {
      req.user = undefined;

      await ProductController.updateProduct(req as any, res as any);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({ message: 'No autorizado' });
    });

    it('should return 400 if id not provided', async () => {
      req.params = {};
      req.body = { name: 'Updated Product' };

      await ProductController.updateProduct(req as any, res as any);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ message: 'ID de producto no proporcionado' });
    });

    it('should return 200 with updated product', async () => {
      const product = { id: 'product-1', name: 'Updated Product' };
      req.params = { id: 'product-1' };
      req.body = { name: 'Updated Product' };
      (serviceContainer.updateProductUseCase.execute as jest.Mock).mockResolvedValue(product);

      await ProductController.updateProduct(req as any, res as any);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        message: 'Producto actualizado correctamente',
        product,
      });
    });

    it('should return 403 for permission errors', async () => {
      req.params = { id: 'product-1' };
      req.body = { name: 'Updated Product' };
      (serviceContainer.updateProductUseCase.execute as jest.Mock).mockRejectedValue(
        new Error('No tiene permiso')
      );

      await ProductController.updateProduct(req as any, res as any);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({ message: 'No tiene permiso' });
    });

    it('should return 404 for not found errors', async () => {
      req.params = { id: 'product-1' };
      req.body = { name: 'Updated Product' };
      (serviceContainer.updateProductUseCase.execute as jest.Mock).mockRejectedValue(
        new Error('Producto no encontrado')
      );

      await ProductController.updateProduct(req as any, res as any);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({ message: 'Producto no encontrado' });
    });

    it('should return 500 for other errors', async () => {
      req.params = { id: 'product-1' };
      req.body = { name: 'Updated Product' };
      (serviceContainer.updateProductUseCase.execute as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      await ProductController.updateProduct(req as any, res as any);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({ message: 'Database error' });
    });
  });

  describe('toggleActive', () => {
    it('should return 401 if user is not authenticated', async () => {
      req.user = undefined;

      await ProductController.toggleActive(req as any, res as any);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({ message: 'No autorizado' });
    });

    it('should return 200 with activated product', async () => {
      const product = { id: 'product-1', name: 'Product', active: true };
      req.params = { id: 'product-1' };
      (serviceContainer.toggleProductActiveUseCase.execute as jest.Mock).mockResolvedValue(product);

      await ProductController.toggleActive(req as any, res as any);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        message: 'Producto activado correctamente',
        product,
      });
    });

    it('should return 200 with deactivated product', async () => {
      const product = { id: 'product-1', name: 'Product', active: false };
      req.params = { id: 'product-1' };
      (serviceContainer.toggleProductActiveUseCase.execute as jest.Mock).mockResolvedValue(product);

      await ProductController.toggleActive(req as any, res as any);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        message: 'Producto desactivado correctamente',
        product,
      });
    });

    it('should return 403 for permission errors', async () => {
      req.params = { id: 'product-1' };
      (serviceContainer.toggleProductActiveUseCase.execute as jest.Mock).mockRejectedValue(
        new Error('No tiene permiso')
      );

      await ProductController.toggleActive(req as any, res as any);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({ message: 'No tiene permiso' });
    });

    it('should return 404 for not found errors', async () => {
      req.params = { id: 'product-1' };
      (serviceContainer.toggleProductActiveUseCase.execute as jest.Mock).mockRejectedValue(
        new Error('Producto no encontrado')
      );

      await ProductController.toggleActive(req as any, res as any);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({ message: 'Producto no encontrado' });
    });
  });
});
