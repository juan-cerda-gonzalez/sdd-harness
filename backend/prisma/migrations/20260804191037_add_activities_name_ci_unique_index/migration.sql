-- Enforce case-insensitive uniqueness of Activity.name at the database level.
-- Prisma schema syntax has no expression-index support, so this index is
-- hand-written rather than generated from schema.prisma.
CREATE UNIQUE INDEX "activities_name_lower_key" ON "activities" (LOWER("name"));
