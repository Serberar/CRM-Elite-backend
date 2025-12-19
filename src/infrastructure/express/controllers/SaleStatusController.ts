import { Request, Response } from 'express';
import { serviceContainer } from '@infrastructure/container/ServiceContainer';

export class SaleStatusController {
  static async listSaleStatuses(req: Request, res: Response) {
    try {
      const currentUser = req.user;
      if (!currentUser) {
        return res.status(401).json({ message: 'No autorizado' });
      }

      const statuses = await serviceContainer.listSaleStatusUseCase.execute(currentUser);
      res.status(200).json(statuses);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      if (errorMessage.includes('permiso')) {
        return res.status(403).json({ message: errorMessage });
      }
      res.status(500).json({ message: errorMessage });
    }
  }

  static async createSaleStatus(req: Request, res: Response) {
    try {
      const currentUser = req.user;
      if (!currentUser) {
        return res.status(401).json({ message: 'No autorizado' });
      }

      const status = await serviceContainer.createSaleStatusUseCase.execute(req.body, currentUser);

      res.status(201).json({ message: 'Estado de venta creado correctamente', status });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      if (errorMessage.includes('permiso')) {
        return res.status(403).json({ message: errorMessage });
      }
      res.status(500).json({ message: errorMessage });
    }
  }

  static async updateSaleStatus(req: Request, res: Response) {
    try {
      const currentUser = req.user;
      if (!currentUser) {
        return res.status(401).json({ message: 'No autorizado' });
      }

      const { id } = req.params;
      const status = await serviceContainer.updateSaleStatusUseCase.execute(
        { ...req.body, id },
        currentUser
      );

      res.status(200).json({ message: 'Estado de venta actualizado correctamente', status });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      if (errorMessage.includes('permiso')) {
        return res.status(403).json({ message: errorMessage });
      }
      if (errorMessage.includes('no encontrado')) {
        return res.status(404).json({ message: errorMessage });
      }
      res.status(500).json({ message: errorMessage });
    }
  }

  static async reorderSaleStatuses(req: Request, res: Response) {
    try {
      const currentUser = req.user;
      if (!currentUser) {
        return res.status(401).json({ message: 'No autorizado' });
      }

      const statuses = await serviceContainer.reorderSaleStatusesUseCase.execute(req.body, currentUser);

      res.status(200).json(statuses);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      if (errorMessage.includes('permiso')) {
        return res.status(403).json({ message: errorMessage });
      }
      res.status(500).json({ message: errorMessage });
    }
  }

  static async deleteSaleStatus(req: Request, res: Response) {
    try {
      const currentUser = req.user;
      if (!currentUser) {
        return res.status(401).json({ message: 'No autorizado' });
      }

      const { id } = req.params;

      await serviceContainer.deleteSaleStatusUseCase.execute(id, currentUser);

      res.status(200).json({ message: 'Estado de venta eliminado correctamente' });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      if (errorMessage.includes('permiso')) {
        return res.status(403).json({ message: errorMessage });
      }
      if (errorMessage.includes('no encontrado')) {
        return res.status(404).json({ message: errorMessage });
      }
      res.status(500).json({ message: errorMessage });
    }
  }
}
