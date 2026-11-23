-- Enforces at most one active sharing record per (caseId, sharedWithUserId)
-- while preserving all historical revoked sharing rows.
CREATE UNIQUE INDEX IF NOT EXISTS "CaseShare_active_unique"
  ON "CaseShare" ("caseId", "sharedWithUserId")
  WHERE "revokedAt" IS NULL;
