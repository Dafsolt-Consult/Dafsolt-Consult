-- Library's cover/ebook fields switch from a plain, hand-typed public URL
-- to a reference (Core FileObject id) into dafsolt-core's Phase F R2-backed
-- file storage, the first real product consumer of that API. Safe rename
-- (no type change, no data): zero Book rows exist in production today.
ALTER TABLE "books" RENAME COLUMN "coverImageUrl" TO "coverImageFileId";
ALTER TABLE "books" RENAME COLUMN "ebookFileUrl" TO "ebookFileFileId";
