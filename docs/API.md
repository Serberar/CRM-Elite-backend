# API Documentation - Backend CRM Elite

Documentación completa de todos los endpoints del API, incluyendo payloads, respuestas y códigos de error.

**Base URL**: `http://localhost:3000/api`

## 📋 Tabla de Contenidos

- [Autenticación](#autenticación)
- [Usuarios](#usuarios)
- [Productos](#productos)
- [Clientes](#clientes)
- [Estados de Venta](#estados-de-venta)
- [Ventas](#ventas)
- [Health Check](#health-check)
- [Códigos de Error](#códigos-de-error)

## 🔐 Autenticación

Todas las rutas (excepto registro y login) requieren autenticación mediante JWT token en el header:

```http
Authorization: Bearer <tu-access-token>
```

### Flujo de Autenticación

1. **Registro** o **Login** → Obtener `accessToken` y `refreshToken`
2. Incluir `accessToken` en header Authorization
3. Cuando el `accessToken` expire (15 min), usar `refreshToken` para obtener nuevo token
4. **Logout** para invalidar tokens

---

## 👤 Usuarios

### Registrar Usuario

Crea un nuevo usuario en el sistema.

```http
POST /api/users/register
```

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "username": "juan.perez",
  "password": "Password123!",
  "firstName": "Juan",
  "lastName": "Pérez",
  "role": "comercial"
}
```

**Validaciones:**
- `username`: 3-50 caracteres, solo letras, números, guiones y puntos
- `password`: Mínimo 8 caracteres, debe incluir mayúsculas, minúsculas y números
- `firstName`: 2-100 caracteres
- `lastName`: 2-100 caracteres
- `role`: Debe ser uno de: `administrador`, `coordinador`, `verificador`, `comercial`

**Respuesta exitosa (201):**
```json
{
  "message": "Usuario registrado correctamente",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "username": "juan.perez",
    "firstName": "Juan",
    "lastName": "Pérez",
    "role": "comercial"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Errores posibles:**
- `400` - Validación fallida
- `409` - Usuario ya existe
- `500` - Error del servidor

---

### Iniciar Sesión

Autentica un usuario y retorna tokens.

```http
POST /api/users/login
```

**Body:**
```json
{
  "username": "juan.perez",
  "password": "Password123!"
}
```

**Respuesta exitosa (200):**
```json
{
  "message": "Login exitoso",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "username": "juan.perez",
    "firstName": "Juan",
    "lastName": "Pérez",
    "role": "comercial",
    "lastLoginAt": "2024-12-03T14:30:00.000Z"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Errores:**
- `400` - Campos requeridos faltantes
- `401` - Credenciales inválidas
- `500` - Error del servidor

---

### Refrescar Token

Obtiene un nuevo access token usando el refresh token.

```http
POST /api/users/refresh
```

**Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Respuesta exitosa (200):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

### Cerrar Sesión

Invalida los tokens del usuario.

```http
POST /api/users/logout
```

**Headers:**
```
Authorization: Bearer <access-token>
```

**Body:**
```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Respuesta exitosa (200):**
```json
{
  "message": "Logout exitoso"
}
```

---

## 📦 Productos

### Listar Productos

Obtiene todos los productos activos e inactivos.

```http
GET /api/products
```

**Headers:**
```
Authorization: Bearer <access-token>
```

**Permisos:** `administrador`, `coordinador`, `verificador`, `comercial`

**Respuesta exitosa (200):**
```json
[
  {
    "id": "prod-001",
    "name": "Laptop Dell XPS 15",
    "description": "Laptop profesional de alto rendimiento",
    "sku": "DELL-XPS15-001",
    "price": 1299.99,
    "active": true,
    "createdAt": "2024-01-15T10:00:00.000Z",
    "updatedAt": "2024-01-15T10:00:00.000Z"
  },
  {
    "id": "prod-002",
    "name": "Monitor LG 27 4K",
    "description": "Monitor 4K con HDR",
    "sku": "LG-27-4K-002",
    "price": 449.99,
    "active": true,
    "createdAt": "2024-01-16T11:00:00.000Z",
    "updatedAt": "2024-01-16T11:00:00.000Z"
  }
]
```

---

### Obtener Producto por ID

```http
GET /api/products/:id
```

**Parámetros URL:**
- `id` - ID del producto (UUID)

**Respuesta exitosa (200):**
```json
{
  "id": "prod-001",
  "name": "Laptop Dell XPS 15",
  "description": "Laptop profesional de alto rendimiento",
  "sku": "DELL-XPS15-001",
  "price": 1299.99,
  "active": true,
  "createdAt": "2024-01-15T10:00:00.000Z",
  "updatedAt": "2024-01-15T10:00:00.000Z"
}
```

**Errores:**
- `404` - Producto no encontrado

---

### Crear Producto

```http
POST /api/products
```

**Permisos:** Solo `administrador`

**Body:**
```json
{
  "name": "Teclado Mecánico",
  "description": "Teclado mecánico RGB con switches Cherry MX",
  "sku": "KB-MEC-001",
  "price": 129.99
}
```

**Validaciones:**
- `name`: Requerido, 1-200 caracteres
- `description`: Opcional, máximo 1000 caracteres
- `sku`: Opcional, único si se proporciona
- `price`: Requerido, número positivo

**Respuesta exitosa (201):**
```json
{
  "message": "Producto creado correctamente",
  "product": {
    "id": "prod-003",
    "name": "Teclado Mecánico",
    "description": "Teclado mecánico RGB con switches Cherry MX",
    "sku": "KB-MEC-001",
    "price": 129.99,
    "active": true,
    "createdAt": "2024-12-03T14:30:00.000Z",
    "updatedAt": "2024-12-03T14:30:00.000Z"
  }
}
```

**Errores:**
- `400` - Validación fallida
- `403` - Sin permisos
- `409` - SKU duplicado

---

### Actualizar Producto

```http
PUT /api/products/:id
```

**Permisos:** Solo `administrador`

**Body:**
```json
{
  "name": "Teclado Mecánico Pro",
  "description": "Teclado mecánico RGB Pro con switches Cherry MX Blue",
  "price": 149.99
}
```

**Respuesta exitosa (200):**
```json
{
  "message": "Producto actualizado correctamente",
  "product": {
    "id": "prod-003",
    "name": "Teclado Mecánico Pro",
    "description": "Teclado mecánico RGB Pro con switches Cherry MX Blue",
    "sku": "KB-MEC-001",
    "price": 149.99,
    "active": true,
    "updatedAt": "2024-12-03T15:00:00.000Z"
  }
}
```

**Errores:**
- `404` - Producto no encontrado
- `403` - Sin permisos

---

### Activar/Desactivar Producto

Cambia el estado activo del producto.

```http
PATCH /api/products/:id/toggle
```

**Permisos:** Solo `administrador`

**Respuesta exitosa (200):**
```json
{
  "message": "Producto desactivado correctamente",
  "product": {
    "id": "prod-003",
    "name": "Teclado Mecánico Pro",
    "active": false,
    "updatedAt": "2024-12-03T15:10:00.000Z"
  }
}
```

---

### Duplicar Producto

Crea una copia de un producto existente.

```http
POST /api/products/:id/duplicate
```

**Permisos:** Solo `administrador`

**Respuesta exitosa (201):**
```json
{
  "message": "Producto duplicado correctamente",
  "product": {
    "id": "prod-004",
    "name": "Teclado Mecánico Pro - Copia",
    "description": "Teclado mecánico RGB Pro con switches Cherry MX Blue",
    "sku": null,
    "price": 149.99,
    "active": true,
    "createdAt": "2024-12-03T15:20:00.000Z"
  }
}
```

---

## 👥 Clientes

### Buscar Cliente

Busca un cliente por ID, DNI o teléfono.

```http
GET /api/clients/:value
```

**Parámetros URL:**
- `value` - Puede ser ID (UUID), DNI o teléfono

**Ejemplos:**
```
GET /api/clients/550e8400-e29b-41d4-a716-446655440000  (por ID)
GET /api/clients/12345678A                              (por DNI)
GET /api/clients/612345678                              (por teléfono)
```

**Respuesta por ID (200):**
```json
{
  "id": "client-001",
  "firstName": "María",
  "lastName": "García",
  "dni": "12345678A",
  "email": "maria.garcia@example.com",
  "birthday": "1985-03-15",
  "phones": ["612345678", "912345678"],
  "addresses": ["Calle Mayor 123, Madrid"],
  "bankAccounts": ["ES1234567890123456789012"],
  "comments": ["Cliente VIP", "Contactar por email"],
  "authorized": "true",
  "businessName": "García Consulting SL",
  "createdAt": "2024-01-10T09:00:00.000Z",
  "lastModified": "2024-02-15T14:30:00.000Z"
}
```

**Respuesta por DNI/teléfono (200):**
```json
[
  {
    "id": "client-001",
    "firstName": "María",
    "lastName": "García",
    "dni": "12345678A",
    "phones": ["612345678"],
    ...
  }
]
```

**Errores:**
- `404` - Cliente no encontrado

---

### Crear Cliente

```http
POST /api/clients
```

**Body:**
```json
{
  "firstName": "Carlos",
  "lastName": "Rodríguez",
  "dni": "87654321B",
  "email": "carlos.rodriguez@example.com",
  "birthday": "1990-07-20",
  "phones": ["623456789"],
  "addresses": ["Avenida Principal 45, Barcelona"],
  "businessName": "Rodríguez Tech"
}
```

**Validaciones:**
- `firstName`: Requerido, 1-100 caracteres
- `lastName`: Requerido, 1-100 caracteres
- `dni`: Opcional, único
- `email`: Opcional, formato email válido
- `birthday`: Opcional, formato fecha ISO
- `phones`: Array de strings
- `addresses`: Array de strings

**Respuesta exitosa (201):**
```json
{
  "message": "Cliente creado correctamente",
  "client": {
    "id": "client-002",
    "firstName": "Carlos",
    "lastName": "Rodríguez",
    "dni": "87654321B",
    "email": "carlos.rodriguez@example.com",
    "birthday": "1990-07-20",
    "phones": ["623456789"],
    "addresses": ["Avenida Principal 45, Barcelona"],
    "bankAccounts": [],
    "comments": [],
    "businessName": "Rodríguez Tech",
    "createdAt": "2024-12-03T16:00:00.000Z"
  }
}
```

---

### Actualizar Cliente

```http
PUT /api/clients/:id
```

**Body (todos los campos son opcionales):**
```json
{
  "firstName": "Carlos Alberto",
  "email": "carlos.a.rodriguez@example.com",
  "businessName": "Rodríguez Advanced Tech"
}
```

**Respuesta exitosa (200):**
```json
{
  "message": "Cliente actualizado correctamente",
  "client": {
    "id": "client-002",
    "firstName": "Carlos Alberto",
    "lastName": "Rodríguez",
    "email": "carlos.a.rodriguez@example.com",
    "businessName": "Rodríguez Advanced Tech",
    "lastModified": "2024-12-03T16:30:00.000Z",
    ...
  }
}
```

---

### Añadir Datos a Cliente (Push)

Añade elementos a arrays del cliente (teléfonos, direcciones, comentarios, cuentas bancarias).

```http
POST /api/clients/:id/push
```

**Body:**
```json
{
  "field": "phones",
  "value": "634567890"
}
```

**Campos válidos:**
- `phones` - Añadir teléfono
- `addresses` - Añadir dirección
- `comments` - Añadir comentario
- `bankAccounts` - Añadir cuenta bancaria

**Ejemplo - Añadir dirección:**
```json
{
  "field": "addresses",
  "value": "Calle Secundaria 78, Barcelona"
}
```

**Ejemplo - Añadir comentario:**
```json
{
  "field": "comments",
  "value": "Prefiere contacto telefónico por las mañanas"
}
```

**Respuesta exitosa (200):**
```json
{
  "message": "Datos añadidos correctamente",
  "client": {
    "id": "client-002",
    "phones": ["623456789", "634567890"],
    "addresses": [
      "Avenida Principal 45, Barcelona",
      "Calle Secundaria 78, Barcelona"
    ],
    ...
  }
}
```

---

## 📊 Estados de Venta

Los estados de venta son configurables y ordenables. Cada venta tiene un estado en todo momento.

### Listar Estados

```http
GET /api/sale-status
```

**Respuesta exitosa (200):**
```json
[
  {
    "id": "status-001",
    "name": "Creada",
    "order": 1,
    "color": "#FFD700",
    "isFinal": false
  },
  {
    "id": "status-002",
    "name": "Verificada",
    "order": 2,
    "color": "#4169E1",
    "isFinal": false
  },
  {
    "id": "status-003",
    "name": "Tramitada",
    "order": 3,
    "color": "#32CD32",
    "isFinal": false
  },
  {
    "id": "status-004",
    "name": "Finalizada",
    "order": 4,
    "color": "#228B22",
    "isFinal": true
  }
]
```

---

### Crear Estado

```http
POST /api/sale-status
```

**Permisos:** Solo `administrador`

**Body:**
```json
{
  "name": "En Revisión",
  "order": 5,
  "color": "#FFA500",
  "isFinal": false
}
```

**Validaciones:**
- `name`: Requerido, 1-100 caracteres
- `order`: Requerido, número entero único
- `color`: Opcional, formato hex (#RRGGBB)
- `isFinal`: Opcional, boolean (default: false)

**Respuesta exitosa (201):**
```json
{
  "message": "Estado de venta creado correctamente",
  "status": {
    "id": "status-005",
    "name": "En Revisión",
    "order": 5,
    "color": "#FFA500",
    "isFinal": false
  }
}
```

---

### Actualizar Estado

```http
PUT /api/sale-status/:id
```

**Permisos:** Solo `administrador`

**Body (todos opcionales):**
```json
{
  "name": "En Revisión Legal",
  "color": "#FF8C00",
  "isFinal": false
}
```

**Respuesta exitosa (200):**
```json
{
  "message": "Estado de venta actualizado correctamente",
  "status": {
    "id": "status-005",
    "name": "En Revisión Legal",
    "order": 5,
    "color": "#FF8C00",
    "isFinal": false
  }
}
```

---

### Reordenar Estados

Cambia el orden de visualización de múltiples estados a la vez.

```http
POST /api/sale-status/reorder
```

**Permisos:** Solo `administrador`

**Body:**
```json
{
  "statuses": [
    { "id": "status-001", "order": 1 },
    { "id": "status-005", "order": 2 },
    { "id": "status-002", "order": 3 },
    { "id": "status-003", "order": 4 },
    { "id": "status-004", "order": 5 }
  ]
}
```

**Respuesta exitosa (200):**
```json
{
  "message": "Estados de venta reordenados correctamente"
}
```

---

## 💰 Ventas

### Listar Ventas con Filtros

```http
GET /api/sales?clientId=xxx&statusId=yyy&from=2024-01-01&to=2024-12-31
```

**Query Parameters (todos opcionales):**
- `clientId` - UUID del cliente
- `statusId` - UUID del estado
- `from` - Fecha inicio (ISO 8601)
- `to` - Fecha fin (ISO 8601)

**Ejemplos:**
```
GET /api/sales
GET /api/sales?clientId=client-001
GET /api/sales?statusId=status-002
GET /api/sales?from=2024-11-01&to=2024-11-30
GET /api/sales?clientId=client-001&statusId=status-003
```

**Respuesta exitosa (200):**
```json
[
  {
    "id": "sale-001",
    "clientId": "client-001",
    "statusId": "status-002",
    "userId": "user-001",
    "total": 1749.98,
    "closedAt": null,
    "createdAt": "2024-11-15T10:00:00.000Z",
    "updatedAt": "2024-11-15T14:30:00.000Z",
    "client": {
      "firstName": "María",
      "lastName": "García",
      "email": "maria.garcia@example.com"
    },
    "status": {
      "name": "Verificada",
      "color": "#4169E1"
    },
    "user": {
      "firstName": "Juan",
      "lastName": "Pérez"
    },
    "items": [
      {
        "id": "item-001",
        "productId": "prod-001",
        "name": "Laptop Dell XPS 15",
        "quantity": 1,
        "price": 1299.99
      },
      {
        "id": "item-002",
        "productId": "prod-002",
        "name": "Monitor LG 27 4K",
        "quantity": 1,
        "price": 449.99
      }
    ]
  }
]
```

---

### Crear Venta con Productos

```http
POST /api/sales
```

**Body:**
```json
{
  "clientId": "client-001",
  "items": [
    {
      "productId": "prod-001",
      "name": "Laptop Dell XPS 15",
      "quantity": 1,
      "price": 1299.99
    },
    {
      "productId": "prod-002",
      "name": "Monitor LG 27 4K",
      "quantity": 1,
      "price": 449.99
    }
  ]
}
```

**Notas:**
- El usuario autenticado se asigna automáticamente
- Se crea con el primer estado (order: 1) por defecto
- El total se calcula automáticamente
- Se puede crear sin items (`items: []`)

**Respuesta exitosa (201):**
```json
{
  "message": "Venta creada correctamente",
  "sale": {
    "id": "sale-002",
    "clientId": "client-001",
    "statusId": "status-001",
    "userId": "user-001",
    "total": 1749.98,
    "closedAt": null,
    "createdAt": "2024-12-03T17:00:00.000Z",
    "items": [
      {
        "id": "item-003",
        "saleId": "sale-002",
        "productId": "prod-001",
        "name": "Laptop Dell XPS 15",
        "quantity": 1,
        "price": 1299.99
      },
      {
        "id": "item-004",
        "saleId": "sale-002",
        "productId": "prod-002",
        "name": "Monitor LG 27 4K",
        "quantity": 1,
        "price": 449.99
      }
    ]
  }
}
```

---

### Añadir Item a Venta

```http
POST /api/sales/:saleId/items
```

**Body:**
```json
{
  "productId": "prod-003",
  "name": "Teclado Mecánico Pro",
  "quantity": 2,
  "price": 149.99
}
```

**Validaciones:**
- `productId`: Opcional (puede ser null para items manuales)
- `name`: Requerido
- `quantity`: Requerido, entero > 0
- `price`: Requerido, número positivo

**Respuesta exitosa (200):**
```json
{
  "message": "Item añadido a la venta correctamente",
  "sale": {
    "id": "sale-002",
    "total": 2049.96,
    "items": [
      {
        "id": "item-003",
        "name": "Laptop Dell XPS 15",
        "quantity": 1,
        "price": 1299.99
      },
      {
        "id": "item-004",
        "name": "Monitor LG 27 4K",
        "quantity": 1,
        "price": 449.99
      },
      {
        "id": "item-005",
        "name": "Teclado Mecánico Pro",
        "quantity": 2,
        "price": 149.99
      }
    ]
  }
}
```

---

### Actualizar Item de Venta

```http
PUT /api/sales/:saleId/items/:itemId
```

**Body (todos opcionales):**
```json
{
  "quantity": 3,
  "price": 139.99
}
```

**Respuesta exitosa (200):**
```json
{
  "message": "Item actualizado correctamente",
  "sale": {
    "id": "sale-002",
    "total": 2169.95,
    "items": [
      ...
      {
        "id": "item-005",
        "name": "Teclado Mecánico Pro",
        "quantity": 3,
        "price": 139.99
      }
    ]
  }
}
```

---

### Eliminar Item de Venta

```http
DELETE /api/sales/:saleId/items/:itemId
```

**Respuesta exitosa (200):**
```json
{
  "message": "Item eliminado correctamente",
  "sale": {
    "id": "sale-002",
    "total": 1749.98,
    "items": [
      {
        "id": "item-003",
        "name": "Laptop Dell XPS 15",
        "quantity": 1,
        "price": 1299.99
      },
      {
        "id": "item-004",
        "name": "Monitor LG 27 4K",
        "quantity": 1,
        "price": 449.99
      }
    ]
  }
}
```

---

### Cambiar Estado de Venta

```http
PATCH /api/sales/:saleId/status
```

**Body:**
```json
{
  "statusId": "status-004"
}
```

**Comportamiento especial:**
- Si el nuevo estado tiene `isFinal: true`, se establece automáticamente `closedAt` con la fecha actual
- Se crea un registro en el historial de la venta

**Respuesta exitosa (200):**
```json
{
  "message": "Estado de venta cambiado correctamente",
  "sale": {
    "id": "sale-002",
    "statusId": "status-004",
    "closedAt": "2024-12-03T17:30:00.000Z",
    "status": {
      "name": "Finalizada",
      "color": "#228B22",
      "isFinal": true
    }
  }
}
```

---

## 🏥 Health Check

### Health Check Básico

```http
GET /health
```

**Respuesta (200):**
```json
{
  "status": "healthy",
  "timestamp": "2024-12-03T17:00:00.000Z",
  "uptime": 3600
}
```

### Health Check Detallado

```http
GET /health/detailed
```

**Respuesta (200):**
```json
{
  "status": "healthy",
  "timestamp": "2024-12-03T17:00:00.000Z",
  "uptime": 3600,
  "checks": {
    "database": {
      "status": "healthy",
      "responseTime": 15
    },
    "redis": {
      "status": "healthy",
      "responseTime": 5
    }
  },
  "version": "1.0.0",
  "environment": "production"
}
```

---

## ❌ Códigos de Error

### Respuestas de Error Estándar

Todos los errores siguen este formato:

```json
{
  "message": "Descripción del error",
  "error": "Detalles adicionales (solo en desarrollo)",
  "stack": "Stack trace (solo en desarrollo)"
}
```

### Códigos HTTP

| Código | Significado | Uso |
|--------|-------------|-----|
| 200 | OK | Operación exitosa |
| 201 | Created | Recurso creado |
| 400 | Bad Request | Validación fallida o datos inválidos |
| 401 | Unauthorized | No autenticado o token inválido |
| 403 | Forbidden | Sin permisos para esta acción |
| 404 | Not Found | Recurso no encontrado |
| 409 | Conflict | Conflicto (ej: usuario duplicado) |
| 500 | Internal Server Error | Error del servidor |

### Ejemplos de Errores

**400 - Validación:**
```json
{
  "message": "Error de validación",
  "errors": [
    {
      "field": "price",
      "message": "El precio debe ser un número positivo"
    }
  ]
}
```

**401 - No autenticado:**
```json
{
  "message": "No autorizado"
}
```

**403 - Sin permisos:**
```json
{
  "message": "No tiene permiso para realizar esta acción"
}
```

**404 - No encontrado:**
```json
{
  "message": "Producto no encontrado"
}
```

**409 - Conflicto:**
```json
{
  "message": "El SKU ya existe"
}
```

---

## 📝 Notas Importantes

### Rate Limiting

Las rutas de autenticación tienen rate limiting:
- Login: Máximo 5 intentos por minuto
- Registro: Máximo 3 registros por hora desde misma IP

### Paginación

Actualmente no hay paginación implementada. Se recomienda implementar en frontend si el dataset crece.

### Ordenamiento

- Productos: Ordenados por `name` ASC
- Estados: Ordenados por `order` ASC
- Ventas: Ordenadas por `createdAt` DESC

### Soft Delete

Actualmente no se implementa soft delete. Los recursos eliminados se borran permanentemente.

---

**¿Preguntas?** Consulta [FRONTEND_GUIDE.md](FRONTEND_GUIDE.md) para guía de integración frontend.
