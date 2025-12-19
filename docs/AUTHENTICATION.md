# Authentication & Authorization Guide

Guía completa del sistema de autenticación y autorización del Backend CRM Elite.

## 📋 Tabla de Contenidos

- [Arquitectura de Autenticación](#arquitectura-de-autenticación)
- [JWT Tokens](#jwt-tokens)
- [Flujo de Autenticación](#flujo-de-autenticación)
- [Sistema de Roles](#sistema-de-roles)
- [Middleware de Autorización](#middleware-de-autorización)
- [Seguridad](#seguridad)
- [Troubleshooting](#troubleshooting)

---

## 🏗️ Arquitectura de Autenticación

El sistema utiliza **JWT (JSON Web Tokens)** con dos tipos de tokens:

1. **Access Token**: De corta duración (15 minutos), usado para autenticar requests
2. **Refresh Token**: De larga duración (7 días), usado para obtener nuevos access tokens

### Ventajas de este enfoque

- ✅ **Seguridad**: Access tokens de corta duración limitan ventana de exposición
- ✅ **UX**: Refresh tokens evitan logins frecuentes
- ✅ **Stateless**: No requiere sesiones en servidor
- ✅ **Escalabilidad**: Los tokens son verificables sin consultar BD

---

## 🔑 JWT Tokens

### Estructura de Access Token

```json
{
  "header": {
    "alg": "HS256",
    "typ": "JWT"
  },
  "payload": {
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "username": "juan.perez",
    "role": "administrador",
    "iat": 1701615600,
    "exp": 1701616500
  },
  "signature": "..."
}
```

**Payload incluye:**
- `userId`: ID único del usuario
- `username`: Nombre de usuario
- `role`: Rol del usuario (para autorización)
- `iat`: Timestamp de emisión
- `exp`: Timestamp de expiración

### Estructura de Refresh Token

```json
{
  "payload": {
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "type": "refresh",
    "iat": 1701615600,
    "exp": 1702220400
  }
}
```

### Configuración

Configurado en variables de entorno:

```env
JWT_SECRET="tu-secret-super-seguro-aqui"
JWT_REFRESH_SECRET="tu-refresh-secret-diferente"
JWT_EXPIRATION="15m"
JWT_REFRESH_EXPIRATION="7d"
```

⚠️ **Importante**: Los secrets deben ser diferentes y de al menos 32 caracteres.

---

## 🔄 Flujo de Autenticación

### 1. Registro de Usuario

```
┌─────────┐           ┌─────────┐           ┌──────────┐
│ Cliente │           │ Backend │           │ Database │
└────┬────┘           └────┬────┘           └────┬─────┘
     │                     │                     │
     │ POST /register      │                     │
     ├────────────────────>│                     │
     │  { username,        │                     │
     │    password,        │                     │
     │    role, ... }      │                     │
     │                     │                     │
     │                     │ Hash password       │
     │                     │ (bcrypt)            │
     │                     │                     │
     │                     │ INSERT user         │
     │                     ├────────────────────>│
     │                     │                     │
     │                     │<────────────────────┤
     │                     │ User created        │
     │                     │                     │
     │                     │ Generate tokens     │
     │                     │ (JWT)               │
     │                     │                     │
     │                     │ Save refreshToken   │
     │                     ├────────────────────>│
     │                     │                     │
     │<────────────────────┤                     │
     │ 201 Created         │                     │
     │ { user,             │                     │
     │   accessToken,      │                     │
     │   refreshToken }    │                     │
     │                     │                     │
```

**Validaciones aplicadas:**
- Username único
- Password mínimo 8 caracteres con mayúsculas, minúsculas y números
- Role válido
- Email formato válido

### 2. Login (Inicio de Sesión)

```
┌─────────┐           ┌─────────┐           ┌──────────┐
│ Cliente │           │ Backend │           │ Database │
└────┬────┘           └────┬────┘           └────┬─────┘
     │                     │                     │
     │ POST /login         │                     │
     ├────────────────────>│                     │
     │  { username,        │                     │
     │    password }       │                     │
     │                     │                     │
     │                     │ SELECT user         │
     │                     ├────────────────────>│
     │                     │<────────────────────┤
     │                     │                     │
     │                     │ Compare password    │
     │                     │ (bcrypt.compare)    │
     │                     │                     │
     │                     │ Generate tokens     │
     │                     │                     │
     │                     │ UPDATE lastLoginAt  │
     │                     │ + refreshToken      │
     │                     ├────────────────────>│
     │                     │                     │
     │<────────────────────┤                     │
     │ 200 OK              │                     │
     │ { user,             │                     │
     │   accessToken,      │                     │
     │   refreshToken }    │                     │
     │                     │                     │
```

### 3. Request Autenticado

```
┌─────────┐           ┌─────────────┐       ┌────────────┐
│ Cliente │           │  Middleware │       │ Controller │
└────┬────┘           └──────┬──────┘       └─────┬──────┘
     │                       │                     │
     │ GET /api/products     │                     │
     │ Authorization:        │                     │
     │ Bearer <token>        │                     │
     ├──────────────────────>│                     │
     │                       │                     │
     │                       │ Verify token        │
     │                       │ jwt.verify()        │
     │                       │                     │
     │                       │ Decode payload      │
     │                       │ Extract user info   │
     │                       │                     │
     │                       │ Add to req.user     │
     │                       │                     │
     │                       │ Check permissions   │
     │                       │ (role-based)        │
     │                       │                     │
     │                       ├────────────────────>│
     │                       │                     │
     │                       │                     │ Execute
     │                       │                     │ use case
     │                       │                     │
     │                       │<────────────────────┤
     │<──────────────────────┤                     │
     │ 200 OK                │                     │
     │ { data }              │                     │
     │                       │                     │
```

### 4. Refresh Token Flow

```
┌─────────┐           ┌─────────┐           ┌──────────┐
│ Cliente │           │ Backend │           │ Database │
└────┬────┘           └────┬────┘           └────┬─────┘
     │                     │                     │
     │ Access token expired│                     │
     │ (401 response)      │                     │
     │                     │                     │
     │ POST /refresh       │                     │
     ├────────────────────>│                     │
     │  { refreshToken }   │                     │
     │                     │                     │
     │                     │ Verify refresh      │
     │                     │ token               │
     │                     │                     │
     │                     │ SELECT user by      │
     │                     │ refreshToken        │
     │                     ├────────────────────>│
     │                     │<────────────────────┤
     │                     │                     │
     │                     │ Check expiration    │
     │                     │                     │
     │                     │ Generate new tokens │
     │                     │                     │
     │                     │ UPDATE refreshToken │
     │                     ├────────────────────>│
     │                     │                     │
     │<────────────────────┤                     │
     │ 200 OK              │                     │
     │ { accessToken,      │                     │
     │   refreshToken }    │                     │
     │                     │                     │
```

### 5. Logout

```
┌─────────┐           ┌─────────┐           ┌──────────┐
│ Cliente │           │ Backend │           │ Database │
└────┬────┘           └────┬────┘           └────┬─────┘
     │                     │                     │
     │ POST /logout        │                     │
     ├────────────────────>│                     │
     │  { userId }         │                     │
     │  + Bearer token     │                     │
     │                     │                     │
     │                     │ Verify token        │
     │                     │                     │
     │                     │ CLEAR refreshToken  │
     │                     ├────────────────────>│
     │                     │<────────────────────┤
     │                     │                     │
     │<────────────────────┤                     │
     │ 200 OK              │                     │
     │ { message }         │                     │
     │                     │                     │
     │ Clear local tokens  │                     │
     │                     │                     │
```

---

## 👥 Sistema de Roles

### Roles Disponibles

| Rol | Descripción | Nivel de Acceso |
|-----|-------------|----------------|
| **administrador** | Acceso completo al sistema | 🔴 Alto |
| **coordinador** | Gestión de ventas y clientes | 🟠 Medio-Alto |
| **verificador** | Validación y lectura de ventas | 🟡 Medio |
| **comercial** | Crear ventas, gestionar clientes | 🟢 Básico |

### Permisos por Módulo

#### Productos

| Acción | Administrador | Coordinador | Verificador | Comercial |
|--------|--------------|-------------|-------------|-----------|
| Listar | ✅ | ✅ | ✅ | ✅ |
| Ver detalle | ✅ | ✅ | ✅ | ✅ |
| Crear | ✅ | ❌ | ❌ | ❌ |
| Editar | ✅ | ❌ | ❌ | ❌ |
| Activar/Desactivar | ✅ | ❌ | ❌ | ❌ |
| Duplicar | ✅ | ❌ | ❌ | ❌ |

#### Clientes

| Acción | Administrador | Coordinador | Verificador | Comercial |
|--------|--------------|-------------|-------------|-----------|
| Buscar | ✅ | ✅ | ✅ | ✅ |
| Crear | ✅ | ✅ | ❌ | ✅ |
| Editar | ✅ | ✅ | ❌ | ✅* |
| Añadir datos | ✅ | ✅ | ❌ | ✅* |

\* Solo sus propios clientes

#### Ventas

| Acción | Administrador | Coordinador | Verificador | Comercial |
|--------|--------------|-------------|-------------|-----------|
| Listar | ✅ (todas) | ✅ (todas) | ✅ (todas) | ✅ (propias) |
| Crear | ✅ | ✅ | ❌ | ✅ |
| Añadir items | ✅ | ✅ | ❌ | ✅* |
| Editar items | ✅ | ✅ | ❌ | ✅* |
| Eliminar items | ✅ | ✅ | ❌ | ✅* |
| Cambiar estado | ✅ | ✅ | ✅ | ❌ |

\* Solo sus propias ventas

#### Estados de Venta

| Acción | Administrador | Coordinador | Verificador | Comercial |
|--------|--------------|-------------|-------------|-----------|
| Listar | ✅ | ✅ | ✅ | ✅ |
| Crear | ✅ | ❌ | ❌ | ❌ |
| Editar | ✅ | ❌ | ❌ | ❌ |
| Reordenar | ✅ | ❌ | ❌ | ❌ |

#### Usuarios

| Acción | Administrador | Coordinador | Verificador | Comercial |
|--------|--------------|-------------|-------------|-----------|
| Crear | ✅ | ❌ | ❌ | ❌ |
| Listar | ✅ | ❌ | ❌ | ❌ |
| Editar | ✅ | ❌ | ❌ | ❌ |
| Eliminar | ✅ | ❌ | ❌ | ❌ |

---

## 🛡️ Middleware de Autorización

### Auth Middleware

Verifica que el usuario esté autenticado:

```typescript
// src/infrastructure/express/middleware/authMiddleware.ts
export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: 'No autorizado' });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;

    // Añadir usuario al request
    req.user = {
      id: decoded.userId,
      role: decoded.role,
      username: decoded.username,
    };

    next();
  } catch (error) {
    return res.status(401).json({ message: 'Token inválido' });
  }
};
```

### Role Permission Check

Verifica permisos basados en rol:

```typescript
// src/application/shared/authorization/checkRolePermission.ts
export function checkRolePermission(
  action: string,
  userRole: string
): boolean {
  const allowedRoles = rolePermissions[action];

  if (!allowedRoles) {
    throw new Error(`Acción '${action}' no tiene permisos configurados`);
  }

  return allowedRoles.includes(userRole);
}
```

### Uso en Controllers

```typescript
export class ProductController {
  static async createProduct(req: Request, res: Response) {
    // Verificar autenticación (ya hecho por middleware)
    if (!req.user) {
      return res.status(401).json({ message: 'No autorizado' });
    }

    // Verificar permisos
    const hasPermission = checkRolePermission(
      'CreateProductUseCase',
      req.user.role
    );

    if (!hasPermission) {
      return res.status(403).json({ message: 'No tiene permiso' });
    }

    // Ejecutar use case...
  }
}
```

---

## 🔒 Seguridad

### Hashing de Contraseñas

Utilizamos **bcrypt** con salt rounds = 10:

```typescript
// Al registrar
const hashedPassword = await bcrypt.hash(password, 10);

// Al validar login
const isValid = await bcrypt.compare(password, user.password);
```

### Protección contra Ataques

#### 1. Brute Force Protection

- Rate limiting en rutas de auth (5 intentos/minuto)
- Bloqueo temporal tras intentos fallidos

#### 2. JWT Security

- Tokens firmados con HS256
- Secrets robustos (32+ caracteres)
- Tokens de corta duración
- Refresh tokens rotan en cada uso

#### 3. XSS Protection

- Helmet middleware configurado
- Sanitización de inputs
- Validación con Zod

#### 4. CORS

- Configuración restrictiva
- Whitelist de orígenes permitidos

#### 5. SQL Injection

- Prisma ORM previene inyecciones SQL
- Validación de tipos

### Headers de Seguridad

```typescript
// Configurados vía Helmet
app.use(helmet({
  contentSecurityPolicy: true,
  xssFilter: true,
  noSniff: true,
  hsts: true,
  frameguard: { action: 'deny' }
}));
```

---

## 🐛 Troubleshooting

### Error: "Token inválido"

**Causas comunes:**
- Token expirado
- Secret incorrecto
- Token malformado

**Solución:**
```typescript
// Frontend: Intentar refresh token
try {
  await refreshAccessToken();
  // Reintentar request
} catch {
  // Redirigir a login
  window.location.href = '/login';
}
```

### Error: "No tiene permiso"

**Causa:**
- Usuario no tiene rol adecuado

**Solución:**
- Verificar rol del usuario
- Revisar matriz de permisos
- Contactar administrador para cambio de rol

### Error: "Refresh token expirado"

**Causa:**
- Usuario inactivo >7 días

**Solución:**
```typescript
// Frontend: Forzar re-login
localStorage.clear();
window.location.href = '/login';
```

### Error: "Usuario no encontrado"

**Causa:**
- Token válido pero usuario eliminado de BD

**Solución:**
```typescript
// Backend: Verificar usuario existe al validar token
const user = await userRepository.findById(decoded.userId);
if (!user) {
  throw new Error('Usuario no encontrado');
}
```

---

## 📝 Mejores Prácticas

### Frontend

1. **Nunca almacenar contraseñas**
```typescript
// ❌ MAL
localStorage.setItem('password', password);

// ✅ BIEN
// Solo almacenar tokens
localStorage.setItem('accessToken', token);
```

2. **Manejar expiración de tokens**
```typescript
// Interceptor automático de axios
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Intentar refresh
      await refreshToken();
      // Reintentar request original
    }
  }
);
```

3. **Limpiar tokens al logout**
```typescript
const logout = async () => {
  await apiClient.post('/users/logout');
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
};
```

### Backend

1. **No exponer información sensible**
```typescript
// ❌ MAL
res.json({ user: userFromDB }); // Incluye password hash

// ✅ BIEN
const { password, refreshToken, ...safeUser } = userFromDB;
res.json({ user: safeUser });
```

2. **Validar siempre el rol en use cases**
```typescript
export class CreateProductUseCase {
  async execute(data: CreateProductDTO, currentUser: CurrentUser) {
    // Verificar permisos
    if (!hasPermission('CreateProductUseCase', currentUser.role)) {
      throw new Error('No tiene permiso');
    }
    // ...
  }
}
```

3. **Rotar refresh tokens**
```typescript
// Cada vez que se usa un refresh token, generar uno nuevo
const newRefreshToken = generateRefreshToken(userId);
await userRepository.saveRefreshToken(userId, newRefreshToken);
```

---

## 📚 Referencias

- **JWT.io**: https://jwt.io/
- **bcrypt**: https://github.com/kelektiv/node.bcrypt.js
- **OWASP Auth Cheatsheet**: https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html

---

**¿Preguntas?** Consulta [API.md](API.md) para ejemplos de uso o [FRONTEND_GUIDE.md](FRONTEND_GUIDE.md) para integración.
