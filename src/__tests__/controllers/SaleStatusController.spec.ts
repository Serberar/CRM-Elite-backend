import { SaleStatusController } from '@infrastructure/express/controllers/SaleStatusController';
import { Request, Response } from 'express';
import { CurrentUser } from '@application/shared/types/CurrentUser';
import { serviceContainer } from '@infrastructure/container/ServiceContainer';

jest.mock('@infrastructure/container/ServiceContainer', () => ({
  serviceContainer: {
    listSaleStatusUseCase: { execute: jest.fn() },
    createSaleStatusUseCase: { execute: jest.fn() },
    updateSaleStatusUseCase: { execute: jest.fn() },
    reorderSaleStatusesUseCase: { execute: jest.fn() },
    deleteSaleStatusUseCase: { execute: jest.fn() },
  },
}));

describe('SaleStatusController', () => {
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

  describe('listSaleStatuses', () => {
    it('should return 401 if user is not authenticated', async () => {
      req.user = undefined;

      await SaleStatusController.listSaleStatuses(req as any, res as any);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({ message: 'No autorizado' });
    });

    it('should return 200 with statuses list', async () => {
      const statuses = [
        { id: 'status-1', name: 'Pending' },
        { id: 'status-2', name: 'Completed' },
      ];
      (serviceContainer.listSaleStatusUseCase.execute as jest.Mock).mockResolvedValue(statuses);

      await SaleStatusController.listSaleStatuses(req as any, res as any);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(statuses);
    });

    it('should return 403 for permission errors', async () => {
      (serviceContainer.listSaleStatusUseCase.execute as jest.Mock).mockRejectedValue(
        new Error('No tiene permiso')
      );

      await SaleStatusController.listSaleStatuses(req as any, res as any);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({ message: 'No tiene permiso' });
    });

    it('should return 500 for other errors', async () => {
      (serviceContainer.listSaleStatusUseCase.execute as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      await SaleStatusController.listSaleStatuses(req as any, res as any);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({ message: 'Database error' });
    });
  });

  describe('createSaleStatus', () => {
    it('should return 401 if user is not authenticated', async () => {
      req.user = undefined;

      await SaleStatusController.createSaleStatus(req as any, res as any);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({ message: 'No autorizado' });
    });

    it('should return 201 with created status', async () => {
      const status = { id: 'status-1', name: 'New Status' };
      req.body = { name: 'New Status', order: 1 };
      (serviceContainer.createSaleStatusUseCase.execute as jest.Mock).mockResolvedValue(status);

      await SaleStatusController.createSaleStatus(req as any, res as any);

      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith({
        message: 'Estado de venta creado correctamente',
        status,
      });
    });

    it('should return 403 for permission errors', async () => {
      req.body = { name: 'New Status' };
      (serviceContainer.createSaleStatusUseCase.execute as jest.Mock).mockRejectedValue(
        new Error('No tiene permiso')
      );

      await SaleStatusController.createSaleStatus(req as any, res as any);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({ message: 'No tiene permiso' });
    });

    it('should return 500 for other errors', async () => {
      req.body = { name: 'New Status' };
      (serviceContainer.createSaleStatusUseCase.execute as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      await SaleStatusController.createSaleStatus(req as any, res as any);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({ message: 'Database error' });
    });
  });

  describe('updateSaleStatus', () => {
    it('should return 401 if user is not authenticated', async () => {
      req.user = undefined;

      await SaleStatusController.updateSaleStatus(req as any, res as any);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({ message: 'No autorizado' });
    });

    it('should return 200 with updated status', async () => {
      const status = { id: 'status-1', name: 'Updated Status' };
      req.params = { id: 'status-1' };
      req.body = { name: 'Updated Status' };
      (serviceContainer.updateSaleStatusUseCase.execute as jest.Mock).mockResolvedValue(status);

      await SaleStatusController.updateSaleStatus(req as any, res as any);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        message: 'Estado de venta actualizado correctamente',
        status,
      });
    });

    it('should return 403 for permission errors', async () => {
      req.params = { id: 'status-1' };
      req.body = { name: 'Updated Status' };
      (serviceContainer.updateSaleStatusUseCase.execute as jest.Mock).mockRejectedValue(
        new Error('No tiene permiso')
      );

      await SaleStatusController.updateSaleStatus(req as any, res as any);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({ message: 'No tiene permiso' });
    });

    it('should return 404 for not found errors', async () => {
      req.params = { id: 'status-1' };
      req.body = { name: 'Updated Status' };
      (serviceContainer.updateSaleStatusUseCase.execute as jest.Mock).mockRejectedValue(
        new Error('Estado no encontrado')
      );

      await SaleStatusController.updateSaleStatus(req as any, res as any);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({ message: 'Estado no encontrado' });
    });

    it('should return 500 for other errors', async () => {
      req.params = { id: 'status-1' };
      req.body = { name: 'Updated Status' };
      (serviceContainer.updateSaleStatusUseCase.execute as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      await SaleStatusController.updateSaleStatus(req as any, res as any);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({ message: 'Database error' });
    });
  });

  describe('reorderSaleStatuses', () => {
    it('should return 401 if user is not authenticated', async () => {
      req.user = undefined;

      await SaleStatusController.reorderSaleStatuses(req as any, res as any);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({ message: 'No autorizado' });
    });

    it('should return 200 after reordering', async () => {
      const statuses = [
        { id: 'status-1', order: 2 },
        { id: 'status-2', order: 1 },
      ];
      req.body = { orderedIds: ['status-2', 'status-1'] };
      (serviceContainer.reorderSaleStatusesUseCase.execute as jest.Mock).mockResolvedValue(statuses);

      await SaleStatusController.reorderSaleStatuses(req as any, res as any);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(statuses);
    });

    it('should return 403 for permission errors', async () => {
      req.body = { orderedIds: [] };
      (serviceContainer.reorderSaleStatusesUseCase.execute as jest.Mock).mockRejectedValue(
        new Error('No tiene permiso')
      );

      await SaleStatusController.reorderSaleStatuses(req as any, res as any);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({ message: 'No tiene permiso' });
    });

    it('should return 500 for other errors', async () => {
      req.body = { orderedIds: [] };
      (serviceContainer.reorderSaleStatusesUseCase.execute as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      await SaleStatusController.reorderSaleStatuses(req as any, res as any);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({ message: 'Database error' });
    });
  });
});
