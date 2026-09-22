import { z } from 'zod'

export const slugParamSchema = z.object({
  slug: z.string().min(1),
})

export const idParamSchema = z.object({
  id: z.string().min(1),
})

export const itineraryDaySchema = z.object({
  day: z.number().int().positive(),
  title: z.string().min(1),
  description: z.string().min(1),
})

export const tourCreateSchema = z.object({
  id: z.string().min(1).optional(),
  slug: z.string().min(1),
  title: z.string().min(1),
  tagline: z.string().min(1),
  shortDescription: z.string().min(1),
  coverImage: z.string().min(1),
  gallery: z.array(z.string()).default([]),
  duration: z.string().min(1),
  startingPrice: z.string().min(1),
  location: z.string().min(1),
  highlights: z.array(z.string()).default([]),
  itinerary: z.array(itineraryDaySchema).default([]),
  inclusions: z.array(z.string()).default([]),
  exclusions: z.array(z.string()).default([]),
  featured: z.boolean().default(false),
})

export const tourUpdateSchema = tourCreateSchema.partial().omit({ id: true })

export const merchCreateSchema = z.object({
  id: z.string().min(1).optional(),
  slug: z.string().min(1),
  name: z.string().min(1),
  tagline: z.string().min(1),
  description: z.string().min(1),
  priceCents: z.number().int().nonnegative(),
  currency: z.string().default('USD'),
  category: z.string().min(1),
  coverImage: z.string().min(1),
  gallery: z.array(z.string()).default([]),
  sizes: z.array(z.string()).default([]),
  inStock: z.boolean().default(true),
})

export const merchUpdateSchema = merchCreateSchema.partial().omit({ id: true })

export const partnerCreateSchema = z.object({
  id: z.string().min(1).optional(),
  name: z.string().min(1),
  logoSrc: z.string().min(1),
  sortOrder: z.number().int().default(0),
})

export const partnerUpdateSchema = partnerCreateSchema.partial().omit({ id: true })

export const testimonialCreateSchema = z.object({
  id: z.string().min(1).optional(),
  quote: z.string().min(1),
  name: z.string().min(1),
  trip: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  sortOrder: z.number().int().default(0),
})

export const testimonialUpdateSchema = testimonialCreateSchema
  .partial()
  .omit({ id: true })

export const bootstrapSchema = z.object({
  email: z.string().email().nullable().optional(),
  firstName: z.string().trim().min(1).max(100).nullable().optional(),
  lastName: z.string().trim().min(1).max(100).nullable().optional(),
  profilePicture: z.string().nullable().optional(),
})

export const updateMeSchema = z.object({
  firstName: z.string().trim().min(1).max(100).nullable().optional(),
  lastName: z.string().trim().min(1).max(100).nullable().optional(),
  phone: z.string().trim().min(1).max(40).nullable().optional(),
  profilePicture: z.string().nullable().optional(),
})

export const cartAddSchema = z.object({
  productId: z.string().min(1),
  qty: z.number().int().min(1).max(99).default(1),
  size: z.string().optional(),
})

export const cartUpdateSchema = z.object({
  qty: z.number().int().min(0).max(99),
})
