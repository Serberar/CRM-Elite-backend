import { Decimal } from '@prisma/client/runtime/library';

export class Product {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly description: string | null,
    public readonly sku: string | null,
    public readonly price: number,
    public readonly active: boolean,
    public readonly createdAt: Date,
    public readonly updatedAt: Date
  ) {}

  static fromPrisma(data: {
    id: string;
    name: string;
    description: string | null;
    sku: string | null;
    price: Decimal | number;
    active: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): Product {
    return new Product(
      data.id,
      data.name,
      data.description,
      data.sku,
      Number(data.price),
      data.active,
      data.createdAt,
      data.updatedAt
    );
  }

  toPrisma(): {
    id: string;
    name: string;
    description: string | null;
    sku: string | null;
    price: number;
    active: boolean;
    createdAt: Date;
    updatedAt: Date;
  } {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      sku: this.sku,
      price: this.price,
      active: this.active,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
