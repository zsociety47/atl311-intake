CREATE TABLE "operators" (
  "id"        TEXT        NOT NULL,
  "email"     TEXT        NOT NULL,
  "name"      TEXT        NOT NULL,
  "role"      TEXT        NOT NULL DEFAULT 'OPERATOR',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "operators_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "operators_email_key" ON "operators"("email");
CREATE INDEX "operators_email_idx"        ON "operators"("email");

CREATE TABLE "audit_logs" (
  "id"         TEXT         NOT NULL,
  "operatorId" TEXT,
  "caseId"     TEXT,
  "action"     TEXT         NOT NULL,
  "context"    JSONB        NOT NULL,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "audit_logs_operatorId_idx" ON "audit_logs"("operatorId");
CREATE INDEX "audit_logs_caseId_idx"     ON "audit_logs"("caseId");
CREATE INDEX "audit_logs_action_idx"     ON "audit_logs"("action");
CREATE INDEX "audit_logs_createdAt_idx"  ON "audit_logs"("createdAt");

ALTER TABLE "audit_logs"
  ADD CONSTRAINT "audit_logs_operatorId_fkey"
  FOREIGN KEY ("operatorId") REFERENCES "operators"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "audit_logs"
  ADD CONSTRAINT "audit_logs_caseId_fkey"
  FOREIGN KEY ("caseId") REFERENCES "cases"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
