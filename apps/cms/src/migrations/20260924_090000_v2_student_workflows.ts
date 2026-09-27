import { type MigrateUpArgs, type MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
-- Migration runs in Payload's transaction. Stop all v1 app instances and workers first.
LOCK TABLE invitations, sessions, invitation_claims, payload_jobs IN ACCESS EXCLUSIVE MODE;
DO $$ DECLARE conflicts text; BEGIN
 SELECT string_agg(student::text || '/' || ceremony::text, ', ') INTO conflicts FROM (
 SELECT i.contact_id student, s.ceremony_id ceremony FROM invitations i JOIN sessions s ON s.id=i.session_id
 WHERE i.outcome='accepted' GROUP BY i.contact_id,s.ceremony_id HAVING count(DISTINCT i.session_id)>1) x;
 IF conflicts IS NOT NULL THEN RAISE EXCEPTION 'Conflicting accepted sessions for student/ceremony: %. Resolve before migration.', conflicts; END IF;
 IF EXISTS (SELECT 1 FROM payload_jobs WHERE task_slug='send-sms' AND completed_at IS NULL)
 THEN RAISE EXCEPTION 'Pending SMS jobs exist. Drain or explicitly cancel them before migration.'; END IF;
END $$;
CREATE SCHEMA rasad_v1_archive;
CREATE TABLE rasad_v1_archive.invitations AS TABLE invitations;
CREATE TABLE rasad_v1_archive.sessions AS TABLE sessions;
CREATE TABLE rasad_v1_archive.invitation_claims AS TABLE invitation_claims;
CREATE TABLE rasad_v1_archive.payload_jobs AS TABLE payload_jobs;
CREATE TABLE rasad_v1_archive.payload_jobs_log AS TABLE payload_jobs_log;
CREATE TABLE rasad_v1_archive.contacts AS TABLE contacts;
CREATE TEMP TABLE invitation_mapping ON COMMIT DROP AS
 SELECT i.id old_id, first_value(i.id) OVER (PARTITION BY i.contact_id,s.ceremony_id ORDER BY (i.outcome='accepted') DESC,i.processed_at DESC,i.id DESC) current_id
 FROM invitations i JOIN sessions s ON s.id=i.session_id;
UPDATE payload_locked_documents_rels r SET invitations_id=m.current_id FROM invitation_mapping m WHERE r.invitations_id=m.old_id;
UPDATE payload_jobs j SET input=jsonb_set(j.input,'{invitationId}',to_jsonb(m.current_id)) FROM invitation_mapping m WHERE j.task_slug='send-sms' AND j.input->>'invitationId'=m.old_id::text;
ALTER TABLE invitations ADD COLUMN attempts jsonb;
UPDATE invitations i SET attempts=x.attempts FROM (
 SELECT m.current_id,jsonb_agg(jsonb_build_object('legacyId',a.id,'outcome',a.outcome,'processedSession',a.session_id,'inviter',a.inviter_id,'processedAt',a.processed_at,'note',a.note,'smsStatus',a.sms_status,'contactTarget',a.contact_target,'alternativeSession',a.alternative_session_id) ORDER BY a.processed_at,a.id) attempts
 FROM rasad_v1_archive.invitations a JOIN invitation_mapping m ON m.old_id=a.id GROUP BY m.current_id) x WHERE i.id=x.current_id;
DELETE FROM invitations i USING invitation_mapping m WHERE i.id=m.old_id AND m.old_id<>m.current_id;
DELETE FROM invitation_claims;
ALTER TABLE contacts RENAME TO students;
ALTER SEQUENCE contacts_id_seq RENAME TO students_id_seq;
ALTER TABLE students RENAME COLUMN stop_reason TO removed_reason;
ALTER TABLE students RENAME COLUMN first_attendance_at TO absorbed_at;
ALTER TABLE students ALTER COLUMN grade DROP NOT NULL;
ALTER TYPE enum_contacts_readiness_status RENAME TO enum_students_readiness_status;
ALTER TYPE enum_contacts_lifecycle_status RENAME TO enum_students_lifecycle_status;
ALTER TYPE enum_students_lifecycle_status RENAME VALUE 'interested' TO 'class_seeker';
ALTER TYPE enum_students_lifecycle_status RENAME VALUE 'in_follow_up' TO 'referred_to_teacher';
ALTER TYPE enum_students_lifecycle_status RENAME VALUE 'stabilizing' TO 'absorbed';
ALTER TYPE enum_students_lifecycle_status RENAME VALUE 'stopped' TO 'removed';
CREATE TYPE enum_students_origin AS ENUM('admin','reception_walk_in','import');
ALTER TABLE students ADD COLUMN origin enum_students_origin DEFAULT 'admin' NOT NULL;
ALTER TABLE follow_ups RENAME COLUMN contact_id TO student_id;
ALTER TABLE payload_locked_documents_rels RENAME COLUMN contacts_id TO students_id;
ALTER TABLE invitations RENAME COLUMN contact_id TO student_id;
ALTER TABLE invitations RENAME COLUMN session_id TO processed_session_id;
ALTER TABLE invitations ADD COLUMN ceremony_id integer;
ALTER TABLE invitations ADD COLUMN assigned_session_id integer;
UPDATE invitations i SET ceremony_id=s.ceremony_id, assigned_session_id=CASE WHEN i.outcome='accepted' THEN i.processed_session_id ELSE NULL END FROM sessions s WHERE s.id=i.processed_session_id;
ALTER TABLE invitations ALTER COLUMN ceremony_id SET NOT NULL;
ALTER TABLE invitations DROP COLUMN contact_target;
ALTER TABLE invitations DROP COLUMN alternative_session_id;
ALTER TABLE invitation_claims RENAME COLUMN contact_id TO student_id;
ALTER TABLE invitation_claims ADD COLUMN ceremony_id integer NOT NULL;
ALTER TABLE invitation_claims ADD COLUMN token varchar NOT NULL;
CREATE TYPE enum_users_status AS ENUM('active','inactive');
ALTER TABLE users ADD COLUMN status enum_users_status DEFAULT 'active' NOT NULL;
ALTER TABLE users ADD COLUMN username varchar;
ALTER TABLE users ADD COLUMN teacher_profile_id integer;
ALTER TABLE users ALTER COLUMN email DROP NOT NULL;
ALTER TYPE enum_users_role ADD VALUE 'teacher';
ALTER TYPE enum_users_role ADD VALUE 'receptionist';
ALTER TYPE enum_classes_status ADD VALUE 'transition_to_preliminaries' BEFORE 'admissions_paused';
-- Replacing the ceremony enum permits using its new value in this transaction.
ALTER TABLE ceremonies ALTER COLUMN status DROP DEFAULT;
ALTER TABLE ceremonies ALTER COLUMN status TYPE text USING status::text;
DROP TYPE enum_ceremonies_status;
CREATE TYPE enum_ceremonies_status AS ENUM('draft','scheduled','active','inviting','completed','cancelled');
ALTER TABLE ceremonies ALTER COLUMN status TYPE enum_ceremonies_status USING status::enum_ceremonies_status;
ALTER TABLE ceremonies ALTER COLUMN status SET DEFAULT 'draft';
ALTER TABLE sessions ADD COLUMN title varchar;
ALTER TABLE sessions ADD COLUMN filling_started_at timestamptz(3);
ALTER TABLE sessions ALTER COLUMN ends_at DROP NOT NULL;
ALTER TABLE sessions ALTER COLUMN status DROP DEFAULT;
ALTER TABLE sessions ALTER COLUMN status TYPE text USING status::text;
-- Archive retains the old enum; rename it instead of dropping history dependencies.
ALTER TYPE enum_sessions_status RENAME TO enum_v1_sessions_status;
CREATE TYPE enum_sessions_status AS ENUM('draft','queued','filling','sealed','active','completed','cancelled');
WITH ranked AS (SELECT id,row_number() OVER (PARTITION BY ceremony_id ORDER BY starts_at,id) n FROM sessions WHERE status='open')
UPDATE sessions s SET status=CASE WHEN r.n=1 THEN 'filling' ELSE 'queued' END, filling_started_at=CASE WHEN r.n=1 THEN now() ELSE NULL END FROM ranked r WHERE s.id=r.id;
UPDATE sessions SET status='sealed' WHERE status IN ('full','closed');
ALTER TABLE sessions ALTER COLUMN status TYPE enum_sessions_status USING status::enum_sessions_status;
ALTER TABLE sessions ALTER COLUMN status SET DEFAULT 'draft';
UPDATE ceremonies c SET status='inviting' WHERE c.status IN ('scheduled','active') AND EXISTS(SELECT 1 FROM sessions s WHERE s.ceremony_id=c.id AND s.status='filling');
ALTER TABLE sessions DROP COLUMN grade;
ALTER TABLE sessions DROP COLUMN capacity;
ALTER TABLE "students" DROP CONSTRAINT IF EXISTS "contacts_current_class_id_classes_id_fk";
DROP INDEX IF EXISTS "contacts_grade_idx";
DROP INDEX IF EXISTS "contacts_readiness_status_idx";
DROP INDEX IF EXISTS "contacts_current_class_idx";
DROP INDEX IF EXISTS "contacts_lifecycle_status_idx";
DROP INDEX IF EXISTS "contacts_updated_at_idx";
DROP INDEX IF EXISTS "contacts_created_at_idx";
ALTER TABLE "follow_ups" DROP CONSTRAINT IF EXISTS "follow_ups_contact_id_contacts_id_fk";
ALTER TABLE "follow_ups" DROP CONSTRAINT IF EXISTS "follow_ups_specialist_id_users_id_fk";
DROP INDEX IF EXISTS "follow_ups_contact_idx";
DROP INDEX IF EXISTS "follow_ups_specialist_idx";
DROP INDEX IF EXISTS "follow_ups_updated_at_idx";
DROP INDEX IF EXISTS "follow_ups_created_at_idx";
ALTER TABLE "invitations" DROP CONSTRAINT IF EXISTS "invitations_contact_id_contacts_id_fk";
ALTER TABLE "invitations" DROP CONSTRAINT IF EXISTS "invitations_session_id_sessions_id_fk";
ALTER TABLE "invitations" DROP CONSTRAINT IF EXISTS "invitations_inviter_id_users_id_fk";
ALTER TABLE "invitations" DROP CONSTRAINT IF EXISTS "invitations_alternative_session_id_sessions_id_fk";
DROP INDEX IF EXISTS "invitations_contact_idx";
DROP INDEX IF EXISTS "invitations_session_idx";
DROP INDEX IF EXISTS "invitations_inviter_idx";
DROP INDEX IF EXISTS "invitations_outcome_idx";
DROP INDEX IF EXISTS "invitations_alternative_session_idx";
DROP INDEX IF EXISTS "invitations_updated_at_idx";
DROP INDEX IF EXISTS "invitations_created_at_idx";
ALTER TABLE "invitation_claims" DROP CONSTRAINT IF EXISTS "invitation_claims_session_id_sessions_id_fk";
ALTER TABLE "invitation_claims" DROP CONSTRAINT IF EXISTS "invitation_claims_contact_id_contacts_id_fk";
ALTER TABLE "invitation_claims" DROP CONSTRAINT IF EXISTS "invitation_claims_inviter_id_users_id_fk";
DROP INDEX IF EXISTS "invitation_claims_session_idx";
DROP INDEX IF EXISTS "invitation_claims_contact_idx";
DROP INDEX IF EXISTS "invitation_claims_inviter_idx";
DROP INDEX IF EXISTS "invitation_claims_expires_at_idx";
DROP INDEX IF EXISTS "invitation_claims_updated_at_idx";
DROP INDEX IF EXISTS "invitation_claims_created_at_idx";
ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_parent_fk";
ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_users_fk";
ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_teachers_fk";
ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_classes_fk";
ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_contacts_fk";
ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_follow_ups_fk";
ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_ceremonies_fk";
ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_sessions_fk";
ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_invitations_fk";
ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_invitation_claims_fk";
DROP INDEX IF EXISTS "payload_locked_documents_rels_order_idx";
DROP INDEX IF EXISTS "payload_locked_documents_rels_parent_idx";
DROP INDEX IF EXISTS "payload_locked_documents_rels_path_idx";
DROP INDEX IF EXISTS "payload_locked_documents_rels_users_id_idx";
DROP INDEX IF EXISTS "payload_locked_documents_rels_teachers_id_idx";
DROP INDEX IF EXISTS "payload_locked_documents_rels_classes_id_idx";
DROP INDEX IF EXISTS "payload_locked_documents_rels_contacts_id_idx";
DROP INDEX IF EXISTS "payload_locked_documents_rels_follow_ups_id_idx";
DROP INDEX IF EXISTS "payload_locked_documents_rels_ceremonies_id_idx";
DROP INDEX IF EXISTS "payload_locked_documents_rels_sessions_id_idx";
DROP INDEX IF EXISTS "payload_locked_documents_rels_invitations_id_idx";
DROP INDEX IF EXISTS "payload_locked_documents_rels_invitation_claims_id_idx";
DROP INDEX IF EXISTS "users_updated_at_idx";
DROP INDEX IF EXISTS "users_created_at_idx";
DROP INDEX IF EXISTS "users_email_idx";
ALTER TABLE "sessions" DROP CONSTRAINT IF EXISTS "sessions_ceremony_id_ceremonies_id_fk";
DROP INDEX IF EXISTS "sessions_ceremony_idx";
DROP INDEX IF EXISTS "sessions_starts_at_idx";
DROP INDEX IF EXISTS "sessions_grade_idx";
DROP INDEX IF EXISTS "sessions_status_idx";
DROP INDEX IF EXISTS "sessions_updated_at_idx";
DROP INDEX IF EXISTS "sessions_created_at_idx";
CREATE TYPE enum_session_checkins_source AS ENUM('invited','walk_in');
CREATE TABLE "session_checkins" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"student_id" integer NOT NULL,
  	"session_id" integer NOT NULL,
  	"checked_in_by_id" integer NOT NULL,
  	"checked_in_at" timestamp(3) with time zone NOT NULL,
  	"source" "enum_session_checkins_source" NOT NULL,
  	"note" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
ALTER TABLE payload_locked_documents_rels ADD COLUMN session_checkins_id integer;
ALTER TABLE "users" ADD CONSTRAINT "users_teacher_profile_id_teachers_id_fk" FOREIGN KEY ("teacher_profile_id") REFERENCES "public"."teachers"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "students" ADD CONSTRAINT "students_current_class_id_classes_id_fk" FOREIGN KEY ("current_class_id") REFERENCES "public"."classes"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_specialist_id_users_id_fk" FOREIGN KEY ("specialist_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_ceremony_id_ceremonies_id_fk" FOREIGN KEY ("ceremony_id") REFERENCES "public"."ceremonies"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_ceremony_id_ceremonies_id_fk" FOREIGN KEY ("ceremony_id") REFERENCES "public"."ceremonies"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_assigned_session_id_sessions_id_fk" FOREIGN KEY ("assigned_session_id") REFERENCES "public"."sessions"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_processed_session_id_sessions_id_fk" FOREIGN KEY ("processed_session_id") REFERENCES "public"."sessions"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_inviter_id_users_id_fk" FOREIGN KEY ("inviter_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "invitation_claims" ADD CONSTRAINT "invitation_claims_ceremony_id_ceremonies_id_fk" FOREIGN KEY ("ceremony_id") REFERENCES "public"."ceremonies"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "invitation_claims" ADD CONSTRAINT "invitation_claims_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "invitation_claims" ADD CONSTRAINT "invitation_claims_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "invitation_claims" ADD CONSTRAINT "invitation_claims_inviter_id_users_id_fk" FOREIGN KEY ("inviter_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "session_checkins" ADD CONSTRAINT "session_checkins_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "session_checkins" ADD CONSTRAINT "session_checkins_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "session_checkins" ADD CONSTRAINT "session_checkins_checked_in_by_id_users_id_fk" FOREIGN KEY ("checked_in_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_locked_documents"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_teachers_fk" FOREIGN KEY ("teachers_id") REFERENCES "public"."teachers"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_classes_fk" FOREIGN KEY ("classes_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_students_fk" FOREIGN KEY ("students_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_follow_ups_fk" FOREIGN KEY ("follow_ups_id") REFERENCES "public"."follow_ups"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_ceremonies_fk" FOREIGN KEY ("ceremonies_id") REFERENCES "public"."ceremonies"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_sessions_fk" FOREIGN KEY ("sessions_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_invitations_fk" FOREIGN KEY ("invitations_id") REFERENCES "public"."invitations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_invitation_claims_fk" FOREIGN KEY ("invitation_claims_id") REFERENCES "public"."invitation_claims"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_session_checkins_fk" FOREIGN KEY ("session_checkins_id") REFERENCES "public"."session_checkins"("id") ON DELETE cascade ON UPDATE no action;
CREATE UNIQUE INDEX "users_teacher_profile_idx" ON "users" USING btree ("teacher_profile_id");
CREATE INDEX "users_updated_at_idx" ON "users" USING btree ("updated_at");
CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");
CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");
CREATE UNIQUE INDEX "users_username_idx" ON "users" USING btree ("username");
CREATE INDEX "students_grade_idx" ON "students" USING btree ("grade");
CREATE INDEX "students_readiness_status_idx" ON "students" USING btree ("readiness_status");
CREATE INDEX "students_current_class_idx" ON "students" USING btree ("current_class_id");
CREATE INDEX "students_lifecycle_status_idx" ON "students" USING btree ("lifecycle_status");
CREATE INDEX "students_updated_at_idx" ON "students" USING btree ("updated_at");
CREATE INDEX "students_created_at_idx" ON "students" USING btree ("created_at");
CREATE INDEX "follow_ups_student_idx" ON "follow_ups" USING btree ("student_id");
CREATE INDEX "follow_ups_specialist_idx" ON "follow_ups" USING btree ("specialist_id");
CREATE INDEX "follow_ups_updated_at_idx" ON "follow_ups" USING btree ("updated_at");
CREATE INDEX "follow_ups_created_at_idx" ON "follow_ups" USING btree ("created_at");
CREATE INDEX "sessions_ceremony_idx" ON "sessions" USING btree ("ceremony_id");
CREATE INDEX "sessions_starts_at_idx" ON "sessions" USING btree ("starts_at");
CREATE INDEX "sessions_status_idx" ON "sessions" USING btree ("status");
CREATE INDEX "sessions_updated_at_idx" ON "sessions" USING btree ("updated_at");
CREATE INDEX "sessions_created_at_idx" ON "sessions" USING btree ("created_at");
CREATE INDEX "invitations_student_idx" ON "invitations" USING btree ("student_id");
CREATE INDEX "invitations_ceremony_idx" ON "invitations" USING btree ("ceremony_id");
CREATE INDEX "invitations_assigned_session_idx" ON "invitations" USING btree ("assigned_session_id");
CREATE INDEX "invitations_processed_session_idx" ON "invitations" USING btree ("processed_session_id");
CREATE INDEX "invitations_inviter_idx" ON "invitations" USING btree ("inviter_id");
CREATE INDEX "invitations_outcome_idx" ON "invitations" USING btree ("outcome");
CREATE INDEX "invitations_updated_at_idx" ON "invitations" USING btree ("updated_at");
CREATE INDEX "invitations_created_at_idx" ON "invitations" USING btree ("created_at");
CREATE UNIQUE INDEX "student_ceremony_idx" ON "invitations" USING btree ("student_id","ceremony_id");
CREATE INDEX "invitation_claims_ceremony_idx" ON "invitation_claims" USING btree ("ceremony_id");
CREATE INDEX "invitation_claims_session_idx" ON "invitation_claims" USING btree ("session_id");
CREATE INDEX "invitation_claims_student_idx" ON "invitation_claims" USING btree ("student_id");
CREATE INDEX "invitation_claims_inviter_idx" ON "invitation_claims" USING btree ("inviter_id");
CREATE UNIQUE INDEX "invitation_claims_token_idx" ON "invitation_claims" USING btree ("token");
CREATE INDEX "invitation_claims_expires_at_idx" ON "invitation_claims" USING btree ("expires_at");
CREATE INDEX "invitation_claims_updated_at_idx" ON "invitation_claims" USING btree ("updated_at");
CREATE INDEX "invitation_claims_created_at_idx" ON "invitation_claims" USING btree ("created_at");
CREATE UNIQUE INDEX "student_ceremony_1_idx" ON "invitation_claims" USING btree ("student_id","ceremony_id");
CREATE UNIQUE INDEX "inviter_ceremony_idx" ON "invitation_claims" USING btree ("inviter_id","ceremony_id");
CREATE INDEX "session_checkins_student_idx" ON "session_checkins" USING btree ("student_id");
CREATE INDEX "session_checkins_session_idx" ON "session_checkins" USING btree ("session_id");
CREATE INDEX "session_checkins_checked_in_by_idx" ON "session_checkins" USING btree ("checked_in_by_id");
CREATE INDEX "session_checkins_updated_at_idx" ON "session_checkins" USING btree ("updated_at");
CREATE INDEX "session_checkins_created_at_idx" ON "session_checkins" USING btree ("created_at");
CREATE UNIQUE INDEX "student_session_idx" ON "session_checkins" USING btree ("student_id","session_id");
CREATE INDEX "payload_locked_documents_rels_order_idx" ON "payload_locked_documents_rels" USING btree ("order");
CREATE INDEX "payload_locked_documents_rels_parent_idx" ON "payload_locked_documents_rels" USING btree ("parent_id");
CREATE INDEX "payload_locked_documents_rels_path_idx" ON "payload_locked_documents_rels" USING btree ("path");
CREATE INDEX "payload_locked_documents_rels_users_id_idx" ON "payload_locked_documents_rels" USING btree ("users_id");
CREATE INDEX "payload_locked_documents_rels_teachers_id_idx" ON "payload_locked_documents_rels" USING btree ("teachers_id");
CREATE INDEX "payload_locked_documents_rels_classes_id_idx" ON "payload_locked_documents_rels" USING btree ("classes_id");
CREATE INDEX "payload_locked_documents_rels_students_id_idx" ON "payload_locked_documents_rels" USING btree ("students_id");
CREATE INDEX "payload_locked_documents_rels_follow_ups_id_idx" ON "payload_locked_documents_rels" USING btree ("follow_ups_id");
CREATE INDEX "payload_locked_documents_rels_ceremonies_id_idx" ON "payload_locked_documents_rels" USING btree ("ceremonies_id");
CREATE INDEX "payload_locked_documents_rels_sessions_id_idx" ON "payload_locked_documents_rels" USING btree ("sessions_id");
CREATE INDEX "payload_locked_documents_rels_invitations_id_idx" ON "payload_locked_documents_rels" USING btree ("invitations_id");
CREATE INDEX "payload_locked_documents_rels_invitation_claims_id_idx" ON "payload_locked_documents_rels" USING btree ("invitation_claims_id");
CREATE INDEX "payload_locked_documents_rels_session_checkins_id_idx" ON "payload_locked_documents_rels" USING btree ("session_checkins_id");
CREATE UNIQUE INDEX sessions_one_filling_per_ceremony ON sessions(ceremony_id) WHERE status='filling';
`)
}

export async function down(_args: MigrateDownArgs): Promise<void> {
  throw new Error(
    'v2 migration is forward-only. Restore the verified pre-migration database backup to roll back.',
  )
}
