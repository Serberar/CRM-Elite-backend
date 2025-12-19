export class SaleHistory {
  constructor(
    public readonly id: string,
    public readonly saleId: string,
    public readonly userId: string | null,
    public readonly action: string,
    public readonly payload: unknown,
    public readonly createdAt: Date
  ) {}

  static fromPrisma(data: {
    id: string;
    saleId: string;
    userId?: string | null;
    action: string;
    payload?: unknown;
    createdAt: Date;
  }): SaleHistory {
    return new SaleHistory(
      data.id,
      data.saleId,
      data.userId ?? null,
      data.action,
      data.payload ?? null,
      data.createdAt
    );
  }

  toPrisma() {
    return {
      id: this.id,
      saleId: this.saleId,
      userId: this.userId,
      action: this.action,
      payload: this.payload,
      createdAt: this.createdAt,
    };
  }
}
