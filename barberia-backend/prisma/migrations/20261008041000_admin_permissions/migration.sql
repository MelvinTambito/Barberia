ALTER TABLE "User" ADD COLUMN "isSuperAdmin" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "permissions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
UPDATE "User" SET "permissions" = ARRAY['CLIENTS','BARBERS','SERVICES','APPOINTMENTS','LOYALTY'] WHERE "role" = 'ADMIN';
UPDATE "User" SET "isSuperAdmin" = true WHERE lower("email") = 'mgtambito@gmail.com' AND "role" = 'ADMIN';
