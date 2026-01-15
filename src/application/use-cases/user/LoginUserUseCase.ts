import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { IUserRepository } from '@domain/repositories/IUserRepository';
import { User } from '@domain/entities/User';
import logger from '@infrastructure/observability/logger/logger';
import { AuthenticationError } from '@application/shared/AppError';

export class LoginUserUseCase {
  constructor(private userRepository: IUserRepository) {}

  async execute(data: {
    username: string;
    password: string;
  }): Promise<{ user: User; accessToken: string; refreshToken: string }> {
    logger.info(`Intento de login: ${data.username}`);

    const user = await this.userRepository.findByUsername(data.username);
    if (!user) {
      logger.warn(`Login fallido - usuario no encontrado: ${data.username}`);
      throw new AuthenticationError('Usuario o contraseña incorrectos');
    }

    const passwordMatches = await bcrypt.compare(data.password, user.password);
    if (!passwordMatches) {
      logger.warn(`Login fallido - contraseña incorrecta: ${data.username}`);
      throw new AuthenticationError('Usuario o contraseña incorrectos');
    }

    if (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET)
      throw new Error('JWT_SECRET o JWT_REFRESH_SECRET no están definidas');

    // Access token
    const accessToken = jwt.sign(
      { id: user.id, role: user.role, firstName: user.firstName, lastName: user.lastName },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    // Refresh token
    const refreshToken = jwt.sign({ id: user.id }, process.env.JWT_REFRESH_SECRET, {
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN,
    });

    const refreshTokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await this.userRepository.saveRefreshToken(user.id, refreshToken, refreshTokenExpiresAt);

    await this.userRepository.updateLastLogin(user.id, new Date());

    // Registrar métricas de login exitoso

    logger.info(`Login exitoso: ${data.username} (${user.id})`);
    return { user, accessToken, refreshToken };
  }
}
