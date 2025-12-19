import { z } from 'zod';

// Convierte string → number antes de validar
const numberFromString = z.preprocess((v) => {
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    return isNaN(n) ? v : n;
  }
  return v;
}, z.number().positive());

// ======================================
// DTOs para Use Cases (estructura plana)
// ======================================

// DTO para crear producto (usado por UseCase)
const createProductBodySchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio'),
  description: z
    .string()
    .optional()
    .nullable()
    .or(z.literal(''))
    .transform((val) => (val === '' ? null : val)),
  sku: z
    .string()
    .max(50)
    .optional()
    .or(z.literal(''))
    .transform((v) => (v === '' ? undefined : v)),
  price: numberFromString,
});

// DTO para actualizar producto (usado por UseCase)
const updateProductBodySchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio').optional(),
  description: z
    .string()
    .optional()
    .nullable()
    .or(z.literal(''))
    .transform((val) => (val === '' ? null : val)),
  sku: z
    .string()
    .max(50)
    .optional()
    .or(z.literal(''))
    .transform((v) => (v === '' ? undefined : v)),
  price: numberFromString.optional(),
});

// ======================================
// SCHEMAS DE VALIDACIÓN (para middleware validateRequest)
// ======================================

// Schema para crear producto
export const createProductSchema = z.object({
  body: createProductBodySchema,
});

// Schema para actualizar producto
export const updateProductSchema = z.object({
  params: z.object({
    id: z.string().uuid('ID de producto inválido'),
  }),
  body: updateProductBodySchema,
});

export const toggleProductActiveSchema = z.object({
  params: z.object({
    id: z.string().uuid('ID de producto inválido'),
  }),
});

export const duplicateProductSchema = z.object({
  params: z.object({
    id: z.string().uuid('ID de producto inválido'),
  }),
});

export const getProductSchema = z.object({
  params: z.object({
    id: z.string().uuid('ID de producto inválido'),
  }),
});

export const listProductsSchema = z.object({
  query: z.object({
    active: z
      .string()
      .optional()
      .transform((val) => (val === 'true' ? true : val === 'false' ? false : undefined)),
    search: z.string().min(1).optional(),
  }).optional(),
});

// ======================================
// TIPOS (DTOs planos para Use Cases)
// ======================================

// DTOs planos para use cases (SIN estructura body/params)
export interface CreateProductDTO {
  name: string;
  description?: string | null;
  sku?: string;
  price: number;
}

export interface UpdateProductDTO {
  id: string;
  name?: string;
  description?: string | null;
  sku?: string;
  price?: number;
}

export type ToggleProductActiveDTO = { id: string };
export type DuplicateProductDTO = { id: string };
export type GetProductDTO = { id: string };
export type ListProductsDTO = { active?: boolean; search?: string };
