import { ISaleStatusRepository } from '@domain/repositories/ISaleStatusRepository';
import { UpdateSaleStatusDTO } from '@infrastructure/express/validation/saleStatusSchemas';
import { CurrentUser } from '@application/shared/types/CurrentUser';
import { checkRolePermission } from '@application/shared/authorization/checkRolePermission';
import { rolePermissions } from '@application/shared/authorization/rolePermissions';

export class UpdateSaleStatusUseCase {
  constructor(private statusRepo: ISaleStatusRepository) {}

  async execute(dto: UpdateSaleStatusDTO, currentUser: CurrentUser) {
    checkRolePermission(
      currentUser,
      rolePermissions.saleStatus.UpdateSaleStatusUseCase,
      'actualizar estado de venta'
    );

    return await this.statusRepo.update(dto.id, {
      name: dto.name,
      color: dto.color ?? null,
      isFinal: dto.isFinal,
      isCancelled: dto.isCancelled,
    });
  }
}
