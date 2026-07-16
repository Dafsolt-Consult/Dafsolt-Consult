import { z } from "zod";

export const createCategorySchema = z.object({
  name: z.string().min(2).max(80),
});

export const createBookSchema = z.object({
  categoryId: z.string().cuid().optional(),
  title: z.string().min(1).max(200),
  author: z.string().min(1).max(150),
  isbn: z.string().max(30).optional(),
  publisher: z.string().max(150).optional(),
  publishedYear: z.number().int().min(1500).max(2100).optional(),
  format: z.enum(["PHYSICAL", "EBOOK", "BOTH"]).default("PHYSICAL"),
  description: z.string().max(2000).optional(),
  coverImageUrl: z.string().url().optional(),
  ebookFileUrl: z.string().url().optional(),
  targetAudience: z.enum(["PRIMARY", "JUNIOR_SECONDARY", "SENIOR_SECONDARY"]).optional(),
  totalCopies: z.number().int().min(0).default(1),
});

export const updateBookSchema = createBookSchema.partial();

export const borrowBookSchema = z.object({
  studentId: z.string().cuid().optional(),
  borrowerName: z.string().max(120).optional(),
  dueDate: z.coerce.date(),
});
