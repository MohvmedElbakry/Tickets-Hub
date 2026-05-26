-- Safe non-destructive migration adding missing settings fields
ALTER TABLE "Setting" ADD COLUMN IF NOT EXISTS "service_fee_percent" DOUBLE PRECISION NOT NULL DEFAULT 10;
ALTER TABLE "Setting" ADD COLUMN IF NOT EXISTS "processing_fee_percent" DOUBLE PRECISION NOT NULL DEFAULT 2.75;
ALTER TABLE "Setting" ADD COLUMN IF NOT EXISTS "fixed_fee_egp" DOUBLE PRECISION NOT NULL DEFAULT 3;
