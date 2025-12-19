import { Recording } from '@domain/entities/Recording';
import { IRecordingRepository } from '@domain/repositories/IRecordingRepository';
import { CurrentUser } from '@application/shared/types/CurrentUser';
import { checkRolePermission } from '@application/shared/authorization/checkRolePermission';
import { rolePermissions } from '@application/shared/authorization/rolePermissions';

export class DownloadRecordingUseCase {
  constructor(private recordingRepo: IRecordingRepository) {}

  async execute(recordingId: string, currentUser: CurrentUser): Promise<Recording> {
    checkRolePermission(
      currentUser,
      rolePermissions.recording.DownloadRecordingUseCase,
      'descargar grabación'
    );

    const recording = await this.recordingRepo.findById(recordingId);
    if (!recording) {
      throw new Error('Grabación no encontrada');
    }

    return recording;
  }
}
