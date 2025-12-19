import { prisma } from '@infrastructure/prisma/prismaClient';
import { Product } from '@domain/entities/Product';
import { IProductRepository } from '@domain/repositories/IProductRepository';
import { dbCircuitBreaker } from '@infrastructure/resilience';
import {
  PaginationOptions,
  PaginatedResponse,
  calculateOffset,
  buildPaginationMeta,
} from '@domain/types';

export class ProductPrismaRepository implements IProductRepository {
  async findAll(): Promise<Product[]> {
    const rows = await dbCircuitBreaker.execute(() =>
      prisma.product.findMany({
        orderBy: { name: 'asc' },
      })
    );

    return rows.map((row) => Product.fromPrisma(row));
  }

  async findAllPaginated(pagination: PaginationOptions): Promise<PaginatedResponse<Product>> {
    const [rows, total] = await dbCircuitBreaker.execute(() =>
      Promise.all([
        prisma.product.findMany({
          orderBy: { name: 'asc' },
          skip: calculateOffset(pagination.page, pagination.limit),
          take: pagination.limit,
        }),
        prisma.product.count(),
      ])
    );

    return {
      data: rows.map((row) => Product.fromPrisma(row)),
      meta: buildPaginationMeta(pagination.page, pagination.limit, total),
    };
  }

  async findById(id: string): Promise<Product | null> {
    const row = await dbCircuitBreaker.execute(() =>
      prisma.product.findUnique({
        where: { id },
      })
    );

    return row ? Product.fromPrisma(row) : null;
  }

  async findBySKU(sku: string): Promise<Product | null> {
    const row = await dbCircuitBreaker.execute(() =>
      prisma.product.findUnique({
        where: { sku },
      })
    );

    return row ? Product.fromPrisma(row) : null;
  }

  async create(data: Partial<Product>): Promise<Product> {
    const row = await dbCircuitBreaker.execute(() =>
      prisma.product.create({
        data: {
          name: data.name!,
          description: data.description ?? null,
          sku: data.sku ?? null,
          price: data.price!,
          active: true,
        },
      })
    );

    return Product.fromPrisma(row);
  }

  async update(id: string, data: Partial<Product>): Promise<Product> {
    const row = await dbCircuitBreaker.execute(() =>
      prisma.product.update({
        where: { id },
        data: {
          name: data.name,
          description: data.description,
          sku: data.sku,
          price: data.price,
        },
      })
    );

    return Product.fromPrisma(row);
  }

  async toggleActive(id: string): Promise<Product> {
    const current = await dbCircuitBreaker.execute(() =>
      prisma.product.findUnique({
        where: { id },
        select: { active: true },
      })
    );

    if (!current) {
      throw new Error(`Product ${id} not found`);
    }

    const updated = await dbCircuitBreaker.execute(() =>
      prisma.product.update({
        where: { id },
        data: {
          active: !current.active,
        },
      })
    );

    return Product.fromPrisma(updated);
  }
}
