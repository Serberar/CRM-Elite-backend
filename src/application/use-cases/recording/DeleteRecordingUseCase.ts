import fs from 'fs';
import path from 'path';
import { IRecordingRepository } from '@domain/repositories/IRecordingRepository';
import { ISaleRepository } from '@domain/repositories/ISaleRepository';
import { CurrentUser } from '@application/shared/types/CurrentUser';
import { checkRolePermission } from '@application/shared/authorization/checkRolePermission';
import { rolePermissions } from '@application/shared/authorization/rolePermissions';

const RECORDS_DIR = process.env.RECORDS_PATH || './records';

export class DeleteRecordingUseCase {
  constructor(
    private recordingRepo: IRecordingRepository,
    private saleRepo: ISaleRepository
  ) {}

  async execute(recordingId: string, currentUser: CurrentUser): Promise<void> {
    checkRolePermission(
      currentUser,
      rolePermissions.recording.DeleteRecordingUseCase,
      'eliminar grabación'
    );

    const recording = await this.recordingRepo.findById(recordingId);
    if (!recording) {
      throw new Error('Grabación no encontrada');
    }

    // Eliminar archivo del filesystem
    const filePath = path.join(RECORDS_DIR, recording.storagePath);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Eliminar registro de BD
    await this.recordingRepo.delete(recordingId);

    // Registrar en historial
    await this.saleRepo.addHistory({
      saleId: recording.saleId,
      userId: currentUser.id,
      action: 'delete_recording',
      payload: {
        recordingId: recording.id,
        filename: recording.filename,
      },
    });
  }
}
