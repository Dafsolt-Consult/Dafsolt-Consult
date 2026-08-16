-- Nullable: existing tenants (onboarded before the form collected this)
-- have none on file, same reasoning as the pre-existing address/city/state
-- columns on this table.
ALTER TABLE "tenants" ADD COLUMN "landmark" TEXT;
