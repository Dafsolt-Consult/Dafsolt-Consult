import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth";
import * as libraryController from "./library.controller";

const router = Router();
router.use(authenticate);

const librarianRoles = authorize("SCHOOL_ADMIN", "LIBRARIAN");
const readRoles = authorize("SCHOOL_ADMIN", "LIBRARIAN", "TEACHER", "STUDENT", "PARENT");

router.get("/categories", readRoles, libraryController.listCategories);
router.post("/categories", librarianRoles, libraryController.createCategory);

router.get("/books", readRoles, libraryController.listBooks);
router.post("/books", librarianRoles, libraryController.createBook);
router.get("/books/:bookId", readRoles, libraryController.getBook);
router.patch("/books/:bookId", librarianRoles, libraryController.updateBook);
router.delete("/books/:bookId", librarianRoles, libraryController.deleteBook);
router.post("/books/:bookId/borrow", librarianRoles, libraryController.borrowBook);

router.get("/borrow-records", readRoles, libraryController.listBorrowRecords);
router.post("/borrow-records/:borrowRecordId/return", librarianRoles, libraryController.returnBook);

export default router;
