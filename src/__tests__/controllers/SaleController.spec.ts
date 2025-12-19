import { SaleController } from '@infrastructure/express/controllers/SaleController';
import { Request, Response } from 'express';
import { CurrentUser } from '@application/shared/types/CurrentUser';
import { serviceContainer } from '@infrastructure/container/ServiceContainer';

const mockSaleWithRelations = {
  sale: {
    toPrisma: () => ({
      id: 'sale-1',
      clientId: 'client-1',
      statusId: 'status-1',
      totalAmount: 200,
      notes: null,
      metadata: null,
      clientSnapshot: { firstName: 'John', lastName: 'Doe' },
      addressSnapshot: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      closedAt: null,
    }),
  },
  status: { id: 'status-1', name: 'Pending' },
  items: [],
  assignments: [],
  histories: [],
};

jest.mock('@infrastructure/container/ServiceContainer', () => ({
  serviceContainer: {
    createSaleWithProductsUseCase: { execute: jest.fn() },
    listSalesWithFiltersUseCase: { execute: jest.fn() },
    addSaleItemUseCase: { execute: jest.fn() },
    updateSaleItemUseCase: { execute: jest.fn() },
    removeSaleItemUseCase: { execute: jest.fn() },
    changeSaleStatusUseCase: { execute: jest.fn() },
    saleRepository: {
      findWithRelations: jest.fn(),
      listPaginated: jest.fn(),
    },
  },
}));

describe('SaleController', () => {
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

  describe('createSaleWithProducts', () => {
    it('should return 401 if user is not authenticated', async () => {
      req.user = undefined;

      await SaleController.createSaleWithProducts(req as any, res as any);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({ message: 'No autorizado' });
    });

    it('should return 201 with created sale', async () => {
      const sale = { id: 'sale-1', clientId: 'client-1' };
      req.body = { client: { firstName: 'John' }, items: [] };
      (serviceContainer.createSaleWithProductsUseCase.execute as jest.Mock).mockResolvedValue(sale);
      (serviceContainer.saleRepository.findWithRelations as jest.Mock).mockResolvedValue(
        mockSaleWithRelations
      );

      await SaleController.createSaleWithProducts(req as any, res as any);

      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Venta creada correctamente',
        })
      );
    });

    it('should return 403 for permission errors', async () => {
      req.body = { client: { firstName: 'John' } };
      (serviceContainer.createSaleWithProductsUseCase.execute as jest.Mock).mockRejectedValue(
        new Error('No tiene permiso')
      );

      await SaleController.createSaleWithProducts(req as any, res as any);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({ message: 'No tiene permiso' });
    });

    it('should return 500 for other errors', async () => {
      req.body = { client: { firstName: 'John' } };
      (serviceContainer.createSaleWithProductsUseCase.execute as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      await SaleController.createSaleWithProducts(req as any, res as any);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({ message: 'Database error' });
    });
  });

  describe('listSalesWithFilters', () => {
    it('should return 401 if user is not authenticated', async () => {
      req.user = undefined;

      await SaleController.listSalesWithFilters(req as any, res as any);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({ message: 'No autorizado' });
    });

    it('should return 200 with sales list', async () => {
      const sales = [{ id: 'sale-1', toPrisma: () => ({ id: 'sale-1', clientSnapshot: null }) }];
      req.query = {};
      (serviceContainer.listSalesWithFiltersUseCase.execute as jest.Mock).mockResolvedValue(sales);
      (serviceContainer.saleRepository.findWithRelations as jest.Mock).mockResolvedValue(
        mockSaleWithRelations
      );

      await SaleController.listSalesWithFilters(req as any, res as any);

      expect(statusMock).toHaveBeenCalledWith(200);
    });

    it('should return 403 for permission errors', async () => {
      req.query = {};
      (serviceContainer.listSalesWithFiltersUseCase.execute as jest.Mock).mockRejectedValue(
        new Error('No tiene permiso')
      );

      await SaleController.listSalesWithFilters(req as any, res as any);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({ message: 'No tiene permiso' });
    });

    it('should return 500 for other errors', async () => {
      req.query = {};
      (serviceContainer.listSalesWithFiltersUseCase.execute as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      await SaleController.listSalesWithFilters(req as any, res as any);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({ message: 'Database error' });
    });
  });

  describe('addSaleItem', () => {
    it('should return 401 if user is not authenticated', async () => {
      req.user = undefined;

      await SaleController.addSaleItem(req as any, res as any);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({ message: 'No autorizado' });
    });

    it('should return 200 with added item', async () => {
      req.params = { saleId: 'sale-1' };
      req.body = { name: 'Product 1', quantity: 2, price: 100 };
      (serviceContainer.addSaleItemUseCase.execute as jest.Mock).mockResolvedValue({});
      (serviceContainer.saleRepository.findWithRelations as jest.Mock).mockResolvedValue(
        mockSaleWithRelations
      );

      await SaleController.addSaleItem(req as any, res as any);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Item añadido a la venta correctamente',
        })
      );
    });

    it('should return 403 for permission errors', async () => {
      req.params = { saleId: 'sale-1' };
      req.body = { name: 'Product 1' };
      (serviceContainer.addSaleItemUseCase.execute as jest.Mock).mockRejectedValue(
        new Error('No tiene permiso')
      );

      await SaleController.addSaleItem(req as any, res as any);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({ message: 'No tiene permiso' });
    });

    it('should return 404 for not found errors', async () => {
      req.params = { saleId: 'sale-1' };
      req.body = { name: 'Product 1' };
      (serviceContainer.addSaleItemUseCase.execute as jest.Mock).mockRejectedValue(
        new Error('Venta no encontrada')
      );

      await SaleController.addSaleItem(req as any, res as any);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({ message: 'Venta no encontrada' });
    });

    it('should return 500 for other errors', async () => {
      req.params = { saleId: 'sale-1' };
      req.body = { name: 'Product 1' };
      (serviceContainer.addSaleItemUseCase.execute as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      await SaleController.addSaleItem(req as any, res as any);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({ message: 'Database error' });
    });
  });

  describe('updateSaleItem', () => {
    it('should return 401 if user is not authenticated', async () => {
      req.user = undefined;

      await SaleController.updateSaleItem(req as any, res as any);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({ message: 'No autorizado' });
    });

    it('should return 200 with updated item', async () => {
      req.params = { saleId: 'sale-1', itemId: 'item-1' };
      req.body = { quantity: 3 };
      (serviceContainer.updateSaleItemUseCase.execute as jest.Mock).mockResolvedValue({});
      (serviceContainer.saleRepository.findWithRelations as jest.Mock).mockResolvedValue(
        mockSaleWithRelations
      );

      await SaleController.updateSaleItem(req as any, res as any);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Item actualizado correctamente',
        })
      );
    });

    it('should return 403 for permission errors', async () => {
      req.params = { saleId: 'sale-1', itemId: 'item-1' };
      req.body = { quantity: 3 };
      (serviceContainer.updateSaleItemUseCase.execute as jest.Mock).mockRejectedValue(
        new Error('No tiene permiso')
      );

      await SaleController.updateSaleItem(req as any, res as any);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({ message: 'No tiene permiso' });
    });

    it('should return 404 for not found errors', async () => {
      req.params = { saleId: 'sale-1', itemId: 'item-1' };
      req.body = { quantity: 3 };
      (serviceContainer.updateSaleItemUseCase.execute as jest.Mock).mockRejectedValue(
        new Error('Item no encontrado')
      );

      await SaleController.updateSaleItem(req as any, res as any);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({ message: 'Item no encontrado' });
    });

    it('should return 500 for other errors', async () => {
      req.params = { saleId: 'sale-1', itemId: 'item-1' };
      req.body = { quantity: 3 };
      (serviceContainer.updateSaleItemUseCase.execute as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      await SaleController.updateSaleItem(req as any, res as any);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({ message: 'Database error' });
    });
  });

  describe('removeSaleItem', () => {
    it('should return 401 if user is not authenticated', async () => {
      req.user = undefined;

      await SaleController.removeSaleItem(req as any, res as any);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({ message: 'No autorizado' });
    });

    it('should return 200 after removing item', async () => {
      req.params = { saleId: 'sale-1', itemId: 'item-1' };
      (serviceContainer.removeSaleItemUseCase.execute as jest.Mock).mockResolvedValue({});
      (serviceContainer.saleRepository.findWithRelations as jest.Mock).mockResolvedValue(
        mockSaleWithRelations
      );

      await SaleController.removeSaleItem(req as any, res as any);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Item eliminado correctamente',
        })
      );
    });

    it('should return 403 for permission errors', async () => {
      req.params = { saleId: 'sale-1', itemId: 'item-1' };
      (serviceContainer.removeSaleItemUseCase.execute as jest.Mock).mockRejectedValue(
        new Error('No tiene permiso')
      );

      await SaleController.removeSaleItem(req as any, res as any);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({ message: 'No tiene permiso' });
    });

    it('should return 404 for not found errors', async () => {
      req.params = { saleId: 'sale-1', itemId: 'item-1' };
      (serviceContainer.removeSaleItemUseCase.execute as jest.Mock).mockRejectedValue(
        new Error('Item no encontrado')
      );

      await SaleController.removeSaleItem(req as any, res as any);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({ message: 'Item no encontrado' });
    });

    it('should return 500 for other errors', async () => {
      req.params = { saleId: 'sale-1', itemId: 'item-1' };
      (serviceContainer.removeSaleItemUseCase.execute as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      await SaleController.removeSaleItem(req as any, res as any);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({ message: 'Database error' });
    });
  });

  describe('changeSaleStatus', () => {
    it('should return 401 if user is not authenticated', async () => {
      req.user = undefined;

      await SaleController.changeSaleStatus(req as any, res as any);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({ message: 'No autorizado' });
    });

    it('should return 200 with updated sale', async () => {
      const sale = { id: 'sale-1', statusId: 'status-2' };
      req.params = { saleId: 'sale-1' };
      req.body = { statusId: 'status-2' };
      (serviceContainer.changeSaleStatusUseCase.execute as jest.Mock).mockResolvedValue(sale);
      (serviceContainer.saleRepository.findWithRelations as jest.Mock).mockResolvedValue(
        mockSaleWithRelations
      );

      await SaleController.changeSaleStatus(req as any, res as any);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Estado de venta cambiado correctamente',
        })
      );
    });

    it('should return 403 for permission errors', async () => {
      req.params = { saleId: 'sale-1' };
      req.body = { statusId: 'status-2' };
      (serviceContainer.changeSaleStatusUseCase.execute as jest.Mock).mockRejectedValue(
        new Error('No tiene permiso')
      );

      await SaleController.changeSaleStatus(req as any, res as any);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({ message: 'No tiene permiso' });
    });

    it('should return 404 for not found errors', async () => {
      req.params = { saleId: 'sale-1' };
      req.body = { statusId: 'status-2' };
      (serviceContainer.changeSaleStatusUseCase.execute as jest.Mock).mockRejectedValue(
        new Error('Venta no encontrada')
      );

      await SaleController.changeSaleStatus(req as any, res as any);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({ message: 'Venta no encontrada' });
    });

    it('should return 500 for other errors', async () => {
      req.params = { saleId: 'sale-1' };
      req.body = { statusId: 'status-2' };
      (serviceContainer.changeSaleStatusUseCase.execute as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      await SaleController.changeSaleStatus(req as any, res as any);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({ message: 'Database error' });
    });
  });
});
