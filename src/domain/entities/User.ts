import { Role } from '@prisma/client';

export class User {
  constructor(
    public readonly id: string,
    public readonly firstName: string,
    public readonly lastName: string,
    public readonly username: string,
    public readonly password: string,
    public readonly role: string,
    public readonly lastLoginAt: Date | null = null,
    public readonly refreshToken?: string,
    public readonly refreshTokenExpiresAt?: Date
  ) {}

  static fromPrisma(data: {
    id: string;
    firstName: string;
    lastName: string;
    username: string;
    password: string;
    role: Role;
    lastLoginAt: Date | null;
    refreshToken: string | null;
    refreshTokenExpiresAt: Date | null;
  }): User {
    return new User(
      data.id,
      data.firstName,
      data.lastName,
      data.username,
      data.password,
      data.role,
      data.lastLoginAt,
      data.refreshToken ?? undefined,
      data.refreshTokenExpiresAt ?? undefined
    );
  }

  toPrisma(): {
    id: string;
    firstName: string;
    lastName: string;
    username: string;
    password: string;
    role: Role;
    lastLoginAt?: Date;
    refreshToken?: string;
    refreshTokenExpiresAt?: Date;
  } {
    return {
      id: this.id,
      firstName: this.firstName,
      lastName: this.lastName,
      username: this.username,
      password: this.password,
      role: this.role as Role,
      lastLoginAt: this.lastLoginAt ?? undefined,
      refreshToken: this.refreshToken,
      refreshTokenExpiresAt: this.refreshTokenExpiresAt ?? undefined,
    };
  }
}
