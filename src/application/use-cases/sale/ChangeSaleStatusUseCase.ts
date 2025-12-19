import { Prisma } from '@prisma/client';
import { ISaleRepository } from '@domain/repositories/ISaleRepository';
import { ISaleStatusRepository } from '@domain/repositories/ISaleStatusRepository';
import { ChangeSaleStatusInternal } from '@infrastructure/express/validation/saleSchemas';
import { CurrentUser } from '@application/shared/types/CurrentUser';
import { Sale } from '@domain/entities/Sale';
import { checkRolePermission } from '@application/shared/authorization/checkRolePermission';
import { rolePermissions } from '@application/shared/authorization/rolePermissions';
import { businessSaleStatusChanged } from '@infrastructure/observability/metrics/prometheusMetrics';

export class ChangeSaleStatusUseCase {
  constructor(
    private saleRepo: ISaleRepository,
    private statusRepo: ISaleStatusRepository
  ) {}

  async execute(dto: ChangeSaleStatusInternal, currentUser: CurrentUser): Promise<Sale> {
    checkRolePermission(
      currentUser,
      rolePermissions.sale.ChangeSaleStatusUseCase,
      'cambiar estado de venta'
    );

    const sale = await this.saleRepo.findById(dto.saleId);
    if (!sale) throw new Error('Venta no encontrada');

    const status = await this.statusRepo.findById(dto.statusId);
    if (!status) throw new Error('Estado no encontrado');

    const updated = await this.saleRepo.update(sale.id, {
      statusId: status.id,
      closedAt: status.isFinal ? new Date() : null,
    });

    await this.saleRepo.addHistory({
      saleId: sale.id,
      userId: currentUser.id,
      action: 'change_status',
      payload: {
        from: sale.statusId,
        to: status.id,
        comment: dto.comment ?? null,
      },
    });

    businessSaleStatusChanged.inc();

    return updated;
  }
}
