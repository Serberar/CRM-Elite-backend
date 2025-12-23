import { ISaleRepository } from '@domain/repositories/ISaleRepository';
import { ISaleStatusRepository } from '@domain/repositories/ISaleStatusRepository';
import { IProductRepository } from '@domain/repositories/IProductRepository';
import { CurrentUser } from '@application/shared/types/CurrentUser';
import { CreateSaleWithProductsDTO } from '@infrastructure/express/validation/saleSchemas';
import { checkRolePermission } from '@application/shared/authorization/checkRolePermission';
import { rolePermissions } from '@application/shared/authorization/rolePermissions';
import {
  businessSalesCreated,
  businessSaleItemsAdded,
} from '@infrastructure/observability/metrics/prometheusMetrics';
import { Sale } from '@domain/entities/Sale';
import { Prisma } from '@prisma/client';

function safeJson(input: unknown): Prisma.JsonValue | typeof Prisma.JsonNull {
  if (input === null || input === undefined) return Prisma.JsonNull;
  return JSON.parse(JSON.stringify(input)) as Prisma.JsonValue;
}

export class CreateSaleWithProductsUseCase {
  constructor(
    private saleRepo: ISaleRepository,
    private saleStatusRepo: ISaleStatusRepository,
    private productRepo: IProductRepository
  ) {}

  async execute(dto: CreateSaleWithProductsDTO, currentUser: CurrentUser): Promise<Sale> {
    checkRolePermission(
      currentUser,
      rolePermissions.sale.CreateSaleWithProductsUseCase,
      'crear venta con productos'
    );

    // Obtener status inicial si no viene en DTO
    let statusId = dto.statusId;
    if (!statusId) {
      const initialStatus = await this.saleStatusRepo.findInitialStatus();
      if (!initialStatus) {
        throw new Error('No se encontró un estado inicial para las ventas');
      }
      statusId = initialStatus.id;
    }

    const clientSnapshot = safeJson(dto.client);
    const addressSnapshot = safeJson(dto.client?.address ?? null);

    const sale = await this.saleRepo.create({
      clientId: dto.client.id,
      statusId,
      notes: safeJson(dto.notes ?? null),
      metadata: safeJson(dto.metadata ?? null),
      clientSnapshot,
      addressSnapshot,
      comercial: dto.comercial ?? null,
    });

    let total = 0;

    // Si dto.items está vacío o undefined, skip loop
    const items = Array.isArray(dto.items) ? dto.items : [];

    for (const item of items) {
      let skuSnapshot: string | null = null;
      const unitPrice = Number(item.price ?? 0);
      const quantity = Number(item.quantity ?? 0);
      const finalPrice = unitPrice * quantity;

      if (item.productId) {
        const product = await this.productRepo.findById(item.productId);
        if (!product) {
          throw new Error(`Producto con ID ${item.productId} no encontrado`);
        }
        skuSnapshot = product.sku ?? null;
      }

      await this.saleRepo.addItem(sale.id, {
        productId: item.productId,
        nameSnapshot: item.name,
        skuSnapshot,
        unitPrice,
        quantity,
        finalPrice,
      });

      total += finalPrice;
    }

    // actualizar total
    await this.saleRepo.update(sale.id, { totalAmount: total });

    const payload = safeJson({
      client: dto.client,
      items: dto.items,
      statusId: dto.statusId,
      notes: dto.notes,
      metadata: dto.metadata,
    });

    await this.saleRepo.addHistory({
      saleId: sale.id,
      userId: currentUser.id,
      action: 'create_sale',
      payload,
    });

    businessSalesCreated.inc();
    businessSaleItemsAdded.inc(items.length);

    const saleWithRelations = await this.saleRepo.findWithRelations(sale.id);
    if (!saleWithRelations) {
      throw new Error('Error al obtener la venta creada');
    }

    return saleWithRelations.sale;
  }
}
