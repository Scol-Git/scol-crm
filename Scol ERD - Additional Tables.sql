-- Additional Tables for Features Implemented in Frontend
-- This file contains database schema for features that exist in the frontend but are missing from the main ERD

-- ============================================
-- APPLICATION MANAGEMENT SYSTEM
-- ============================================

-- Main Applications table to track student applications to universities
CREATE TABLE "Applications" (
  "id" uuid PRIMARY KEY,
  "leadId" uuid NOT NULL,
  "uniCourseId" uuid NOT NULL,
  "courseIntakeId" uuid,
  "status" varchar NOT NULL, -- draft, submitted, under_review, conditional_offer, accepted, rejected, visa_processing, enrolled
  "appliedDate" date NOT NULL,
  "lastUpdated" timestamp DEFAULT CURRENT_TIMESTAMP,
  "documents" jsonb, -- Array of document types: passport, transcript, englishTest, sop, lor, financialProof
  "notes" text,
  "offerLetterDate" date,
  "depositPaid" boolean DEFAULT false,
  "visaStatus" varchar, -- processing, approved, rejected
  "visaApprovalDate" date,
  "rejectionReason" text,
  "conditions" jsonb, -- Array of conditional offer conditions
  "createdAt" timestamp DEFAULT CURRENT_TIMESTAMP,
  "updatedBy" uuid,
  CONSTRAINT "chk_status" CHECK ("status" IN ('draft', 'submitted', 'under_review', 'conditional_offer', 'accepted', 'rejected', 'visa_processing', 'enrolled')),
  CONSTRAINT "chk_visa_status" CHECK ("visaStatus" IN ('processing', 'approved', 'rejected'))
);

-- ============================================
-- LEAD JOURNEY/TIMELINE TRACKING
-- ============================================

-- Journey Events table to track all important events in a lead's lifecycle
CREATE TABLE "JourneyEvents" (
  "id" uuid PRIMARY KEY,
  "leadId" uuid NOT NULL,
  "type" varchar NOT NULL, -- lead_created, contacted, application_submitted, status_change, offer_received, deposit_paid, visa_approved, enrolled, document_uploaded, etc.
  "date" timestamp DEFAULT CURRENT_TIMESTAMP,
  "title" varchar NOT NULL,
  "description" text,
  "metadata" jsonb, -- Additional event-specific data
  "createdBy" uuid,
  "createdAt" timestamp DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "chk_event_type" CHECK ("type" IN (
    'lead_created', 'contacted', 'application_submitted', 'status_change',
    'offer_received', 'deposit_paid', 'visa_approved', 'visa_rejected',
    'enrolled', 'document_uploaded', 'interview_scheduled', 'follow_up',
    'note_added', 'status_updated', 'lost', 'reengaged'
  ))
);

-- ============================================
-- TASK MANAGEMENT SYSTEM
-- ============================================

-- Tasks table for follow-ups and action items
CREATE TABLE "Tasks" (
  "id" uuid PRIMARY KEY,
  "leadId" uuid,
  "title" varchar NOT NULL,
  "description" text,
  "dueDate" date NOT NULL,
  "priority" varchar NOT NULL DEFAULT 'medium',
  "status" varchar NOT NULL DEFAULT 'pending',
  "assignedTo" uuid, -- Reference to sys_Users
  "createdBy" uuid,
  "createdAt" timestamp DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp DEFAULT CURRENT_TIMESTAMP,
  "completedAt" timestamp,
  "completedBy" uuid,
  CONSTRAINT "chk_priority" CHECK ("priority" IN ('low', 'medium', 'high', 'urgent')),
  CONSTRAINT "chk_task_status" CHECK ("status" IN ('pending', 'in_progress', 'completed', 'cancelled'))
);

-- ============================================
-- EXTENDED LEAD PROFILE FIELDS
-- ============================================

-- Add missing columns to sys_LeadProfiles
ALTER TABLE "sys_LeadProfiles"
  ADD COLUMN "status" varchar DEFAULT 'new',
  ADD COLUMN "targetUniversity" varchar,
  ADD COLUMN "createdAt" timestamp DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "updatedAt" timestamp DEFAULT CURRENT_TIMESTAMP,
  ADD CONSTRAINT "chk_lead_status" CHECK ("status" IN ('new', 'contacted', 'qualified', 'enrolled', 'lost'));

-- ============================================
-- REPORTING & ANALYTICS TABLES
-- ============================================

-- Monthly Statistics aggregation table (can be materialized view or table)
CREATE TABLE "MonthlyStats" (
  "id" uuid PRIMARY KEY,
  "month" date NOT NULL, -- First day of the month
  "totalLeads" int DEFAULT 0,
  "totalApplications" int DEFAULT 0,
  "totalAccepted" int DEFAULT 0,
  "totalEnrolled" int DEFAULT 0,
  "totalRevenue" decimal DEFAULT 0,
  "createdAt" timestamp DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("month")
);

-- Country-wise Statistics aggregation table
CREATE TABLE "CountryStats" (
  "id" uuid PRIMARY KEY,
  "sysCountryId" uuid NOT NULL,
  "period" date NOT NULL, -- First day of the reporting period (month/year)
  "totalApplications" int DEFAULT 0,
  "totalAccepted" int DEFAULT 0,
  "totalEnrolled" int DEFAULT 0,
  "totalRevenue" decimal DEFAULT 0,
  "createdAt" timestamp DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("sysCountryId", "period")
);

-- ============================================
-- DOCUMENT MANAGEMENT
-- ============================================

-- Documents table to track uploaded documents
CREATE TABLE "Documents" (
  "id" uuid PRIMARY KEY,
  "leadId" uuid NOT NULL,
  "applicationId" uuid,
  "documentType" varchar NOT NULL, -- passport, transcript, englishTest, sop, lor, financialProof, visa, offerLetter, etc.
  "fileName" varchar NOT NULL,
  "fileUrl" varchar NOT NULL,
  "fileSize" bigint,
  "mimeType" varchar,
  "isVerified" boolean DEFAULT false,
  "verifiedBy" uuid,
  "verifiedAt" timestamp,
  "uploadedBy" uuid NOT NULL,
  "uploadedAt" timestamp DEFAULT CURRENT_TIMESTAMP,
  "notes" text
);

-- ============================================
-- NOTIFICATIONS SYSTEM
-- ============================================

-- Notifications table for in-app notifications
CREATE TABLE "Notifications" (
  "id" uuid PRIMARY KEY,
  "userId" uuid NOT NULL,
  "type" varchar NOT NULL, -- application_update, task_reminder, document_request, offer_received, etc.
  "title" varchar NOT NULL,
  "message" text NOT NULL,
  "isRead" boolean DEFAULT false,
  "link" varchar, -- Link to relevant page
  "metadata" jsonb,
  "createdAt" timestamp DEFAULT CURRENT_TIMESTAMP,
  "readAt" timestamp
);

-- ============================================
-- COMMUNICATION LOGS
-- ============================================

-- Communication logs to track all interactions with leads
CREATE TABLE "CommunicationLogs" (
  "id" uuid PRIMARY KEY,
  "leadId" uuid NOT NULL,
  "type" varchar NOT NULL, -- call, email, sms, whatsapp, meeting, etc.
  "direction" varchar NOT NULL, -- inbound, outbound
  "subject" varchar,
  "message" text,
  "duration" int, -- in seconds for calls/meetings
  "outcome" varchar, -- successful, no_answer, voicemail, etc.
  "scheduledFor" timestamp,
  "completedAt" timestamp,
  "createdBy" uuid NOT NULL,
  "createdAt" timestamp DEFAULT CURRENT_TIMESTAMP,
  "metadata" jsonb,
  CONSTRAINT "chk_comm_type" CHECK ("type" IN ('call', 'email', 'sms', 'whatsapp', 'meeting', 'video_call', 'other')),
  CONSTRAINT "chk_direction" CHECK ("direction" IN ('inbound', 'outbound'))
);

-- ============================================
-- FOREIGN KEY CONSTRAINTS
-- ============================================

-- Applications table constraints
ALTER TABLE "Applications" ADD FOREIGN KEY ("leadId") REFERENCES "sys_LeadProfiles" ("id") ON DELETE CASCADE;
ALTER TABLE "Applications" ADD FOREIGN KEY ("uniCourseId") REFERENCES "UniCourses" ("id");
ALTER TABLE "Applications" ADD FOREIGN KEY ("courseIntakeId") REFERENCES "UniCourseIntakes" ("id");
ALTER TABLE "Applications" ADD FOREIGN KEY ("updatedBy") REFERENCES "sys_Users" ("id");

-- Journey Events constraints
ALTER TABLE "JourneyEvents" ADD FOREIGN KEY ("leadId") REFERENCES "sys_LeadProfiles" ("id") ON DELETE CASCADE;
ALTER TABLE "JourneyEvents" ADD FOREIGN KEY ("createdBy") REFERENCES "sys_Users" ("id");

-- Tasks constraints
ALTER TABLE "Tasks" ADD FOREIGN KEY ("leadId") REFERENCES "sys_LeadProfiles" ("id") ON DELETE CASCADE;
ALTER TABLE "Tasks" ADD FOREIGN KEY ("assignedTo") REFERENCES "sys_Users" ("id");
ALTER TABLE "Tasks" ADD FOREIGN KEY ("createdBy") REFERENCES "sys_Users" ("id");
ALTER TABLE "Tasks" ADD FOREIGN KEY ("completedBy") REFERENCES "sys_Users" ("id");

-- Country Stats constraints
ALTER TABLE "CountryStats" ADD FOREIGN KEY ("sysCountryId") REFERENCES "sys_Countries" ("id");

-- Documents constraints
ALTER TABLE "Documents" ADD FOREIGN KEY ("leadId") REFERENCES "sys_LeadProfiles" ("id") ON DELETE CASCADE;
ALTER TABLE "Documents" ADD FOREIGN KEY ("applicationId") REFERENCES "Applications" ("id") ON DELETE CASCADE;
ALTER TABLE "Documents" ADD FOREIGN KEY ("uploadedBy") REFERENCES "sys_Users" ("id");
ALTER TABLE "Documents" ADD FOREIGN KEY ("verifiedBy") REFERENCES "sys_Users" ("id");

-- Notifications constraints
ALTER TABLE "Notifications" ADD FOREIGN KEY ("userId") REFERENCES "sys_Users" ("id") ON DELETE CASCADE;

-- Communication Logs constraints
ALTER TABLE "CommunicationLogs" ADD FOREIGN KEY ("leadId") REFERENCES "sys_LeadProfiles" ("id") ON DELETE CASCADE;
ALTER TABLE "CommunicationLogs" ADD FOREIGN KEY ("createdBy") REFERENCES "sys_Users" ("id");

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- Applications indexes
CREATE INDEX "idx_applications_leadId" ON "Applications" ("leadId");
CREATE INDEX "idx_applications_status" ON "Applications" ("status");
CREATE INDEX "idx_applications_appliedDate" ON "Applications" ("appliedDate");
CREATE INDEX "idx_applications_uniCourseId" ON "Applications" ("uniCourseId");

-- Journey Events indexes
CREATE INDEX "idx_journey_leadId" ON "JourneyEvents" ("leadId");
CREATE INDEX "idx_journey_type" ON "JourneyEvents" ("type");
CREATE INDEX "idx_journey_date" ON "JourneyEvents" ("date");

-- Tasks indexes
CREATE INDEX "idx_tasks_leadId" ON "Tasks" ("leadId");
CREATE INDEX "idx_tasks_assignedTo" ON "Tasks" ("assignedTo");
CREATE INDEX "idx_tasks_status" ON "Tasks" ("status");
CREATE INDEX "idx_tasks_dueDate" ON "Tasks" ("dueDate");
CREATE INDEX "idx_tasks_priority" ON "Tasks" ("priority");

-- Documents indexes
CREATE INDEX "idx_documents_leadId" ON "Documents" ("leadId");
CREATE INDEX "idx_documents_applicationId" ON "Documents" ("applicationId");
CREATE INDEX "idx_documents_type" ON "Documents" ("documentType");

-- Notifications indexes
CREATE INDEX "idx_notifications_userId" ON "Notifications" ("userId");
CREATE INDEX "idx_notifications_isRead" ON "Notifications" ("isRead");
CREATE INDEX "idx_notifications_createdAt" ON "Notifications" ("createdAt");

-- Communication Logs indexes
CREATE INDEX "idx_comm_leadId" ON "CommunicationLogs" ("leadId");
CREATE INDEX "idx_comm_type" ON "CommunicationLogs" ("type");
CREATE INDEX "idx_comm_createdAt" ON "CommunicationLogs" ("createdAt");

-- Lead Profile status index
CREATE INDEX "idx_lead_status" ON "sys_LeadProfiles" ("status");

-- ============================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- ============================================

-- Trigger to update Applications.lastUpdated timestamp
CREATE OR REPLACE FUNCTION update_application_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW."lastUpdated" = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "trg_applications_update"
BEFORE UPDATE ON "Applications"
FOR EACH ROW
EXECUTE FUNCTION update_application_timestamp();

-- Trigger to update Tasks.updatedAt timestamp
CREATE OR REPLACE FUNCTION update_task_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "trg_tasks_update"
BEFORE UPDATE ON "Tasks"
FOR EACH ROW
EXECUTE FUNCTION update_task_timestamp();

-- Trigger to create journey event when application status changes
CREATE OR REPLACE FUNCTION create_application_journey_event()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'UPDATE' AND OLD."status" IS DISTINCT FROM NEW."status") THEN
    INSERT INTO "JourneyEvents" ("id", "leadId", "type", "title", "description", "metadata")
    VALUES (
      gen_random_uuid(),
      NEW."leadId",
      'status_change',
      'Application Status Updated',
      'Application status changed from ' || OLD."status" || ' to ' || NEW."status",
      jsonb_build_object(
        'applicationId', NEW."id",
        'oldStatus', OLD."status",
        'newStatus', NEW."status"
      )
    );
  ELSIF (TG_OP = 'INSERT') THEN
    INSERT INTO "JourneyEvents" ("id", "leadId", "type", "title", "description", "metadata")
    VALUES (
      gen_random_uuid(),
      NEW."leadId",
      'application_submitted',
      'Application Submitted',
      'New application created',
      jsonb_build_object('applicationId', NEW."id", 'status', NEW."status")
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "trg_application_journey"
AFTER INSERT OR UPDATE ON "Applications"
FOR EACH ROW
EXECUTE FUNCTION create_application_journey_event();

-- ============================================
-- VIEWS FOR REPORTING
-- ============================================

-- View for application statistics by status
CREATE OR REPLACE VIEW "vw_ApplicationStats" AS
SELECT
  "status",
  COUNT(*) as "count",
  COUNT(DISTINCT "leadId") as "uniqueLeads",
  AVG(EXTRACT(DAY FROM ("lastUpdated" - "appliedDate"))) as "avgProcessingDays"
FROM "Applications"
GROUP BY "status";

-- View for lead conversion funnel
CREATE OR REPLACE VIEW "vw_LeadConversionFunnel" AS
SELECT
  COUNT(DISTINCT CASE WHEN lp."status" = 'new' THEN lp."id" END) as "newLeads",
  COUNT(DISTINCT CASE WHEN lp."status" = 'contacted' THEN lp."id" END) as "contactedLeads",
  COUNT(DISTINCT CASE WHEN lp."status" = 'qualified' THEN lp."id" END) as "qualifiedLeads",
  COUNT(DISTINCT CASE WHEN a."status" IN ('submitted', 'under_review') THEN lp."id" END) as "appliedLeads",
  COUNT(DISTINCT CASE WHEN a."status" = 'accepted' THEN lp."id" END) as "acceptedLeads",
  COUNT(DISTINCT CASE WHEN lp."status" = 'enrolled' THEN lp."id" END) as "enrolledLeads"
FROM "sys_LeadProfiles" lp
LEFT JOIN "Applications" a ON a."leadId" = lp."id";

-- View for pending tasks summary
CREATE OR REPLACE VIEW "vw_PendingTasksSummary" AS
SELECT
  t."assignedTo",
  u."email" as "assignedToEmail",
  COUNT(*) as "totalTasks",
  COUNT(CASE WHEN t."priority" = 'urgent' THEN 1 END) as "urgentTasks",
  COUNT(CASE WHEN t."priority" = 'high' THEN 1 END) as "highPriorityTasks",
  COUNT(CASE WHEN t."dueDate" < CURRENT_DATE THEN 1 END) as "overdueTasks"
FROM "Tasks" t
LEFT JOIN "sys_Users" u ON u."id" = t."assignedTo"
WHERE t."status" IN ('pending', 'in_progress')
GROUP BY t."assignedTo", u."email";

-- ============================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON TABLE "Applications" IS 'Stores all student applications to university courses';
COMMENT ON TABLE "JourneyEvents" IS 'Timeline of all important events in a lead''s journey';
COMMENT ON TABLE "Tasks" IS 'Follow-up tasks and action items for leads';
COMMENT ON TABLE "Documents" IS 'All documents uploaded by or for leads';
COMMENT ON TABLE "Notifications" IS 'In-app notifications for users';
COMMENT ON TABLE "CommunicationLogs" IS 'Log of all communications with leads';
COMMENT ON TABLE "MonthlyStats" IS 'Aggregated monthly statistics for reporting';
COMMENT ON TABLE "CountryStats" IS 'Country-wise performance statistics';

COMMENT ON COLUMN "sys_LeadProfiles"."status" IS 'Current stage of the lead in the conversion funnel';
COMMENT ON COLUMN "sys_LeadProfiles"."targetUniversity" IS 'Lead''s preferred/target university';
COMMENT ON COLUMN "Applications"."status" IS 'Current status of the application';
COMMENT ON COLUMN "Applications"."documents" IS 'JSON array of submitted document types';
COMMENT ON COLUMN "Applications"."conditions" IS 'JSON array of conditions for conditional offers';
COMMENT ON COLUMN "JourneyEvents"."type" IS 'Type of event that occurred';
COMMENT ON COLUMN "Tasks"."priority" IS 'Priority level of the task';
COMMENT ON COLUMN "Tasks"."status" IS 'Current status of the task';
