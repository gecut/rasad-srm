import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  const state = await db.execute(
    sql`SELECT to_regclass('public.contacts') AS contacts, to_regclass('public.students') AS students, to_regclass('public.users') AS users`,
  )
  if (state.rows[0]?.contacts) {
    await db.execute(sql`DO $$ BEGIN
      IF EXISTS (SELECT 1 FROM (VALUES ('users_sessions', '_order'),
('users_sessions', '_parent_id'),
('users_sessions', 'id'),
('users_sessions', 'created_at'),
('users_sessions', 'expires_at'),
('users', 'id'),
('users', 'name'),
('users', 'role'),
('users', 'updated_at'),
('users', 'created_at'),
('users', 'email'),
('users', 'reset_password_token'),
('users', 'reset_password_expiration'),
('users', 'salt'),
('users', 'hash'),
('users', 'login_attempts'),
('users', 'lock_until'),
('teachers', 'id'),
('teachers', 'first_name'),
('teachers', 'last_name'),
('teachers', 'mobile'),
('teachers', 'status'),
('teachers', 'updated_at'),
('teachers', 'created_at'),
('classes', 'id'),
('classes', 'title'),
('classes', 'primary_teacher_id'),
('classes', 'capacity'),
('classes', 'status'),
('classes', 'updated_at'),
('classes', 'created_at'),
('classes_rels', 'id'),
('classes_rels', 'order'),
('classes_rels', 'parent_id'),
('classes_rels', 'path'),
('classes_rels', 'teachers_id'),
('contacts', 'id'),
('contacts', 'first_name'),
('contacts', 'last_name'),
('contacts', 'mobile'),
('contacts', 'mother_mobile'),
('contacts', 'father_mobile'),
('contacts', 'grade'),
('contacts', 'readiness_status'),
('contacts', 'current_class_id'),
('contacts', 'lifecycle_status'),
('contacts', 'stop_reason'),
('contacts', 'referred_at'),
('contacts', 'first_attendance_at'),
('contacts', 'stabilized_at'),
('contacts', 'updated_at'),
('contacts', 'created_at'),
('follow_ups', 'id'),
('follow_ups', 'contact_id'),
('follow_ups', 'specialist_id'),
('follow_ups', 'note'),
('follow_ups', 'updated_at'),
('follow_ups', 'created_at'),
('ceremonies', 'id'),
('ceremonies', 'title'),
('ceremonies', 'description'),
('ceremonies', 'status'),
('ceremonies', 'updated_at'),
('ceremonies', 'created_at'),
('sessions', 'id'),
('sessions', 'ceremony_id'),
('sessions', 'starts_at'),
('sessions', 'ends_at'),
('sessions', 'grade'),
('sessions', 'capacity'),
('sessions', 'status'),
('sessions', 'updated_at'),
('sessions', 'created_at'),
('invitations', 'id'),
('invitations', 'contact_id'),
('invitations', 'session_id'),
('invitations', 'inviter_id'),
('invitations', 'contact_target'),
('invitations', 'outcome'),
('invitations', 'note'),
('invitations', 'alternative_session_id'),
('invitations', 'sms_status'),
('invitations', 'processed_at'),
('invitations', 'updated_at'),
('invitations', 'created_at'),
('invitation_claims', 'id'),
('invitation_claims', 'session_id'),
('invitation_claims', 'contact_id'),
('invitation_claims', 'inviter_id'),
('invitation_claims', 'expires_at'),
('invitation_claims', 'updated_at'),
('invitation_claims', 'created_at'),
('payload_kv', 'id'),
('payload_kv', 'key'),
('payload_kv', 'data'),
('payload_jobs_log', '_order'),
('payload_jobs_log', '_parent_id'),
('payload_jobs_log', 'id'),
('payload_jobs_log', 'executed_at'),
('payload_jobs_log', 'completed_at'),
('payload_jobs_log', 'task_slug'),
('payload_jobs_log', 'task_i_d'),
('payload_jobs_log', 'input'),
('payload_jobs_log', 'output'),
('payload_jobs_log', 'state'),
('payload_jobs_log', 'error'),
('payload_jobs', 'id'),
('payload_jobs', 'input'),
('payload_jobs', 'completed_at'),
('payload_jobs', 'total_tried'),
('payload_jobs', 'has_error'),
('payload_jobs', 'error'),
('payload_jobs', 'task_slug'),
('payload_jobs', 'queue'),
('payload_jobs', 'wait_until'),
('payload_jobs', 'processing'),
('payload_jobs', 'updated_at'),
('payload_jobs', 'created_at'),
('payload_locked_documents', 'id'),
('payload_locked_documents', 'global_slug'),
('payload_locked_documents', 'updated_at'),
('payload_locked_documents', 'created_at'),
('payload_locked_documents_rels', 'id'),
('payload_locked_documents_rels', 'order'),
('payload_locked_documents_rels', 'parent_id'),
('payload_locked_documents_rels', 'path'),
('payload_locked_documents_rels', 'users_id'),
('payload_locked_documents_rels', 'teachers_id'),
('payload_locked_documents_rels', 'classes_id'),
('payload_locked_documents_rels', 'contacts_id'),
('payload_locked_documents_rels', 'follow_ups_id'),
('payload_locked_documents_rels', 'ceremonies_id'),
('payload_locked_documents_rels', 'sessions_id'),
('payload_locked_documents_rels', 'invitations_id'),
('payload_locked_documents_rels', 'invitation_claims_id'),
('payload_preferences', 'id'),
('payload_preferences', 'key'),
('payload_preferences', 'value'),
('payload_preferences', 'updated_at'),
('payload_preferences', 'created_at'),
('payload_preferences_rels', 'id'),
('payload_preferences_rels', 'order'),
('payload_preferences_rels', 'parent_id'),
('payload_preferences_rels', 'path'),
('payload_preferences_rels', 'users_id')) AS expected(table_name, column_name)
        WHERE NOT EXISTS (SELECT 1 FROM information_schema.columns actual WHERE actual.table_schema='public' AND actual.table_name=expected.table_name AND actual.column_name=expected.column_name))
      THEN RAISE EXCEPTION 'Incomplete v1 schema: restore/repair the source before migrating'; END IF;
    END $$`)
    return
  }
  if (state.rows[0]?.students || state.rows[0]?.users)
    throw new Error(
      'Unrecognized database schema: baseline requires empty database or complete v1 schema',
    )
  await db.execute(sql`
   CREATE TYPE "public"."enum_users_role" AS ENUM('admin', 'employee', 'follow_up_specialist', 'inviter');
  CREATE TYPE "public"."enum_teachers_status" AS ENUM('active', 'inactive');
  CREATE TYPE "public"."enum_classes_status" AS ENUM('planned', 'active', 'admissions_paused', 'suspended', 'ended', 'cancelled');
  CREATE TYPE "public"."enum_contacts_readiness_status" AS ENUM('normal', 'waitlisted');
  CREATE TYPE "public"."enum_contacts_lifecycle_status" AS ENUM('unknown', 'interested', 'in_follow_up', 'stabilizing', 'stabilized', 'stopped');
  CREATE TYPE "public"."enum_ceremonies_status" AS ENUM('draft', 'scheduled', 'active', 'completed', 'cancelled');
  CREATE TYPE "public"."enum_sessions_status" AS ENUM('draft', 'open', 'full', 'closed', 'completed', 'cancelled');
  CREATE TYPE "public"."enum_invitations_contact_target" AS ENUM('self', 'mother', 'father');
  CREATE TYPE "public"."enum_invitations_outcome" AS ENUM('accepted', 'needs_alternative_session', 'no_answer_sms', 'failed');
  CREATE TYPE "public"."enum_invitations_sms_status" AS ENUM('not_required', 'queued', 'sent', 'failed');
  CREATE TYPE "public"."enum_payload_jobs_log_task_slug" AS ENUM('inline', 'send-sms');
  CREATE TYPE "public"."enum_payload_jobs_log_state" AS ENUM('failed', 'succeeded');
  CREATE TYPE "public"."enum_payload_jobs_task_slug" AS ENUM('inline', 'send-sms');
  CREATE TABLE "users_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "users" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"role" "enum_users_role" DEFAULT 'employee' NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "teachers" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"first_name" varchar NOT NULL,
  	"last_name" varchar NOT NULL,
  	"mobile" varchar,
  	"status" "enum_teachers_status" DEFAULT 'active' NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "classes" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"primary_teacher_id" integer NOT NULL,
  	"capacity" numeric,
  	"status" "enum_classes_status" DEFAULT 'planned' NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "classes_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"teachers_id" integer
  );
  
  CREATE TABLE "contacts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"first_name" varchar NOT NULL,
  	"last_name" varchar NOT NULL,
  	"mobile" varchar,
  	"mother_mobile" varchar,
  	"father_mobile" varchar,
  	"grade" numeric NOT NULL,
  	"readiness_status" "enum_contacts_readiness_status" DEFAULT 'normal' NOT NULL,
  	"current_class_id" integer,
  	"lifecycle_status" "enum_contacts_lifecycle_status" DEFAULT 'unknown' NOT NULL,
  	"stop_reason" varchar,
  	"referred_at" timestamp(3) with time zone,
  	"first_attendance_at" timestamp(3) with time zone,
  	"stabilized_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "follow_ups" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"contact_id" integer NOT NULL,
  	"specialist_id" integer NOT NULL,
  	"note" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "ceremonies" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"description" varchar,
  	"status" "enum_ceremonies_status" DEFAULT 'draft' NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "sessions" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"ceremony_id" integer NOT NULL,
  	"starts_at" timestamp(3) with time zone NOT NULL,
  	"ends_at" timestamp(3) with time zone NOT NULL,
  	"grade" numeric NOT NULL,
  	"capacity" numeric NOT NULL,
  	"status" "enum_sessions_status" DEFAULT 'draft' NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "invitations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"contact_id" integer NOT NULL,
  	"session_id" integer NOT NULL,
  	"inviter_id" integer NOT NULL,
  	"contact_target" "enum_invitations_contact_target",
  	"outcome" "enum_invitations_outcome" NOT NULL,
  	"note" varchar,
  	"alternative_session_id" integer,
  	"sms_status" "enum_invitations_sms_status" DEFAULT 'not_required',
  	"processed_at" timestamp(3) with time zone NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "invitation_claims" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"session_id" integer NOT NULL,
  	"contact_id" integer NOT NULL,
  	"inviter_id" integer NOT NULL,
  	"expires_at" timestamp(3) with time zone NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_kv" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"data" jsonb NOT NULL
  );
  
  CREATE TABLE "payload_jobs_log" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"executed_at" timestamp(3) with time zone NOT NULL,
  	"completed_at" timestamp(3) with time zone NOT NULL,
  	"task_slug" "enum_payload_jobs_log_task_slug" NOT NULL,
  	"task_i_d" varchar NOT NULL,
  	"input" jsonb,
  	"output" jsonb,
  	"state" "enum_payload_jobs_log_state" NOT NULL,
  	"error" jsonb
  );
  
  CREATE TABLE "payload_jobs" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"input" jsonb,
  	"completed_at" timestamp(3) with time zone,
  	"total_tried" numeric DEFAULT 0,
  	"has_error" boolean DEFAULT false,
  	"error" jsonb,
  	"task_slug" "enum_payload_jobs_task_slug",
  	"queue" varchar DEFAULT 'default',
  	"wait_until" timestamp(3) with time zone,
  	"processing" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"global_slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer,
  	"teachers_id" integer,
  	"classes_id" integer,
  	"contacts_id" integer,
  	"follow_ups_id" integer,
  	"ceremonies_id" integer,
  	"sessions_id" integer,
  	"invitations_id" integer,
  	"invitation_claims_id" integer
  );
  
  CREATE TABLE "payload_preferences" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"value" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_preferences_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer
  );
  
  CREATE TABLE "payload_migrations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"batch" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "users_sessions" ADD CONSTRAINT "users_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "classes" ADD CONSTRAINT "classes_primary_teacher_id_teachers_id_fk" FOREIGN KEY ("primary_teacher_id") REFERENCES "public"."teachers"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "classes_rels" ADD CONSTRAINT "classes_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "classes_rels" ADD CONSTRAINT "classes_rels_teachers_fk" FOREIGN KEY ("teachers_id") REFERENCES "public"."teachers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "contacts" ADD CONSTRAINT "contacts_current_class_id_classes_id_fk" FOREIGN KEY ("current_class_id") REFERENCES "public"."classes"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_specialist_id_users_id_fk" FOREIGN KEY ("specialist_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "sessions" ADD CONSTRAINT "sessions_ceremony_id_ceremonies_id_fk" FOREIGN KEY ("ceremony_id") REFERENCES "public"."ceremonies"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "invitations" ADD CONSTRAINT "invitations_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "invitations" ADD CONSTRAINT "invitations_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "invitations" ADD CONSTRAINT "invitations_inviter_id_users_id_fk" FOREIGN KEY ("inviter_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "invitations" ADD CONSTRAINT "invitations_alternative_session_id_sessions_id_fk" FOREIGN KEY ("alternative_session_id") REFERENCES "public"."sessions"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "invitation_claims" ADD CONSTRAINT "invitation_claims_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "invitation_claims" ADD CONSTRAINT "invitation_claims_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "invitation_claims" ADD CONSTRAINT "invitation_claims_inviter_id_users_id_fk" FOREIGN KEY ("inviter_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_jobs_log" ADD CONSTRAINT "payload_jobs_log_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."payload_jobs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_locked_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_teachers_fk" FOREIGN KEY ("teachers_id") REFERENCES "public"."teachers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_classes_fk" FOREIGN KEY ("classes_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_contacts_fk" FOREIGN KEY ("contacts_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_follow_ups_fk" FOREIGN KEY ("follow_ups_id") REFERENCES "public"."follow_ups"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_ceremonies_fk" FOREIGN KEY ("ceremonies_id") REFERENCES "public"."ceremonies"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_sessions_fk" FOREIGN KEY ("sessions_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_invitations_fk" FOREIGN KEY ("invitations_id") REFERENCES "public"."invitations"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_invitation_claims_fk" FOREIGN KEY ("invitation_claims_id") REFERENCES "public"."invitation_claims"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_preferences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "users_sessions_order_idx" ON "users_sessions" USING btree ("_order");
  CREATE INDEX "users_sessions_parent_id_idx" ON "users_sessions" USING btree ("_parent_id");
  CREATE INDEX "users_updated_at_idx" ON "users" USING btree ("updated_at");
  CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");
  CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");
  CREATE INDEX "teachers_updated_at_idx" ON "teachers" USING btree ("updated_at");
  CREATE INDEX "teachers_created_at_idx" ON "teachers" USING btree ("created_at");
  CREATE INDEX "classes_primary_teacher_idx" ON "classes" USING btree ("primary_teacher_id");
  CREATE INDEX "classes_updated_at_idx" ON "classes" USING btree ("updated_at");
  CREATE INDEX "classes_created_at_idx" ON "classes" USING btree ("created_at");
  CREATE INDEX "classes_rels_order_idx" ON "classes_rels" USING btree ("order");
  CREATE INDEX "classes_rels_parent_idx" ON "classes_rels" USING btree ("parent_id");
  CREATE INDEX "classes_rels_path_idx" ON "classes_rels" USING btree ("path");
  CREATE INDEX "classes_rels_teachers_id_idx" ON "classes_rels" USING btree ("teachers_id");
  CREATE INDEX "contacts_grade_idx" ON "contacts" USING btree ("grade");
  CREATE INDEX "contacts_readiness_status_idx" ON "contacts" USING btree ("readiness_status");
  CREATE INDEX "contacts_current_class_idx" ON "contacts" USING btree ("current_class_id");
  CREATE INDEX "contacts_lifecycle_status_idx" ON "contacts" USING btree ("lifecycle_status");
  CREATE INDEX "contacts_updated_at_idx" ON "contacts" USING btree ("updated_at");
  CREATE INDEX "contacts_created_at_idx" ON "contacts" USING btree ("created_at");
  CREATE INDEX "follow_ups_contact_idx" ON "follow_ups" USING btree ("contact_id");
  CREATE INDEX "follow_ups_specialist_idx" ON "follow_ups" USING btree ("specialist_id");
  CREATE INDEX "follow_ups_updated_at_idx" ON "follow_ups" USING btree ("updated_at");
  CREATE INDEX "follow_ups_created_at_idx" ON "follow_ups" USING btree ("created_at");
  CREATE INDEX "ceremonies_status_idx" ON "ceremonies" USING btree ("status");
  CREATE INDEX "ceremonies_updated_at_idx" ON "ceremonies" USING btree ("updated_at");
  CREATE INDEX "ceremonies_created_at_idx" ON "ceremonies" USING btree ("created_at");
  CREATE INDEX "sessions_ceremony_idx" ON "sessions" USING btree ("ceremony_id");
  CREATE INDEX "sessions_starts_at_idx" ON "sessions" USING btree ("starts_at");
  CREATE INDEX "sessions_grade_idx" ON "sessions" USING btree ("grade");
  CREATE INDEX "sessions_status_idx" ON "sessions" USING btree ("status");
  CREATE INDEX "sessions_updated_at_idx" ON "sessions" USING btree ("updated_at");
  CREATE INDEX "sessions_created_at_idx" ON "sessions" USING btree ("created_at");
  CREATE INDEX "invitations_contact_idx" ON "invitations" USING btree ("contact_id");
  CREATE INDEX "invitations_session_idx" ON "invitations" USING btree ("session_id");
  CREATE INDEX "invitations_inviter_idx" ON "invitations" USING btree ("inviter_id");
  CREATE INDEX "invitations_outcome_idx" ON "invitations" USING btree ("outcome");
  CREATE INDEX "invitations_alternative_session_idx" ON "invitations" USING btree ("alternative_session_id");
  CREATE INDEX "invitations_updated_at_idx" ON "invitations" USING btree ("updated_at");
  CREATE INDEX "invitations_created_at_idx" ON "invitations" USING btree ("created_at");
  CREATE INDEX "invitation_claims_session_idx" ON "invitation_claims" USING btree ("session_id");
  CREATE INDEX "invitation_claims_contact_idx" ON "invitation_claims" USING btree ("contact_id");
  CREATE INDEX "invitation_claims_inviter_idx" ON "invitation_claims" USING btree ("inviter_id");
  CREATE INDEX "invitation_claims_expires_at_idx" ON "invitation_claims" USING btree ("expires_at");
  CREATE INDEX "invitation_claims_updated_at_idx" ON "invitation_claims" USING btree ("updated_at");
  CREATE INDEX "invitation_claims_created_at_idx" ON "invitation_claims" USING btree ("created_at");
  CREATE UNIQUE INDEX "payload_kv_key_idx" ON "payload_kv" USING btree ("key");
  CREATE INDEX "payload_jobs_log_order_idx" ON "payload_jobs_log" USING btree ("_order");
  CREATE INDEX "payload_jobs_log_parent_id_idx" ON "payload_jobs_log" USING btree ("_parent_id");
  CREATE INDEX "payload_jobs_completed_at_idx" ON "payload_jobs" USING btree ("completed_at");
  CREATE INDEX "payload_jobs_total_tried_idx" ON "payload_jobs" USING btree ("total_tried");
  CREATE INDEX "payload_jobs_has_error_idx" ON "payload_jobs" USING btree ("has_error");
  CREATE INDEX "payload_jobs_task_slug_idx" ON "payload_jobs" USING btree ("task_slug");
  CREATE INDEX "payload_jobs_queue_idx" ON "payload_jobs" USING btree ("queue");
  CREATE INDEX "payload_jobs_wait_until_idx" ON "payload_jobs" USING btree ("wait_until");
  CREATE INDEX "payload_jobs_processing_idx" ON "payload_jobs" USING btree ("processing");
  CREATE INDEX "payload_jobs_updated_at_idx" ON "payload_jobs" USING btree ("updated_at");
  CREATE INDEX "payload_jobs_created_at_idx" ON "payload_jobs" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_global_slug_idx" ON "payload_locked_documents" USING btree ("global_slug");
  CREATE INDEX "payload_locked_documents_updated_at_idx" ON "payload_locked_documents" USING btree ("updated_at");
  CREATE INDEX "payload_locked_documents_created_at_idx" ON "payload_locked_documents" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_rels_order_idx" ON "payload_locked_documents_rels" USING btree ("order");
  CREATE INDEX "payload_locked_documents_rels_parent_idx" ON "payload_locked_documents_rels" USING btree ("parent_id");
  CREATE INDEX "payload_locked_documents_rels_path_idx" ON "payload_locked_documents_rels" USING btree ("path");
  CREATE INDEX "payload_locked_documents_rels_users_id_idx" ON "payload_locked_documents_rels" USING btree ("users_id");
  CREATE INDEX "payload_locked_documents_rels_teachers_id_idx" ON "payload_locked_documents_rels" USING btree ("teachers_id");
  CREATE INDEX "payload_locked_documents_rels_classes_id_idx" ON "payload_locked_documents_rels" USING btree ("classes_id");
  CREATE INDEX "payload_locked_documents_rels_contacts_id_idx" ON "payload_locked_documents_rels" USING btree ("contacts_id");
  CREATE INDEX "payload_locked_documents_rels_follow_ups_id_idx" ON "payload_locked_documents_rels" USING btree ("follow_ups_id");
  CREATE INDEX "payload_locked_documents_rels_ceremonies_id_idx" ON "payload_locked_documents_rels" USING btree ("ceremonies_id");
  CREATE INDEX "payload_locked_documents_rels_sessions_id_idx" ON "payload_locked_documents_rels" USING btree ("sessions_id");
  CREATE INDEX "payload_locked_documents_rels_invitations_id_idx" ON "payload_locked_documents_rels" USING btree ("invitations_id");
  CREATE INDEX "payload_locked_documents_rels_invitation_claims_id_idx" ON "payload_locked_documents_rels" USING btree ("invitation_claims_id");
  CREATE INDEX "payload_preferences_key_idx" ON "payload_preferences" USING btree ("key");
  CREATE INDEX "payload_preferences_updated_at_idx" ON "payload_preferences" USING btree ("updated_at");
  CREATE INDEX "payload_preferences_created_at_idx" ON "payload_preferences" USING btree ("created_at");
  CREATE INDEX "payload_preferences_rels_order_idx" ON "payload_preferences_rels" USING btree ("order");
  CREATE INDEX "payload_preferences_rels_parent_idx" ON "payload_preferences_rels" USING btree ("parent_id");
  CREATE INDEX "payload_preferences_rels_path_idx" ON "payload_preferences_rels" USING btree ("path");
  CREATE INDEX "payload_preferences_rels_users_id_idx" ON "payload_preferences_rels" USING btree ("users_id");
  CREATE INDEX "payload_migrations_updated_at_idx" ON "payload_migrations" USING btree ("updated_at");
  CREATE INDEX "payload_migrations_created_at_idx" ON "payload_migrations" USING btree ("created_at");`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "users_sessions" CASCADE;
  DROP TABLE "users" CASCADE;
  DROP TABLE "teachers" CASCADE;
  DROP TABLE "classes" CASCADE;
  DROP TABLE "classes_rels" CASCADE;
  DROP TABLE "contacts" CASCADE;
  DROP TABLE "follow_ups" CASCADE;
  DROP TABLE "ceremonies" CASCADE;
  DROP TABLE "sessions" CASCADE;
  DROP TABLE "invitations" CASCADE;
  DROP TABLE "invitation_claims" CASCADE;
  DROP TABLE "payload_kv" CASCADE;
  DROP TABLE "payload_jobs_log" CASCADE;
  DROP TABLE "payload_jobs" CASCADE;
  DROP TABLE "payload_locked_documents" CASCADE;
  DROP TABLE "payload_locked_documents_rels" CASCADE;
  DROP TABLE "payload_preferences" CASCADE;
  DROP TABLE "payload_preferences_rels" CASCADE;
  DROP TABLE "payload_migrations" CASCADE;
  DROP TYPE "public"."enum_users_role";
  DROP TYPE "public"."enum_teachers_status";
  DROP TYPE "public"."enum_classes_status";
  DROP TYPE "public"."enum_contacts_readiness_status";
  DROP TYPE "public"."enum_contacts_lifecycle_status";
  DROP TYPE "public"."enum_ceremonies_status";
  DROP TYPE "public"."enum_sessions_status";
  DROP TYPE "public"."enum_invitations_contact_target";
  DROP TYPE "public"."enum_invitations_outcome";
  DROP TYPE "public"."enum_invitations_sms_status";
  DROP TYPE "public"."enum_payload_jobs_log_task_slug";
  DROP TYPE "public"."enum_payload_jobs_log_state";
  DROP TYPE "public"."enum_payload_jobs_task_slug";`)
}
