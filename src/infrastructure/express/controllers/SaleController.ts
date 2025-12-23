import { Request, Response } from 'express';
import { serviceContainer } from '@infrastructure/container/ServiceContainer';
import { parsePaginationOptions } from '@domain/types';

export class SaleController {
  static async createSaleWithProducts(req: Request, res: Response) {
    try {
      const currentUser = req.user;
      if (!currentUser) return res.status(401).json({ message: 'No autorizado' });

      const dto = {
        client: req.body.client,
        items: req.body.items,
        statusId: req.body.statusId,
        notes: req.body.notes,
        metadata: req.body.metadata,
        comercial: req.body.comercial,
      };

      const sale = await serviceContainer.createSaleWithProductsUseCase.execute(dto, currentUser);

      // Obtener la venta completa con relaciones
      const saleWithRelations = await serviceContainer.saleRepository.findWithRelations(sale.id);

      if (!saleWithRelations)
        return res.status(500).json({ message: 'Error al obtener la venta creada' });

      const salePrisma = saleWithRelations.sale.toPrisma();

      const saleResponse = {
        ...salePrisma,
        client: salePrisma.clientSnapshot ?? null,
        status: saleWithRelations.status ?? null,
        items: saleWithRelations.items.map((i) => i.toPrisma()),
        assignments: saleWithRelations.assignments.map((a) => a.toPrisma()),
        histories: saleWithRelations.histories.map((h) => h.toPrisma()),
      };

      return res.status(201).json({ message: 'Venta creada correctamente', sale: saleResponse });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Error desconocido';
      if (msg.includes('permiso')) return res.status(403).json({ message: msg });

      console.error('Error en createSaleWithProducts:', msg);
      return res.status(500).json({ message: msg });
    }
  }

  static async getSaleById(req: Request, res: Response) {
    try {
      const currentUser = req.user;
      if (!currentUser) {
        return res.status(401).json({ message: 'No autorizado' });
      }

      const { saleId } = req.params;
      const saleWithRelations = await serviceContainer.saleRepository.findWithRelations(saleId);

      if (!saleWithRelations) {
        return res.status(404).json({ message: 'Venta no encontrada' });
      }

      const salePrisma = saleWithRelations.sale.toPrisma();

      const saleResponse = {
        ...salePrisma,
        client: salePrisma.clientSnapshot ?? null,
        status: saleWithRelations.status ?? null,
        items: saleWithRelations.items.map((item) => item.toPrisma()),
        assignments: saleWithRelations.assignments.map((a) => a.toPrisma()),
        histories: saleWithRelations.histories.map((h) => h.toPrisma()),
      };

      res.status(200).json(saleResponse);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      if (errorMessage.includes('permiso')) {
        return res.status(403).json({ message: errorMessage });
      }
      res.status(500).json({ message: errorMessage });
    }
  }

  static async listSalesWithFilters(req: Request, res: Response) {
    try {
      const currentUser = req.user;
      if (!currentUser) {
        return res.status(401).json({ message: 'No autorizado' });
      }

      const filters = {
        clientId: req.query.clientId as string | undefined,
        statusId: req.query.statusId as string | undefined,
        from: req.query.from ? new Date(req.query.from as string) : undefined,
        to: req.query.to ? new Date(req.query.to as string) : undefined,
        productId: req.query.productId as string | undefined,
        minTotal: req.query.minTotal ? Number(req.query.minTotal) : undefined,
        maxTotal: req.query.maxTotal ? Number(req.query.maxTotal) : undefined,
        comercial: req.query.comercial as string | undefined,
      };

      const sales = await serviceContainer.listSalesWithFiltersUseCase.execute(filters, currentUser);

      const salesWithRelations = await Promise.all(
        sales.map(async (sale) => {
          const saleWithRelations = await serviceContainer.saleRepository.findWithRelations(sale.id);
          const salePrisma = sale.toPrisma();

          if (!saleWithRelations) {
            return {
              ...salePrisma,
              client: salePrisma.clientSnapshot ?? null,
              status: null,
              items: [],
              assignments: [],
              histories: [],
            };
          }

          const saleWithRelationsPrisma = saleWithRelations.sale.toPrisma();

          return {
            ...saleWithRelationsPrisma,
            client: saleWithRelationsPrisma.clientSnapshot ?? null,
            status: saleWithRelations.status ?? null,
            items: saleWithRelations.items.map((item) => item.toPrisma()),
            assignments: saleWithRelations.assignments.map((a) => a.toPrisma()),
            histories: saleWithRelations.histories.map((h) => h.toPrisma()),
          };
        })
      );

      res.status(200).json(salesWithRelations);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      if (errorMessage.includes('permiso')) {
        return res.status(403).json({ message: errorMessage });
      }
      res.status(500).json({ message: errorMessage });
    }
  }

  /**
   * Listado paginado de ventas con filtros
   * Query params: page, limit, clientId, statusId, from, to
   */
  static async listSalesPaginated(req: Request, res: Response) {
    try {
      const currentUser = req.user;
      if (!currentUser) {
        return res.status(401).json({ message: 'No autorizado' });
      }

      const pagination = parsePaginationOptions(
        req.query.page as string | undefined,
        req.query.limit as string | undefined
      );

      const filters = {
        clientId: req.query.clientId as string | undefined,
        statusId: req.query.statusId as string | undefined,
        from: req.query.from ? new Date(req.query.from as string) : undefined,
        to: req.query.to ? new Date(req.query.to as string) : undefined,
        comercial: req.query.comercial as string | undefined,
      };

      const result = await serviceContainer.saleRepository.listPaginated(filters, pagination);

      // Enriquecer con relaciones
      const salesWithRelations = await Promise.all(
        result.data.map(async (sale) => {
          const saleWithRelations = await serviceContainer.saleRepository.findWithRelations(sale.id);
          const salePrisma = sale.toPrisma();

          if (!saleWithRelations) {
            return {
              ...salePrisma,
              client: salePrisma.clientSnapshot ?? null,
              status: null,
              items: [],
              assignments: [],
              histories: [],
            };
          }

          const saleWithRelationsPrisma = saleWithRelations.sale.toPrisma();

          return {
            ...saleWithRelationsPrisma,
            client: saleWithRelationsPrisma.clientSnapshot ?? null,
            status: saleWithRelations.status ?? null,
            items: saleWithRelations.items.map((item) => item.toPrisma()),
            assignments: saleWithRelations.assignments.map((a) => a.toPrisma()),
            histories: saleWithRelations.histories.map((h) => h.toPrisma()),
          };
        })
      );

      res.status(200).json({
        data: salesWithRelations,
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

  static async addSaleItem(req: Request, res: Response) {
    try {
      const currentUser = req.user;
      if (!currentUser) {
        return res.status(401).json({ message: 'No autorizado' });
      }

      const { saleId } = req.params;

      // Adaptar datos del frontend al formato que espera el backend
      const itemData = {
        productId: req.body.productId || null,
        nameSnapshot: req.body.name,
        skuSnapshot: req.body.sku || null,
        unitPrice: Number(req.body.price),
        quantity: Number(req.body.quantity),
        finalPrice: Number(req.body.price) * Number(req.body.quantity),
      };

      await serviceContainer.addSaleItemUseCase.execute(saleId, itemData, currentUser);

      // Obtener la venta completa con relaciones
      const saleWithRelations = await serviceContainer.saleRepository.findWithRelations(saleId);

      if (!saleWithRelations)
        return res.status(500).json({ message: 'Error al obtener la venta actualizada' });

      const salePrisma = saleWithRelations.sale.toPrisma();

      const saleResponse = {
        ...salePrisma,
        client: salePrisma.clientSnapshot ?? null,
        status: saleWithRelations.status ?? null,
        items: saleWithRelations.items.map((i) => i.toPrisma()),
        assignments: saleWithRelations.assignments.map((a) => a.toPrisma()),
        histories: saleWithRelations.histories.map((h) => h.toPrisma()),
      };

      res.status(200).json({ message: 'Item añadido a la venta correctamente', sale: saleResponse });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      if (errorMessage.includes('permiso')) return res.status(403).json({ message: errorMessage });
      if (errorMessage.includes('no encontrado') || errorMessage.includes('no encontrada'))
        return res.status(404).json({ message: errorMessage });
      res.status(500).json({ message: errorMessage });
    }
  }

  static async updateSaleItem(req: Request, res: Response) {
    try {
      const currentUser = req.user;
      if (!currentUser) return res.status(401).json({ message: 'No autorizado' });

      const { saleId, itemId } = req.params;

      // Adaptar datos del frontend al formato que espera el backend
      const dto = {
        saleId,
        items: [
          {
            id: itemId,
            unitPrice: req.body.unitPrice,
            quantity: req.body.quantity,
            finalPrice: req.body.finalPrice,
          },
        ],
      };

      await serviceContainer.updateSaleItemUseCase.execute(dto, currentUser);

      // Obtener la venta completa con relaciones
      const saleWithRelations = await serviceContainer.saleRepository.findWithRelations(saleId);

      if (!saleWithRelations)
        return res.status(500).json({ message: 'Error al obtener la venta actualizada' });

      const salePrisma = saleWithRelations.sale.toPrisma();

      const saleResponse = {
        ...salePrisma,
        client: salePrisma.clientSnapshot ?? null,
        status: saleWithRelations.status ?? null,
        items: saleWithRelations.items.map((i) => i.toPrisma()),
        assignments: saleWithRelations.assignments.map((a) => a.toPrisma()),
        histories: saleWithRelations.histories.map((h) => h.toPrisma()),
      };

      res.status(200).json({ message: 'Item actualizado correctamente', sale: saleResponse });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      if (errorMessage.includes('permiso')) return res.status(403).json({ message: errorMessage });
      if (errorMessage.includes('no encontrado') || errorMessage.includes('no encontrada'))
        return res.status(404).json({ message: errorMessage });
      res.status(500).json({ message: errorMessage });
    }
  }

  static async removeSaleItem(req: Request, res: Response) {
    try {
      const currentUser = req.user;
      if (!currentUser) return res.status(401).json({ message: 'No autorizado' });

      const { saleId, itemId } = req.params;

      await serviceContainer.removeSaleItemUseCase.execute(saleId, itemId, currentUser);

      // Obtener la venta completa con relaciones
      const saleWithRelations = await serviceContainer.saleRepository.findWithRelations(saleId);

      if (!saleWithRelations)
        return res.status(500).json({ message: 'Error al obtener la venta actualizada' });

      const salePrisma = saleWithRelations.sale.toPrisma();

      const saleResponse = {
        ...salePrisma,
        client: salePrisma.clientSnapshot ?? null,
        status: saleWithRelations.status ?? null,
        items: saleWithRelations.items.map((i) => i.toPrisma()),
        assignments: saleWithRelations.assignments.map((a) => a.toPrisma()),
        histories: saleWithRelations.histories.map((h) => h.toPrisma()),
      };

      res.status(200).json({ message: 'Item eliminado correctamente', sale: saleResponse });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      if (errorMessage.includes('permiso')) return res.status(403).json({ message: errorMessage });
      if (errorMessage.includes('no encontrado') || errorMessage.includes('no encontrada'))
        return res.status(404).json({ message: errorMessage });
      res.status(500).json({ message: errorMessage });
    }
  }

  static async changeSaleStatus(req: Request, res: Response) {
    try {
      const currentUser = req.user;
      if (!currentUser) return res.status(401).json({ message: 'No autorizado' });

      const { saleId } = req.params;
      const dto = {
        saleId,
        statusId: req.body.statusId,
        comment: req.body.comment,
      };

      const sale = await serviceContainer.changeSaleStatusUseCase.execute(dto, currentUser);

      // Obtener la venta completa con relaciones
      const saleWithRelations = await serviceContainer.saleRepository.findWithRelations(sale.id);

      if (!saleWithRelations)
        return res.status(500).json({ message: 'Error al obtener la venta actualizada' });

      const salePrisma = saleWithRelations.sale.toPrisma();

      const saleResponse = {
        ...salePrisma,
        client: salePrisma.clientSnapshot ?? null,
        status: saleWithRelations.status ?? null,
        items: saleWithRelations.items.map((i) => i.toPrisma()),
        assignments: saleWithRelations.assignments.map((a) => a.toPrisma()),
        histories: saleWithRelations.histories.map((h) => h.toPrisma()),
      };

      res.status(200).json({ message: 'Estado de venta cambiado correctamente', sale: saleResponse });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      if (errorMessage.includes('permiso')) return res.status(403).json({ message: errorMessage });
      if (errorMessage.includes('no encontrado') || errorMessage.includes('no encontrada'))
        return res.status(404).json({ message: errorMessage });
      res.status(500).json({ message: errorMessage });
    }
  }

  static async updateClientSnapshot(req: Request, res: Response) {
    try {
      const currentUser = req.user;
      if (!currentUser) return res.status(401).json({ message: 'No autorizado' });

      const { saleId } = req.params;
      const { clientSnapshot, comercial } = req.body;

      if (!clientSnapshot) {
        return res.status(400).json({ message: 'El clientSnapshot es requerido' });
      }

      const sale = await serviceContainer.updateClientSnapshotUseCase.execute(
        saleId,
        clientSnapshot,
        currentUser,
        comercial
      );

      res.status(200).json({ message: 'Datos del cliente actualizados correctamente', sale });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      if (errorMessage.includes('permiso')) return res.status(403).json({ message: errorMessage });
      if (errorMessage.includes('no encontrado') || errorMessage.includes('no encontrada'))
        return res.status(404).json({ message: errorMessage });
      res.status(500).json({ message: errorMessage });
    }
  }

  static async getSalesStats(req: Request, res: Response) {
    try {
      const currentUser = req.user;
      if (!currentUser) return res.status(401).json({ message: 'No autorizado' });

      const stats = await serviceContainer.getSalesStatsUseCase.execute(currentUser);

      res.status(200).json(stats);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      if (errorMessage.includes('permiso')) return res.status(403).json({ message: errorMessage });
      res.status(500).json({ message: errorMessage });
    }
  }

  static async getComerciales(req: Request, res: Response) {
    try {
      const currentUser = req.user;
      if (!currentUser) return res.status(401).json({ message: 'No autorizado' });

      const comerciales = await serviceContainer.saleRepository.getDistinctComerciales();

      res.status(200).json(comerciales);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      res.status(500).json({ message: errorMessage });
    }
  }
}
