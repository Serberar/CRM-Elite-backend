import jwt from 'jsonwebtoken';
import { IUserRepository } from '@domain/repositories/IUserRepository';

export class RefreshTokenUseCase {
  constructor(private userRepository: IUserRepository) {}

  async execute(refreshToken: string) {
    if (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET)
      throw new Error('JWT_SECRET o JWT_REFRESH_SECRET no definido');

    try {
      const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET) as {
        id: string;
        role: string;
        firstName: string;
      };
      const user = await this.userRepository.findById(payload.id);

      if (!user || user.refreshToken !== refreshToken) {
        throw new Error('Token inválido');
      }

      const accessToken = jwt.sign(
        { id: user.id, role: user.role, firstName: user.firstName },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN }
      );

      return { accessToken, user };
    } catch (err: unknown) {
      if (err instanceof Error && err.message === 'Token inválido') {
        throw err;
      }
      throw new Error('Refresh token inválido o expirado');
    }
  }
}
