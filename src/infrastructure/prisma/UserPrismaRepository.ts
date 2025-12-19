import { prisma } from '@infrastructure/prisma/prismaClient';
import { IUserRepository } from '@domain/repositories/IUserRepository';
import { User } from '@domain/entities/User';
import { dbCircuitBreaker } from '@infrastructure/resilience';

export class UserPrismaRepository implements IUserRepository {
  async create(user: User): Promise<void> {
    await dbCircuitBreaker.execute(() =>
      prisma.user.create({ data: user.toPrisma() })
    );
  }

  async update(user: User): Promise<void> {
    await dbCircuitBreaker.execute(() =>
      prisma.user.update({
        where: { id: user.id },
        data: user.toPrisma(),
      })
    );
  }

  async updateLastLogin(userId: string, date: Date): Promise<void> {
    await dbCircuitBreaker.execute(() =>
      prisma.user.update({
        where: { id: userId },
        data: { lastLoginAt: date },
      })
    );
  }

  async findByUsername(username: string): Promise<User | null> {
    const userData = await dbCircuitBreaker.execute(() =>
      prisma.user.findUnique({ where: { username } })
    );
    return userData ? User.fromPrisma(userData) : null;
  }

  async findById(id: string): Promise<User | null> {
    const userData = await dbCircuitBreaker.execute(() =>
      prisma.user.findUnique({ where: { id } })
    );
    return userData ? User.fromPrisma(userData) : null;
  }

  async saveRefreshToken(userId: string, token: string, expiresAt: Date): Promise<void> {
    await dbCircuitBreaker.execute(() =>
      prisma.user.update({
        where: { id: userId },
        data: { refreshToken: token, refreshTokenExpiresAt: expiresAt },
      })
    );
  }

  async findByRefreshToken(token: string): Promise<User | null> {
    const userData = await dbCircuitBreaker.execute(() =>
      prisma.user.findFirst({ where: { refreshToken: token } })
    );
    return userData ? User.fromPrisma(userData) : null;
  }

  async clearRefreshToken(userId: string): Promise<void> {
    await dbCircuitBreaker.execute(() =>
      prisma.user.update({
        where: { id: userId },
        data: { refreshToken: null, refreshTokenExpiresAt: null },
      })
    );
  }
}
