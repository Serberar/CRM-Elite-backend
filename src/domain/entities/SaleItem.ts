export class SaleItem {
  constructor(
    public readonly id: string,
    public readonly saleId: string,
    public readonly productId: string | null,
    public readonly nameSnapshot: string,
    public readonly skuSnapshot: string | null,
    public readonly unitPrice: number,
    public readonly quantity: number,
    public readonly finalPrice: number,
    public readonly createdAt: Date,
    public readonly updatedAt: Date
  ) {}

  static fromPrisma(data: {
    id: string;
    saleId: string;
    productId?: string | null;
    nameSnapshot: string;
    skuSnapshot?: string | null;
    unitPrice: unknown;
    quantity: number;
    finalPrice: unknown;
    createdAt: Date;
    updatedAt: Date;
  }): SaleItem {
    return new SaleItem(
      data.id,
      data.saleId,
      data.productId ?? null,
      data.nameSnapshot,
      data.skuSnapshot ?? null,
      Number(data.unitPrice ?? 0),
      Number(data.quantity ?? 0),
      Number(data.finalPrice ?? 0),
      data.createdAt,
      data.updatedAt
    );
  }

  toPrisma() {
    return {
      id: this.id,
      saleId: this.saleId,
      productId: this.productId,
      nameSnapshot: this.nameSnapshot,
      skuSnapshot: this.skuSnapshot,
      unitPrice: this.unitPrice,
      quantity: this.quantity,
      finalPrice: this.finalPrice,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
