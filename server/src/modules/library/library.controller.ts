import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { prisma } from "../../config/prisma";
import { resolveTenantId } from "../../middleware/auth";
import { ApiError } from "../../utils/ApiError";
import { borrowBookSchema, createBookSchema, createCategorySchema, updateBookSchema } from "./library.schema";

const DAILY_FINE = 20; // currency minor units per day overdue (kobo), tune per school

export const listCategories = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  const categories = await prisma.bookCategory.findMany({ where: { tenantId }, orderBy: { name: "asc" } });
  res.json(categories);
});

export const createCategory = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  const input = createCategorySchema.parse(req.body);
  const category = await prisma.bookCategory.create({ data: { ...input, tenantId } });
  res.status(201).json(category);
});

export const listBooks = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  const { categoryId, format, targetAudience, search } = req.query as Record<string, string | undefined>;
  const page = Number(req.query.page ?? 1);
  const pageSize = Math.min(Number(req.query.pageSize ?? 20), 100);

  const where = {
    tenantId,
    categoryId,
    format: format as never,
    targetAudience: targetAudience as never,
    OR: search
      ? [
          { title: { contains: search, mode: "insensitive" as const } },
          { author: { contains: search, mode: "insensitive" as const } },
        ]
      : undefined,
  };

  const [items, total] = await Promise.all([
    prisma.book.findMany({
      where,
      include: { category: true },
      orderBy: { title: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.book.count({ where }),
  ]);

  res.json({ items, total, page, pageSize });
});

export const getBook = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  const book = await prisma.book.findFirst({ where: { id: req.params.bookId, tenantId }, include: { category: true } });
  if (!book) throw ApiError.notFound("Book not found");
  res.json(book);
});

export const createBook = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  const input = createBookSchema.parse(req.body);
  const book = await prisma.book.create({
    data: { ...input, tenantId, availableCopies: input.totalCopies },
  });
  res.status(201).json(book);
});

export const updateBook = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  const input = updateBookSchema.parse(req.body);
  const existing = await prisma.book.findFirst({ where: { id: req.params.bookId, tenantId } });
  if (!existing) throw ApiError.notFound("Book not found");

  const book = await prisma.book.update({ where: { id: existing.id }, data: input });
  res.json(book);
});

export const deleteBook = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  const existing = await prisma.book.findFirst({ where: { id: req.params.bookId, tenantId } });
  if (!existing) throw ApiError.notFound("Book not found");

  const outstandingCount = await prisma.borrowRecord.count({ where: { bookId: existing.id, status: "BORROWED" } });
  if (outstandingCount > 0) {
    throw ApiError.conflict("This book has copies currently on loan. Wait until they're returned before deleting it");
  }

  await prisma.book.delete({ where: { id: existing.id } });
  res.status(204).send();
});

export const borrowBook = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  const input = borrowBookSchema.parse(req.body);

  const record = await prisma.$transaction(async (tx) => {
    const book = await tx.book.findFirst({ where: { id: req.params.bookId, tenantId } });
    if (!book) throw ApiError.notFound("Book not found");
    if (book.format === "EBOOK") throw ApiError.badRequest("Digital-only books do not need to be borrowed");
    if (book.availableCopies < 1) throw ApiError.conflict("No copies of this book are currently available");

    await tx.book.update({ where: { id: book.id }, data: { availableCopies: { decrement: 1 } } });

    return tx.borrowRecord.create({
      data: {
        tenantId,
        bookId: book.id,
        studentId: input.studentId,
        borrowerName: input.borrowerName,
        dueDate: input.dueDate,
      },
    });
  });

  res.status(201).json(record);
});

export const returnBook = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);

  const record = await prisma.$transaction(async (tx) => {
    const borrowRecord = await tx.borrowRecord.findFirst({ where: { id: req.params.borrowRecordId, tenantId } });
    if (!borrowRecord) throw ApiError.notFound("Borrow record not found");
    if (borrowRecord.status === "RETURNED") throw ApiError.conflict("This book has already been returned");

    const now = new Date();
    const overdueDays = Math.max(0, Math.ceil((now.getTime() - borrowRecord.dueDate.getTime()) / 86_400_000));
    const fineAmount = overdueDays * DAILY_FINE;

    await tx.book.update({ where: { id: borrowRecord.bookId }, data: { availableCopies: { increment: 1 } } });

    return tx.borrowRecord.update({
      where: { id: borrowRecord.id },
      data: { returnDate: now, status: "RETURNED", fineAmount },
    });
  });

  res.json(record);
});

export const listBorrowRecords = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  const { studentId, status, bookId } = req.query as Record<string, string | undefined>;

  const records = await prisma.borrowRecord.findMany({
    where: { tenantId, studentId, status: status as never, bookId },
    include: { book: true, student: { include: { user: { select: { firstName: true, lastName: true } } } } },
    orderBy: { borrowDate: "desc" },
  });

  const now = new Date();
  const withOverdueFlag = records.map((r) => ({
    ...r,
    isOverdue: r.status === "BORROWED" && r.dueDate < now,
  }));

  res.json(withOverdueFlag);
});
