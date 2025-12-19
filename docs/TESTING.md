# Testing Guide - Backend CRM Elite

Guía completa para escribir y ejecutar tests en el Backend CRM Elite.

## 📋 Tabla de Contenidos

- [Introducción](#introducción)
- [Configuración](#configuración)
- [Tipos de Tests](#tipos-de-tests)
- [Escribir Tests](#escribir-tests)
- [Ejecutar Tests](#ejecutar-tests)
- [Cobertura](#cobertura)
- [Mejores Prácticas](#mejores-prácticas)
- [Troubleshooting](#troubleshooting)

---

## 📖 Introducción

Este proyecto tiene una cobertura de **83.68%** con **592 tests** pasando.

### Stack de Testing

- **Jest** - Framework de testing
- **ts-jest** - Soporte TypeScript
- **supertest** - Tests HTTP end-to-end
- **@types/jest** - Tipado para Jest

### Estructura de Tests

```
__test__/
├── controllers/          # Tests de controladores (integración)
├── integration/          # Tests E2E con HTTP real
├── repositories/         # Tests de repositorios Prisma
├── shared/              # Tests de utilidades compartidas
└── use-cases/           # Tests de casos de uso (unit)
```

---

## ⚙️ Configuración

### jest.config.js

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/__test__'],
  testMatch: ['**/*.spec.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@application/(.*)$': '<rootDir>/src/application/$1',
    '^@domain/(.*)$': '<rootDir>/src/domain/$1',
    '^@infrastructure/(.*)$': '<rootDir>/src/infrastructure/$1',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/server.ts',
    '!src/**/index.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/__test__/setup.ts'],
};
```

### Setup Global

```typescript
// __test__/setup.ts
import { config } from 'dotenv';

// Cargar variables de entorno de test
config({ path: '.env.test' });

// Mock de módulos comunes
jest.mock('@infrastructure/observability/logger/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// Timeout global para tests lentos
jest.setTimeout(30000);
```

---

## 🧪 Tipos de Tests

### 1. Unit Tests (Use Cases)

Prueban la lógica de negocio aislada.

**Características:**
- Rápidos (<10ms por test)
- Sin dependencias externas
- Mocks de repositorios
- Validación de lógica

**Cobertura actual:** 100% ✅

**Ejemplo:**
```typescript
// __test__/use-cases/product/CreateProductUseCase.spec.ts
describe('CreateProductUseCase', () => {
  let useCase: CreateProductUseCase;
  let mockRepository: jest.Mocked<IProductRepository>;

  beforeEach(() => {
    mockRepository = {
      create: jest.fn(),
      findBySKU: jest.fn(),
    } as any;

    useCase = new CreateProductUseCase(mockRepository);
  });

  it('should create product successfully', async () => {
    const productData = {
      name: 'Test Product',
      price: 99.99,
    };

    mockRepository.findBySKU.mockResolvedValue(null);
    mockRepository.create.mockResolvedValue(mockProduct);

    const result = await useCase.execute(productData, mockUser);

    expect(result).toEqual(mockProduct);
    expect(mockRepository.create).toHaveBeenCalledWith(
      expect.objectContaining(productData)
    );
  });

  it('should throw error if SKU already exists', async () => {
    mockRepository.findBySKU.mockResolvedValue(existingProduct);

    await expect(
      useCase.execute({ name: 'Product', sku: 'DUPLICATE' }, mockUser)
    ).rejects.toThrow('SKU ya existe');
  });
});
```

### 2. Integration Tests (Controllers)

Prueban controladores con mocks de use cases.

**Características:**
- Testing de HTTP handlers
- Validación de request/response
- Verificación de status codes
- Mock de use cases

**Cobertura actual:** 96.59% ✅

**Ejemplo:**
```typescript
// __test__/controllers/ProductController.spec.ts
describe('ProductController', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let statusMock: jest.Mock;
  let jsonMock: jest.Mock;

  beforeEach(() => {
    statusMock = jest.fn().mockReturnThis();
    jsonMock = jest.fn();
    res = { status: statusMock, json: jsonMock };
    req = { user: mockUser, body: {}, params: {} };
    jest.clearAllMocks();
  });

  it('should return 401 if not authenticated', async () => {
    req.user = undefined;

    await ProductController.listProducts(req as any, res as any);

    expect(statusMock).toHaveBeenCalledWith(401);
    expect(jsonMock).toHaveBeenCalledWith({ message: 'No autorizado' });
  });

  it('should return products list', async () => {
    mockListProductsUseCase.execute.mockResolvedValue([mockProduct]);

    await ProductController.listProducts(req as any, res as any);

    expect(statusMock).toHaveBeenCalledWith(200);
    expect(jsonMock).toHaveBeenCalledWith([mockProduct]);
  });
});
```

### 3. E2E Tests (Integration)

Prueban flujos completos con HTTP real.

**Características:**
- Requests HTTP reales
- Base de datos de test
- Setup/teardown de datos
- Flujos end-to-end

**Ejemplo:**
```typescript
// __test__/integration/productRoutes.integration.spec.ts
describe('Integration: Product Routes', () => {
  let app: App;
  let server: any;
  let adminToken: string;

  beforeAll(async () => {
    app = new App();
    server = app.getApp();

    // Setup: Crear usuario admin y obtener token
    const adminUser = await prisma.user.create({
      data: { ...adminUserData },
    });

    const loginResponse = await request(server)
      .post('/api/users/login')
      .send(loginCredentials);

    adminToken = loginResponse.body.accessToken;
  });

  afterAll(async () => {
    // Cleanup
    await prisma.user.deleteMany();
    await prisma.$disconnect();
  });

  it('should create product with authentication', async () => {
    const response = await request(server)
      .post('/api/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Test Product',
        price: 99.99,
      })
      .expect(201);

    expect(response.body).toHaveProperty('product');
    expect(response.body.product.name).toBe('Test Product');

    // Cleanup
    await prisma.product.delete({
      where: { id: response.body.product.id },
    });
  });

  it('should return 401 without authentication', async () => {
    await request(server)
      .post('/api/products')
      .send({ name: 'Test' })
      .expect(401);
  });
});
```

### 4. Repository Tests

Prueban repositorios con mock de Prisma.

**Cobertura actual:** 100% ✅

**Ejemplo:**
```typescript
// __test__/repositories/ProductPrismaRepository.spec.ts
jest.mock('@infrastructure/prisma/prismaClient', () => ({
  prisma: {
    product: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}));

describe('ProductPrismaRepository', () => {
  let repository: ProductPrismaRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    repository = new ProductPrismaRepository();
  });

  it('should find all products', async () => {
    (prisma.product.findMany as jest.Mock).mockResolvedValue([mockProductData]);

    const result = await repository.findAll();

    expect(result).toHaveLength(1);
    expect(result[0]).toBeInstanceOf(Product);
    expect(prisma.product.findMany).toHaveBeenCalledWith({
      orderBy: { name: 'asc' },
    });
  });
});
```

---

## ✍️ Escribir Tests

### Estructura AAA (Arrange-Act-Assert)

```typescript
it('should do something', async () => {
  // Arrange - Preparar datos y mocks
  const input = { name: 'Test' };
  mockRepository.method.mockResolvedValue(expectedResult);

  // Act - Ejecutar la acción
  const result = await useCase.execute(input);

  // Assert - Verificar resultados
  expect(result).toEqual(expectedResult);
  expect(mockRepository.method).toHaveBeenCalledWith(input);
});
```

### Naming Conventions

```typescript
// ✅ BIEN - Descriptivo y claro
it('should create product when data is valid')
it('should throw error when SKU already exists')
it('should return 401 when user is not authenticated')

// ❌ MAL - Vago o técnico
it('test product creation')
it('handles error')
it('status 401')
```

### Test de Casos Exitosos

```typescript
describe('CreateProductUseCase', () => {
  it('should create product with all fields', async () => {
    const productData = {
      name: 'Product',
      description: 'Description',
      sku: 'SKU-001',
      price: 99.99,
    };

    mockRepository.create.mockResolvedValue(createdProduct);

    const result = await useCase.execute(productData, mockUser);

    expect(result).toMatchObject(productData);
    expect(mockRepository.create).toHaveBeenCalled();
  });

  it('should create product with minimal fields', async () => {
    const productData = {
      name: 'Product',
      price: 99.99,
    };

    const result = await useCase.execute(productData, mockUser);

    expect(result.name).toBe('Product');
    expect(result.price).toBe(99.99);
  });
});
```

### Test de Casos de Error

```typescript
describe('CreateProductUseCase', () => {
  it('should throw error for invalid price', async () => {
    const invalidData = {
      name: 'Product',
      price: -10,
    };

    await expect(
      useCase.execute(invalidData, mockUser)
    ).rejects.toThrow('El precio debe ser positivo');
  });

  it('should throw error for duplicate SKU', async () => {
    mockRepository.findBySKU.mockResolvedValue(existingProduct);

    await expect(
      useCase.execute({ name: 'Product', sku: 'DUPLICATE' }, mockUser)
    ).rejects.toThrow('SKU ya existe');
  });

  it('should throw error if user lacks permissions', async () => {
    const comercialUser = { ...mockUser, role: 'comercial' };

    await expect(
      useCase.execute(productData, comercialUser)
    ).rejects.toThrow('No tiene permiso');
  });
});
```

### Test de Autorizaciones

```typescript
describe('ListProductsUseCase - Authorization', () => {
  it.each([
    'administrador',
    'coordinador',
    'verificador',
    'comercial',
  ])('should allow %s role', async (role) => {
    const user = { ...mockUser, role };

    await expect(
      useCase.execute({}, user)
    ).resolves.toBeDefined();
  });

  it('should deny unknown role', async () => {
    const user = { ...mockUser, role: 'invalid' };

    await expect(
      useCase.execute({}, user)
    ).rejects.toThrow('No tiene permiso');
  });
});
```

### Mocking

#### Mock de Repositorio
```typescript
const mockRepository: jest.Mocked<IProductRepository> = {
  findAll: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  toggleActive: jest.fn(),
  findBySKU: jest.fn(),
};
```

#### Mock de Prisma
```typescript
jest.mock('@infrastructure/prisma/prismaClient', () => ({
  prisma: {
    product: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}));
```

#### Mock de Módulos Externos
```typescript
jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
  compare: jest.fn().mockResolvedValue(true),
}));
```

### Fixtures (Datos de Prueba)

```typescript
// __test__/fixtures/products.ts
export const mockProduct = {
  id: 'prod-001',
  name: 'Test Product',
  description: 'Test Description',
  sku: 'TEST-SKU',
  price: 99.99,
  active: true,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

export const mockProductData = {
  name: 'Test Product',
  price: 99.99,
};
```

---

## 🚀 Ejecutar Tests

### Comandos Básicos

```bash
# Todos los tests
npm test

# Con coverage
npm test -- --coverage

# Watch mode (re-ejecuta al guardar)
npm test -- --watch

# Test específico
npm test -- ProductController

# Tests por patrón
npm test -- --testNamePattern="should create"

# Tests de un directorio
npm test -- __test__/use-cases/

# Verbose (muestra todos los tests)
npm test -- --verbose

# Solo tests que fallaron
npm test -- --onlyFailures
```

### CI/CD

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test -- --coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
```

---

## 📊 Cobertura

### Reporte Actual

```
-----------------------------------|---------|----------|---------|---------|
File                               | % Stmts | % Branch | % Funcs | % Lines |
-----------------------------------|---------|----------|---------|---------|
All files                          |   83.68 |    75.78 |   79.56 |   84.9  |
 application/use-cases             |     100 |      100 |     100 |     100 |
 domain/repositories               |     100 |      100 |     100 |     100 |
 infrastructure/prisma             |     100 |      100 |     100 |     100 |
 infrastructure/express/controllers|   96.59 |       80 |     100 |   96.59 |
 domain/entities                   |   86.33 |    60.91 |      76 |   94.44 |
-----------------------------------|---------|----------|---------|---------|
```

### Visualizar Cobertura

```bash
# Generar reporte HTML
npm test -- --coverage

# Abrir en navegador
open coverage/index.html
```

### Objetivo de Cobertura

- **Mínimo:** 80% en todos los módulos
- **Objetivo:** 90% overall
- **Crítico:** 100% en use cases y repositorios ✅

---

## ✅ Mejores Prácticas

### 1. Tests Independientes

```typescript
// ✅ BIEN - Cada test es independiente
describe('ProductUseCase', () => {
  beforeEach(() => {
    // Reset para cada test
    jest.clearAllMocks();
  });

  it('test 1', () => {
    // Configuración específica
  });

  it('test 2', () => {
    // Configuración específica
  });
});

// ❌ MAL - Tests dependen del orden
describe('ProductUseCase', () => {
  let product;

  it('creates product', () => {
    product = createProduct();
  });

  it('updates product', () => {
    updateProduct(product); // Depende del anterior
  });
});
```

### 2. Nombres Descriptivos

```typescript
// ✅ BIEN
it('should return 404 when product does not exist')
it('should allow administrador to create products')
it('should calculate total from all sale items')

// ❌ MAL
it('test 1')
it('works')
it('product test')
```

### 3. Un Concepto por Test

```typescript
// ✅ BIEN - Un test, un concepto
it('should validate required fields', async () => {
  await expect(useCase.execute({})).rejects.toThrow('name is required');
});

it('should validate price is positive', async () => {
  await expect(
    useCase.execute({ name: 'Test', price: -10 })
  ).rejects.toThrow('price must be positive');
});

// ❌ MAL - Múltiples conceptos
it('should validate all fields', async () => {
  // Testing name
  await expect(useCase.execute({})).rejects.toThrow();

  // Testing price
  await expect(useCase.execute({ price: -10 })).rejects.toThrow();

  // Testing SKU
  await expect(useCase.execute({ sku: '' })).rejects.toThrow();
});
```

### 4. Arrange-Act-Assert

```typescript
it('should create product', async () => {
  // Arrange - Preparar
  const data = { name: 'Product', price: 99 };
  mockRepository.create.mockResolvedValue(expectedProduct);

  // Act - Ejecutar
  const result = await useCase.execute(data, mockUser);

  // Assert - Verificar
  expect(result).toEqual(expectedProduct);
  expect(mockRepository.create).toHaveBeenCalledWith(data);
});
```

### 5. Evitar Lógica en Tests

```typescript
// ✅ BIEN - Test simple y directo
it('should calculate total', () => {
  const items = [
    { quantity: 2, price: 10 },
    { quantity: 1, price: 20 },
  ];

  const total = calculateTotal(items);

  expect(total).toBe(40);
});

// ❌ MAL - Lógica compleja en test
it('should calculate total', () => {
  const items = [...]; // muchos items
  let expected = 0;

  for (const item of items) {
    if (item.active) {
      expected += item.quantity * item.price;
    }
  }

  const total = calculateTotal(items);

  expect(total).toBe(expected); // ¿Quién testea el test?
});
```

### 6. Test de Casos Edge

```typescript
describe('CreateSaleUseCase', () => {
  it('should create sale with items', async () => {
    // Caso normal
  });

  it('should create sale without items', async () => {
    // Edge case: lista vacía
    const result = await useCase.execute({
      clientId: 'client-1',
      items: [],
    });

    expect(result.items).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  it('should handle items with zero price', async () => {
    // Edge case: precio 0
    const items = [{ name: 'Free Item', quantity: 1, price: 0 }];

    const result = await useCase.execute({ clientId: 'c1', items });

    expect(result.total).toBe(0);
  });
});
```

### 7. Cleanup

```typescript
describe('Integration Tests', () => {
  let createdIds: string[] = [];

  afterEach(async () => {
    // Limpiar datos creados en tests
    for (const id of createdIds) {
      await prisma.product.delete({ where: { id } });
    }
    createdIds = [];
  });

  it('should create product', async () => {
    const response = await request(server)
      .post('/api/products')
      .send(productData);

    createdIds.push(response.body.product.id);

    expect(response.status).toBe(201);
  });
});
```

---

## 🐛 Troubleshooting

### Tests Fallan Aleatoriamente

**Causa:** Tests no son independientes o hay race conditions

**Solución:**
```typescript
// Asegurar cleanup entre tests
beforeEach(() => {
  jest.clearAllMocks();
  jest.restoreAllMocks();
});

// Usar beforeEach en lugar de beforeAll cuando sea posible
```

### Timeout en Tests

**Causa:** Operaciones asíncronas lentas

**Solución:**
```typescript
// Aumentar timeout para test específico
it('should handle slow operation', async () => {
  // Test code
}, 10000); // 10 segundos

// O globalmente en jest.config.js
module.exports = {
  testTimeout: 10000,
};
```

### Mocks No Funcionan

**Causa:** Mock definido después de import

**Solución:**
```typescript
// ✅ BIEN - Mock antes de imports
jest.mock('@infrastructure/prisma/prismaClient');
import { prisma } from '@infrastructure/prisma/prismaClient';

// ❌ MAL - Mock después de imports
import { prisma } from '@infrastructure/prisma/prismaClient';
jest.mock('@infrastructure/prisma/prismaClient');
```

### Coverage Bajo en Archivos

**Causa:** Código no alcanzado por tests

**Solución:**
```bash
# Ver qué líneas no están cubiertas
npm test -- --coverage --verbose

# Abrir reporte HTML para ver detalle
open coverage/index.html
```

---

## 📚 Recursos

- **Jest Docs**: https://jestjs.io/
- **Testing Best Practices**: https://testingjavascript.com/
- **TDD Guide**: https://martinfowler.com/bliki/TestDrivenDevelopment.html

---

## 📝 Checklist para Nuevos Tests

Al crear tests para nuevas features:

- [ ] Unit tests de use cases (100% coverage)
- [ ] Repository tests si hay nuevo repo
- [ ] Controller tests (happy path + errors)
- [ ] Tests de autorización (todos los roles)
- [ ] Tests de validación (campos requeridos, formatos)
- [ ] Integration tests E2E (al menos 1 flujo completo)
- [ ] Tests de casos edge (listas vacías, valores límite)
- [ ] Tests de errores (404, 403, 500)
- [ ] Cleanup de datos de test
- [ ] Verificar cobertura >80%

---

**¿Preguntas?** Consulta los tests existentes como referencia o contacta al equipo.
