-- Preserve refunds for existing points reservations created before the snapshot column.
UPDATE "Appointment" AS a
SET "redeemedPoints" = COALESCE(s."requiredPoints", 0)
FROM "Service" AS s
WHERE a."serviceId" = s.id AND a."paidWithPoints" = true AND a."redeemedPoints" = 0;
