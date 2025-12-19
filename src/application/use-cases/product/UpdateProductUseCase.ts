import { IProductRepository } from '@domain/repositories/IProductRepository';
import { Product } from '@domain/entities/Product';
import { CurrentUser } from '@application/shared/types/CurrentUser';
import { checkRolePermission } from '@application/shared/authorization/checkRolePermission';
import { rolePermissions } from '@application/shared/authorization/rolePermissions';
import logger from '@infrastructure/observability/logger/logger';
import { UpdateProductDTO } from '@infrastructure/express/validation/productSchemas';
import { businessProductsUpdated } from '@infrastructure/observability/metrics/prometheusMetrics';

export class UpdateProductUseCase {
  constructor(private readonly repository: IProductRepository) {}

  async execute(data: UpdateProductDTO, currentUser: CurrentUser): Promise<Product> {
    checkRolePermission(
      currentUser,
      rolePermissions.product.UpdateProductUseCase,
      'actualizar productos'
    );

    logger.info(`Actualizando producto ${data.id} — usuario ${currentUser.id}`);

    const existing = await this.repository.findById(data.id);
    if (!existing) throw new Error('Producto no encontrado');

    const updated = new Product(
      existing.id,
      data.name ?? existing.name,
      data.description ?? existing.description,
      data.sku ?? existing.sku,
      data.price ?? existing.price,
      existing.active,
      existing.createdAt,
      new Date()
    );

    const saved = await this.repository.update(updated.id, updated);

    businessProductsUpdated.inc();

    logger.info(`Producto actualizado ${saved.id}`);

    return saved;
  }
}
