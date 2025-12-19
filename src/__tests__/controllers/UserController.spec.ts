import { UserController } from '@infrastructure/express/controllers/UserController';
import { Request, Response } from 'express';
import { RegisterUserUseCase } from '@application/use-cases/user/RegisterUserUseCase';
import { LoginUserUseCase } from '@application/use-cases/user/LoginUserUseCase';
import { RefreshTokenUseCase } from '@application/use-cases/user/RefreshTokenUseCase';
import { LogoutUserUseCase } from '@application/use-cases/user/LogoutUserUseCase';
import { User } from '@domain/entities/User';

jest.mock('@application/use-cases/user/RegisterUserUseCase');
jest.mock('@application/use-cases/user/LoginUserUseCase');
jest.mock('@application/use-cases/user/RefreshTokenUseCase');
jest.mock('@application/use-cases/user/LogoutUserUseCase');

describe('UserController', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let statusMock: jest.Mock;
  let jsonMock: jest.Mock;

  const mockUser: User = {
    id: 'user-1',
    firstName: 'Juan',
    lastName: 'Pérez',
    username: 'juan123',
    password: 'hashed',
    role: 'administrador',
    lastLoginAt: null,
    toPrisma: () => ({}),
  } as any;

  beforeEach(() => {
    statusMock = jest.fn().mockReturnThis();
    jsonMock = jest.fn();

    req = {
      body: {},
      get: jest.fn().mockReturnValue('application/json'), // Mock del método get()
      headers: {},
      method: 'POST',
      url: '/api/users/logout',
    };
    res = { status: statusMock, json: jsonMock };
    jest.clearAllMocks();
  });

  // REGISTER
  it('register: debería registrar un usuario correctamente', async () => {
    (RegisterUserUseCase.prototype.execute as jest.Mock).mockResolvedValue(mockUser);
    req.body = {
      firstName: 'Juan',
      lastName: 'Pérez',
      username: 'juan123',
      password: '123456',
      role: 'administrador',
    };

    await UserController.register(req as Request, res as Response);

    expect(
      RegisterUserUseCase.prototype.execute as jest.MockedFunction<
        typeof RegisterUserUseCase.prototype.execute
      >
    ).toHaveBeenCalledWith(req.body);
    expect(statusMock as jest.MockedFunction<typeof statusMock>).toHaveBeenCalledWith(201);
    expect(jsonMock as jest.MockedFunction<typeof jsonMock>).toHaveBeenCalledWith({
      id: mockUser.id,
      username: mockUser.username,
    });
  });

  it('register: debería devolver 400 si hay error', async () => {
    (RegisterUserUseCase.prototype.execute as jest.Mock).mockRejectedValue(
      new Error('Error registro')
    );
    req.body = {};

    await UserController.register(req as Request, res as Response);

    expect(statusMock as jest.MockedFunction<typeof statusMock>).toHaveBeenCalledWith(400);
    expect(jsonMock as jest.MockedFunction<typeof jsonMock>).toHaveBeenCalledWith({
      error: 'Error registro',
    });
  });

  // LOGIN
  it('login: debería iniciar sesión correctamente y devolver tokens', async () => {
    const mockTokens = {
      user: mockUser,
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    };
    (LoginUserUseCase.prototype.execute as jest.Mock).mockResolvedValue(mockTokens);
    req.body = { username: 'juan123', password: '123456' };

    await UserController.login(req as Request, res as Response);

    expect(
      LoginUserUseCase.prototype.execute as jest.MockedFunction<
        typeof LoginUserUseCase.prototype.execute
      >
    ).toHaveBeenCalledWith({
      username: 'juan123',
      password: '123456',
    });
    expect(statusMock as jest.MockedFunction<typeof statusMock>).toHaveBeenCalledWith(200);
    expect(jsonMock as jest.MockedFunction<typeof jsonMock>).toHaveBeenCalledWith({
      id: mockUser.id,
      username: mockUser.username,
      firstName: mockUser.firstName,
      lastName: mockUser.lastName,
      role: mockUser.role,
      accessToken: 'access-token',
      refreshToken: 'refresh-token', // Se devuelve en el JSON, no en cookies
    });
  });

  it('login: debería devolver 401 si hay error', async () => {
    (LoginUserUseCase.prototype.execute as jest.Mock).mockRejectedValue(new Error('Error login'));
    req.body = { username: 'juan123', password: '123456' };

    await UserController.login(req as Request, res as Response);

    expect(statusMock as jest.MockedFunction<typeof statusMock>).toHaveBeenCalledWith(401);
    expect(jsonMock as jest.MockedFunction<typeof jsonMock>).toHaveBeenCalledWith({
      error: 'Error login',
    });
  });

  // REFRESH
  it('refresh: debería devolver un nuevo access token', async () => {
    (RefreshTokenUseCase.prototype.execute as jest.Mock).mockResolvedValue({
      accessToken: 'newAccessToken',
      user: mockUser,
    });
    req.body = { refreshToken: 'valid-refresh-token' };

    await UserController.refresh(req as Request, res as Response);

    expect(
      RefreshTokenUseCase.prototype.execute as jest.MockedFunction<
        typeof RefreshTokenUseCase.prototype.execute
      >
    ).toHaveBeenCalledWith('valid-refresh-token');
    expect(statusMock as jest.MockedFunction<typeof statusMock>).toHaveBeenCalledWith(200);
    expect(jsonMock as jest.MockedFunction<typeof jsonMock>).toHaveBeenCalledWith({
      accessToken: 'newAccessToken',
    });
  });

  it('refresh: debería devolver 401 si no hay token o es inválido', async () => {
    (RefreshTokenUseCase.prototype.execute as jest.Mock).mockRejectedValue(
      new Error('Refresh token inválido')
    );
    req.body = {}; // Sin refreshToken en el body

    await UserController.refresh(req as Request, res as Response);

    expect(statusMock as jest.MockedFunction<typeof statusMock>).toHaveBeenCalledWith(401);
    expect(jsonMock as jest.MockedFunction<typeof jsonMock>).toHaveBeenCalledWith({
      error: 'Refresh token no enviado',
    });
  });

  // LOGOUT
  it('logout: debería limpiar refreshToken y devolver 200 si el token es válido', async () => {
    (LogoutUserUseCase.prototype.execute as jest.Mock).mockResolvedValue(undefined);
    req.body = { refreshToken: 'valid-refresh-token' };

    await UserController.logout(req as Request, res as Response);

    expect(
      LogoutUserUseCase.prototype.execute as jest.MockedFunction<
        typeof LogoutUserUseCase.prototype.execute
      >
    ).toHaveBeenCalledWith('valid-refresh-token');
    expect(statusMock as jest.MockedFunction<typeof statusMock>).toHaveBeenCalledWith(200);
    expect(jsonMock as jest.MockedFunction<typeof jsonMock>).toHaveBeenCalledWith({
      message: 'Sesión cerrada',
    });
  });

  it('logout: debería devolver 200 incluso si no hay refreshToken', async () => {
    (LogoutUserUseCase.prototype.execute as jest.Mock).mockResolvedValue(undefined);
    req.body = {}; // Sin refreshToken

    await UserController.logout(req as Request, res as Response);

    expect(statusMock as jest.MockedFunction<typeof statusMock>).toHaveBeenCalledWith(200);
    expect(jsonMock as jest.MockedFunction<typeof jsonMock>).toHaveBeenCalledWith({
      message: 'Sesión cerrada',
    });
  });
});
