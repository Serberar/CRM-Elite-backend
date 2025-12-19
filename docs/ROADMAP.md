## ROADMAP CRM ELITE"

Adaptado al backend actual Elite de Ventas (Prisma + Hexagonal + UseCases + Zod + RolePermissions + Tests)
Incluye tareas Frontend al final.

## FASE 1 — SCHEMA PRISMA (COMPLETADO)

1. Añadir modelos nuevos

EJEMPLO:

Product
model Product {
  id         String   @id @default(uuid())
  name       String
  description String?
  sku        String?  @unique
  price      Decimal
  active     Boolean  @default(true)
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  saleItems  SaleItem[]
}

SaleItem (líneas de producto en la venta)
model SaleItem {
  id            String   @id @default(uuid())
  saleId        String
  sale          Sale     @relation(fields: [saleId], references: [id])

  productId     String?
  product       Product? @relation(fields: [productId], references: [id])

  nameSnapshot  String
  skuSnapshot   String?
  unitPrice     Decimal
  quantity      Int
  finalPrice    Decimal

  createdAt     DateTime @default(now())
}

SaleStatus (simple, editable)
model SaleStatus {
  id       String @id @default(uuid())
  name     String
  order    Int
  color    String?
  isFinal  Boolean @default(false)
}

2. Seed inicial estados

Creada / Verificada / Tramitada / Finalizada.

3. Ejecutar migración prisma
prisma migrate dev --name add_product_sales_module

## FASE 2 — DOMAIN (entities + repositorios) (COMPLETADO)

1. Crear Entities

En src/domain/entities/
- Product.ts
- Sale.ts
- SaleStatus.ts

2. Repositorios

En src/domain/repositories/:
- IProductRepository
- ISaleItemRepository (puede ser interno; opcional)
- ISaleStatusRepository

Métodos mínimos:
* Product
* findAll()
* findById()
* create()
* update()
* toggleActive()
* findBySKU()
* SaleItem

SalePrismaRepository
* SaleStatus
* list()
* create()
* update()
* reorder()
* delete() (no decidido aún)

## FASE 3 — INFRA (PRISMA REPOSITORIES) (COMPLETADO)

En src/infrastructure/prisma/
- ProductPrismaRepository.ts
- SaleStatusPrismaRepository.ts

SalePrismaRepository :
- incluir items en el include
- crear/editar/borrar items
- recalcular totalAmount interno
- Incluye logging y circuit breakers como ya hacéis.

## FASE 4 — VALIDACIONES (Zod) (COMPLETADO)

En src/shared/validation/
- productSchemas.ts
- createProduct
- updateProduct
- toggleActive
- saleSchemas.ts
- createSaleWithProducts
- updateItems
- changeStatus
- filters
- saleStatusSchemas.ts
- create
- update
- reorder

## FASE 5 — ROLE PERMISSIONS

En src/shared/authorization/rolePermissions.ts

product
product: {
  ListProductsUseCase: ["administrador", "coordinador", "verificador"],
  CreateProductUseCase: ["administrador"],
  UpdateProductUseCase: ["administrador"],
  ToggleProductActiveUseCase: ["administrador"],
  DuplicateProductUseCase: ["administrador"]
}

sale-items
sale: {
   ...ya existentes,
   UpdateSaleItemsUseCase: ["administrador", "coordinador"],
   ChangeSaleStatusUseCase: ["administrador", "coordinador", "verificador"],
}

sale-status
saleStatus: {
  ListSaleStatusUseCase: ["administrador", "coordinador", "verificador"],
  CreateSaleStatusUseCase: ["administrador"],
  UpdateSaleStatusUseCase: ["administrador"],
  ReorderSaleStatusesUseCase: ["administrador"]
}

## FASE 6 — APPLICATION (USE CASES)

Estructrura de carpetas en src/application/use-cases/:

product/
salestatus/
sale-items/
sale/

1. PRODUCT — Use Cases (COMPLETADO)
- CreateProductUseCase.ts
- UpdateProductUseCase.ts
- ToggleProductActiveUseCase.ts
- DuplicateProductUseCase.ts
- ListProductsUseCase.ts
- GetProductUseCase.ts

2. SALE — Use Cases (COMPLETADO)
- CreateSaleWithProductsUseCase.ts
- AddSaleItemUseCase.ts
- ChangeSaleStatusUseCase.ts
- ListSalesWithFiltersUseCase.ts
- RemoveSaleItemUseCase.ts
- UpdateSaleItemUseCase.ts

3. SALE-STATUS — Use Cases (COMPLETADO)
- ListSaleStatusUseCase.ts
- CreateSaleStatusUseCase.ts
- UpdateSaleStatusUseCase.ts
- ReorderSaleStatusesUseCase.ts

4. SALE-ITEM
- RemoveSaleItemUseCase.ts

## FASE 7 — CONTROLLERS + ROUTES (COMPLETADO)

1. Controllers
En src/infrastructure/express/controllers/
- ProductController.ts
- SaleStatusController.ts
- SaleController.

2. Rutas
En src/interfaces/http/routes/

- productRoutes.ts
- saleStatusRoutes.ts
- saleRoutes.ts

Aplican:
- authMiddleware
- validateRequest
- checkRolePermission

## Fase 8 - REVISIÓN DE ERRORES
* Se han modido archivos de la carpeta shared a su nueva ruta y aunque las importaciones se han arreglado revisar funcionalidad del backend.
* Revisar mejoras y fallos actuales
* Revisar errores de lint y prettier


## FASE 9 — TESTING

Crear en __test__/use-cases/

1. Test product use cases
2. Test sale items
3. Test controllers
4. Test de integración en todas las rutas



### -------------------------- FRONTEND --------------------------

1. Rutas
/products
/products/new
/products/:id
/sales/new   (añadir productos)
/sales/:id   (editar items + cambiar estado)

2. Pantallas
- Productos:
- listado
- crear
- editar
- duplicar
- activar/desactivar
- Ventas:
    - formulario con productos
    - edición completa: cambiar cantidad, precio, borrar línea
    - estados: dropdown editable
    - Estados:
        - CRUD de estados
        - reordenar

3. Redux slices
- productsSlice
- saleStatusSlice
- salesSlice
- saleDetailSlice

4. Hooks
- useCreateSaleWithProducts
- useProductList
- useUpdateSaleItems
- useSaleStatusList
- useChangeSaleStatus

5. Validaciones UI
- total recalculado cliente
- impedir cantidad < 1
- aviso si cambian el unitPrice