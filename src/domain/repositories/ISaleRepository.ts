import { Prisma } from '@prisma/client';
import { Sale } from '@domain/entities/Sale';
import { SaleItem } from '@domain/entities/SaleItem';
import { SaleHistory } from '@domain/entities/SaleHistory';
import { SaleAssignment } from '@domain/entities/SaleAssignment';
import { PaginationOptions, PaginatedResponse } from '@domain/types';

export interface ISaleRepository {
  create(data: {
    clientId: string;
    statusId: string;
    totalAmount?: number;
    notes?: Prisma.JsonValue | Prisma.JsonNullValueInput;
    metadata?: Prisma.JsonValue | Prisma.JsonNullValueInput;

    // 🔥 NUEVOS CAMPOS PARA SNAPSHOTS
    clientSnapshot: Prisma.JsonValue | Prisma.JsonNullValueInput;
    addressSnapshot: Prisma.JsonValue | Prisma.JsonNullValueInput;
  }): Promise<Sale>;

  findById(id: string): Promise<Sale | null>;

  findWithRelations(id: string): Promise<{
    sale: Sale;
    items: SaleItem[];
    assignments: SaleAssignment[];
    histories: SaleHistory[];
    client?: any | null;
    status?: any | null;
  } | null>;

  list(filters: {
    clientId?: string;
    statusId?: string;
    from?: Date;
    to?: Date;
  }): Promise<Sale[]>;

  /** Listado paginado de ventas */
  listPaginated(
    filters: {
      clientId?: string;
      statusId?: string;
      from?: Date;
      to?: Date;
    },
    pagination: PaginationOptions
  ): Promise<PaginatedResponse<Sale>>;

  update(
    saleId: string,
    data: {
      statusId?: string;
      totalAmount?: number;
      notes?: Prisma.JsonValue | Prisma.JsonNullValueInput;
      metadata?: Prisma.JsonValue | Prisma.JsonNullValueInput;
      closedAt?: Date | null;

      // No se actualizan snapshots (solo lectura)
    }
  ): Promise<Sale>;

  addItem(
    saleId: string,
    data: {
      productId?: string | null;
      nameSnapshot: string;
      skuSnapshot?: string | null;
      unitPrice: number;
      quantity: number;
      finalPrice: number;
    }
  ): Promise<SaleItem>;

  updateItem(
    itemId: string,
    data: {
      unitPrice?: number;
      quantity?: number;
      finalPrice?: number;
    }
  ): Promise<SaleItem>;

  removeItem(itemId: string): Promise<void>;

  updateClientSnapshot(
    saleId: string,
    clientSnapshot: Prisma.JsonValue | Prisma.JsonNullValueInput
  ): Promise<Sale>;

  addHistory(data: {
    saleId: string;
    userId?: string | null;
    action: string;
    payload?: Prisma.JsonValue | Prisma.JsonNullValueInput;
  }): Promise<SaleHistory>;

  assignUser(data: {
    saleId: string;
    userId: string;
    role: string;
  }): Promise<SaleAssignment>;
}
