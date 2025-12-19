import { Recording } from '@domain/entities/Recording';
import { IRecordingRepository } from '@domain/repositories/IRecordingRepository';
import { ISaleRepository } from '@domain/repositories/ISaleRepository';
import { CurrentUser } from '@application/shared/types/CurrentUser';
import { checkRolePermission } from '@application/shared/authorization/checkRolePermission';
import { rolePermissions } from '@application/shared/authorization/rolePermissions';

export class ListRecordingsUseCase {
  constructor(
    private recordingRepo: IRecordingRepository,
    private saleRepo: ISaleRepository
  ) {}

  async execute(saleId: string, currentUser: CurrentUser): Promise<Recording[]> {
    checkRolePermission(
      currentUser,
      rolePermissions.recording.ListRecordingsUseCase,
      'listar grabaciones'
    );

    // Verificar que la venta existe
    const sale = await this.saleRepo.findById(saleId);
    if (!sale) {
      throw new Error('Venta no encontrada');
    }

    return this.recordingRepo.findBySaleId(saleId);
  }
}
