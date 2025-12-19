import { User } from '@domain/entities/User';

export interface IUserRepository {
  create(user: User): Promise<void>;
  update(user: User): Promise<void>;
  updateLastLogin(userId: string, date: Date): Promise<void>;
  findByUsername(username: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  saveRefreshToken(userId: string, token: string, expiresAt: Date): Promise<void>;
  findByRefreshToken(token: string): Promise<User | null>;
  clearRefreshToken(userId: string): Promise<void>;
}
