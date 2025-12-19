import { IProductRepository } from '@domain/repositories/IProductRepository';
import { Product } from '@domain/entities/Product';
import { CurrentUser } from '@application/shared/types/CurrentUser';
import { checkRolePermission } from '@application/shared/authorization/checkRolePermission';
import { rolePermissions } from '@application/shared/authorization/rolePermissions';
import logger from '@infrastructure/observability/logger/logger';
import { ToggleProductActiveDTO } from '@infrastructure/express/validation/productSchemas';
import { businessProductsToggled } from '@infrastructure/observability/metrics/prometheusMetrics';

export class ToggleProductActiveUseCase {
  constructor(private readonly repository: IProductRepository) {}

  async execute(data: ToggleProductActiveDTO, currentUser: CurrentUser): Promise<Product> {
    checkRolePermission(
      currentUser,
      rolePermissions.product.ToggleProductActiveUseCase,
      'activar/desactivar productos'
    );

    logger.info(`Toggling producto ${data.id} — usuario ${currentUser.id}`);

    const existing = await this.repository.findById(data.id);
    if (!existing) throw new Error('Producto no encontrado');

    const toggled = await this.repository.toggleActive(data.id);

    businessProductsToggled.inc();

    logger.info(
      `Producto ${toggled.id} cambiado a estado ${toggled.active ? 'activo' : 'inactivo'}`
    );

    return toggled;
  }
}
