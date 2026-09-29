import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_users_status" AS ENUM('active', 'inactive');
  CREATE TYPE "public"."enum_users_role" AS ENUM('admin', 'employee', 'follow_up_specialist', 'inviter', 'teacher', 'receptionist');
  CREATE TYPE "public"."enum_teachers_status" AS ENUM('active', 'inactive');
  CREATE TYPE "public"."enum_classes_status" AS ENUM('planned', 'active', 'transition_to_preliminaries', 'admissions_paused', 'suspended', 'ended', 'cancelled');
  CREATE TYPE "public"."enum_students_origin" AS ENUM('admin', 'reception_walk_in', 'import');
  CREATE TYPE "public"."enum_students_readiness_status" AS ENUM('normal', 'waitlisted');
  CREATE TYPE "public"."enum_students_lifecycle_status" AS ENUM('unknown', 'class_seeker', 'referred_to_teacher', 'absorbed', 'stabilized', 'removed');
  CREATE TYPE "public"."enum_ceremonies_status" AS ENUM('draft', 'scheduled', 'active', 'inviting', 'completed', 'cancelled');
  CREATE TYPE "public"."enum_ceremonies_attendance_policy" AS ENUM('single', 'multiple');
  CREATE TYPE "public"."enum_sessions_status" AS ENUM('draft', 'queued', 'filling', 'sealed', 'active', 'completed', 'cancelled');
  CREATE TYPE "public"."enum_invitations_outcome" AS ENUM('accepted', 'no_answer', 'declined', 'postponed', 'needs_alternative_session', 'no_answer_sms', 'failed');
  CREATE TYPE "public"."enum_invitations_sms_status" AS ENUM('not_required', 'queued', 'sent', 'failed');
  CREATE TYPE "public"."enum_session_checkins_source" AS ENUM('invited', 'walk_in');
  CREATE TYPE "public"."enum_exports_format" AS ENUM('csv', 'json');
  CREATE TYPE "public"."enum_exports_sort_order" AS ENUM('asc', 'desc');
  CREATE TYPE "public"."enum_exports_drafts" AS ENUM('yes', 'no');
  CREATE TYPE "public"."enum_imports_import_mode" AS ENUM('create', 'update', 'upsert');
  CREATE TYPE "public"."enum_imports_status" AS ENUM('pending', 'completed', 'partial', 'failed');
  CREATE TYPE "public"."enum_payload_jobs_log_task_slug" AS ENUM('inline', 'send-sms', 'createCollectionExport', 'createCollectionImport');
  CREATE TYPE "public"."enum_payload_jobs_log_state" AS ENUM('failed', 'succeeded');
  CREATE TYPE "public"."enum_payload_jobs_task_slug" AS ENUM('inline', 'send-sms', 'createCollectionExport', 'createCollectionImport');
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
  	"status" "enum_users_status" DEFAULT 'active' NOT NULL,
  	"teacher_profile_id" integer,
  	"role" "enum_users_role" DEFAULT 'employee' NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar,
  	"username" varchar,
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
  
  CREATE TABLE "students" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"first_name" varchar NOT NULL,
  	"last_name" varchar NOT NULL,
  	"grade" numeric,
  	"origin" "enum_students_origin" DEFAULT 'admin' NOT NULL,
  	"mobile" varchar,
  	"landline" varchar,
  	"father_mobile" varchar,
  	"mother_mobile" varchar,
  	"neighborhood_id" integer,
  	"referrer" varchar,
  	"address" varchar,
  	"notes" varchar,
  	"readiness_status" "enum_students_readiness_status" DEFAULT 'normal' NOT NULL,
  	"current_class_id" integer,
  	"lifecycle_status" "enum_students_lifecycle_status" DEFAULT 'unknown' NOT NULL,
  	"removed_reason" varchar,
  	"referred_at" timestamp(3) with time zone,
  	"absorbed_at" timestamp(3) with time zone,
  	"stabilized_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "follow_ups" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"student_id" integer NOT NULL,
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
  	"attendance_policy" "enum_ceremonies_attendance_policy" DEFAULT 'single',
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "sessions" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"ceremony_id" integer NOT NULL,
  	"title" varchar,
  	"starts_at" timestamp(3) with time zone NOT NULL,
  	"ends_at" timestamp(3) with time zone,
  	"status" "enum_sessions_status" DEFAULT 'draft' NOT NULL,
  	"filling_started_at" timestamp(3) with time zone,
  	"capacity" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "invitations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"student_id" integer NOT NULL,
  	"ceremony_id" integer NOT NULL,
  	"assigned_session_id" integer,
  	"processed_session_id" integer NOT NULL,
  	"inviter_id" integer NOT NULL,
  	"outcome" "enum_invitations_outcome" NOT NULL,
  	"note" varchar,
  	"postponed_until" timestamp(3) with time zone,
  	"sms_status" "enum_invitations_sms_status" DEFAULT 'not_required',
  	"processed_at" timestamp(3) with time zone NOT NULL,
  	"attempts" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "invitation_claims" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"ceremony_id" integer NOT NULL,
  	"session_id" integer NOT NULL,
  	"student_id" integer NOT NULL,
  	"inviter_id" integer NOT NULL,
  	"token" varchar NOT NULL,
  	"expires_at" timestamp(3) with time zone NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
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
  
  CREATE TABLE "neighborhoods_sub_districts" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL
  );
  
  CREATE TABLE "neighborhoods" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"description" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "exports" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"format" "enum_exports_format" DEFAULT 'csv' NOT NULL,
  	"limit" numeric,
  	"page" numeric DEFAULT 1,
  	"sort" varchar,
  	"sort_order" "enum_exports_sort_order",
  	"drafts" "enum_exports_drafts" DEFAULT 'yes',
  	"collection_slug" varchar DEFAULT 'students' NOT NULL,
  	"where" jsonb DEFAULT '{}'::jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric
  );
  
  CREATE TABLE "exports_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "imports" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"collection_slug" varchar DEFAULT 'students' NOT NULL,
  	"import_mode" "enum_imports_import_mode",
  	"match_field" varchar DEFAULT 'id',
  	"status" "enum_imports_status" DEFAULT 'pending',
  	"summary_imported" numeric,
  	"summary_updated" numeric,
  	"summary_total" numeric,
  	"summary_issues" numeric,
  	"summary_issue_details" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric
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
  	"students_id" integer,
  	"follow_ups_id" integer,
  	"ceremonies_id" integer,
  	"sessions_id" integer,
  	"invitations_id" integer,
  	"invitation_claims_id" integer,
  	"session_checkins_id" integer,
  	"neighborhoods_id" integer
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
  ALTER TABLE "users" ADD CONSTRAINT "users_teacher_profile_id_teachers_id_fk" FOREIGN KEY ("teacher_profile_id") REFERENCES "public"."teachers"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "classes" ADD CONSTRAINT "classes_primary_teacher_id_teachers_id_fk" FOREIGN KEY ("primary_teacher_id") REFERENCES "public"."teachers"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "classes_rels" ADD CONSTRAINT "classes_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "classes_rels" ADD CONSTRAINT "classes_rels_teachers_fk" FOREIGN KEY ("teachers_id") REFERENCES "public"."teachers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "students" ADD CONSTRAINT "students_neighborhood_id_neighborhoods_id_fk" FOREIGN KEY ("neighborhood_id") REFERENCES "public"."neighborhoods"("id") ON DELETE set null ON UPDATE no action;
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
  ALTER TABLE "neighborhoods_sub_districts" ADD CONSTRAINT "neighborhoods_sub_districts_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."neighborhoods"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "exports_texts" ADD CONSTRAINT "exports_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."exports"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_jobs_log" ADD CONSTRAINT "payload_jobs_log_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."payload_jobs"("id") ON DELETE cascade ON UPDATE no action;
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
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_neighborhoods_fk" FOREIGN KEY ("neighborhoods_id") REFERENCES "public"."neighborhoods"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_preferences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "users_sessions_order_idx" ON "users_sessions" USING btree ("_order");
  CREATE INDEX "users_sessions_parent_id_idx" ON "users_sessions" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "users_teacher_profile_idx" ON "users" USING btree ("teacher_profile_id");
  CREATE INDEX "users_updated_at_idx" ON "users" USING btree ("updated_at");
  CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");
  CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");
  CREATE UNIQUE INDEX "users_username_idx" ON "users" USING btree ("username");
  CREATE INDEX "teachers_updated_at_idx" ON "teachers" USING btree ("updated_at");
  CREATE INDEX "teachers_created_at_idx" ON "teachers" USING btree ("created_at");
  CREATE INDEX "classes_primary_teacher_idx" ON "classes" USING btree ("primary_teacher_id");
  CREATE INDEX "classes_updated_at_idx" ON "classes" USING btree ("updated_at");
  CREATE INDEX "classes_created_at_idx" ON "classes" USING btree ("created_at");
  CREATE INDEX "classes_rels_order_idx" ON "classes_rels" USING btree ("order");
  CREATE INDEX "classes_rels_parent_idx" ON "classes_rels" USING btree ("parent_id");
  CREATE INDEX "classes_rels_path_idx" ON "classes_rels" USING btree ("path");
  CREATE INDEX "classes_rels_teachers_id_idx" ON "classes_rels" USING btree ("teachers_id");
  CREATE INDEX "students_grade_idx" ON "students" USING btree ("grade");
  CREATE INDEX "students_neighborhood_idx" ON "students" USING btree ("neighborhood_id");
  CREATE INDEX "students_readiness_status_idx" ON "students" USING btree ("readiness_status");
  CREATE INDEX "students_current_class_idx" ON "students" USING btree ("current_class_id");
  CREATE INDEX "students_lifecycle_status_idx" ON "students" USING btree ("lifecycle_status");
  CREATE INDEX "students_updated_at_idx" ON "students" USING btree ("updated_at");
  CREATE INDEX "students_created_at_idx" ON "students" USING btree ("created_at");
  CREATE INDEX "students_has_callable_phone_idx" ON "students" ((mobile IS NOT NULL OR mother_mobile IS NOT NULL OR father_mobile IS NOT NULL));
  CREATE INDEX "follow_ups_student_idx" ON "follow_ups" USING btree ("student_id");
  CREATE INDEX "follow_ups_specialist_idx" ON "follow_ups" USING btree ("specialist_id");
  CREATE INDEX "follow_ups_updated_at_idx" ON "follow_ups" USING btree ("updated_at");
  CREATE INDEX "follow_ups_created_at_idx" ON "follow_ups" USING btree ("created_at");
  CREATE INDEX "ceremonies_status_idx" ON "ceremonies" USING btree ("status");
  CREATE INDEX "ceremonies_updated_at_idx" ON "ceremonies" USING btree ("updated_at");
  CREATE INDEX "ceremonies_created_at_idx" ON "ceremonies" USING btree ("created_at");
  CREATE INDEX "sessions_ceremony_idx" ON "sessions" USING btree ("ceremony_id");
  CREATE INDEX "sessions_starts_at_idx" ON "sessions" USING btree ("starts_at");
  CREATE INDEX "sessions_status_idx" ON "sessions" USING btree ("status");
  CREATE INDEX "sessions_updated_at_idx" ON "sessions" USING btree ("updated_at");
  CREATE INDEX "sessions_created_at_idx" ON "sessions" USING btree ("created_at");
  CREATE UNIQUE INDEX "sessions_single_filling_idx" ON "sessions" ("ceremony_id") WHERE status = 'filling';
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
  CREATE INDEX "neighborhoods_sub_districts_order_idx" ON "neighborhoods_sub_districts" USING btree ("_order");
  CREATE INDEX "neighborhoods_sub_districts_parent_id_idx" ON "neighborhoods_sub_districts" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "neighborhoods_name_idx" ON "neighborhoods" USING btree ("name");
  CREATE INDEX "neighborhoods_updated_at_idx" ON "neighborhoods" USING btree ("updated_at");
  CREATE INDEX "neighborhoods_created_at_idx" ON "neighborhoods" USING btree ("created_at");
  CREATE INDEX "exports_updated_at_idx" ON "exports" USING btree ("updated_at");
  CREATE INDEX "exports_created_at_idx" ON "exports" USING btree ("created_at");
  CREATE UNIQUE INDEX "exports_filename_idx" ON "exports" USING btree ("filename");
  CREATE INDEX "exports_texts_order_parent" ON "exports_texts" USING btree ("order","parent_id");
  CREATE INDEX "imports_updated_at_idx" ON "imports" USING btree ("updated_at");
  CREATE INDEX "imports_created_at_idx" ON "imports" USING btree ("created_at");
  CREATE UNIQUE INDEX "imports_filename_idx" ON "imports" USING btree ("filename");
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
  CREATE INDEX "payload_locked_documents_rels_students_id_idx" ON "payload_locked_documents_rels" USING btree ("students_id");
  CREATE INDEX "payload_locked_documents_rels_follow_ups_id_idx" ON "payload_locked_documents_rels" USING btree ("follow_ups_id");
  CREATE INDEX "payload_locked_documents_rels_ceremonies_id_idx" ON "payload_locked_documents_rels" USING btree ("ceremonies_id");
  CREATE INDEX "payload_locked_documents_rels_sessions_id_idx" ON "payload_locked_documents_rels" USING btree ("sessions_id");
  CREATE INDEX "payload_locked_documents_rels_invitations_id_idx" ON "payload_locked_documents_rels" USING btree ("invitations_id");
  CREATE INDEX "payload_locked_documents_rels_invitation_claims_id_idx" ON "payload_locked_documents_rels" USING btree ("invitation_claims_id");
  CREATE INDEX "payload_locked_documents_rels_session_checkins_id_idx" ON "payload_locked_documents_rels" USING btree ("session_checkins_id");
  CREATE INDEX "payload_locked_documents_rels_neighborhoods_id_idx" ON "payload_locked_documents_rels" USING btree ("neighborhoods_id");
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

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX IF EXISTS "sessions_single_filling_idx";
  DROP INDEX IF EXISTS "students_has_callable_phone_idx";
  DROP TABLE "users_sessions" CASCADE;
  DROP TABLE "users" CASCADE;
  DROP TABLE "teachers" CASCADE;
  DROP TABLE "classes" CASCADE;
  DROP TABLE "classes_rels" CASCADE;
  DROP TABLE "students" CASCADE;
  DROP TABLE "follow_ups" CASCADE;
  DROP TABLE "ceremonies" CASCADE;
  DROP TABLE "sessions" CASCADE;
  DROP TABLE "invitations" CASCADE;
  DROP TABLE "invitation_claims" CASCADE;
  DROP TABLE "session_checkins" CASCADE;
  DROP TABLE "neighborhoods_sub_districts" CASCADE;
  DROP TABLE "neighborhoods" CASCADE;
  DROP TABLE "exports" CASCADE;
  DROP TABLE "exports_texts" CASCADE;
  DROP TABLE "imports" CASCADE;
  DROP TABLE "payload_kv" CASCADE;
  DROP TABLE "payload_jobs_log" CASCADE;
  DROP TABLE "payload_jobs" CASCADE;
  DROP TABLE "payload_locked_documents" CASCADE;
  DROP TABLE "payload_locked_documents_rels" CASCADE;
  DROP TABLE "payload_preferences" CASCADE;
  DROP TABLE "payload_preferences_rels" CASCADE;
  DROP TABLE "payload_migrations" CASCADE;
  DROP TYPE "public"."enum_users_status";
  DROP TYPE "public"."enum_users_role";
  DROP TYPE "public"."enum_teachers_status";
  DROP TYPE "public"."enum_classes_status";
  DROP TYPE "public"."enum_students_origin";
  DROP TYPE "public"."enum_students_readiness_status";
  DROP TYPE "public"."enum_students_lifecycle_status";
  DROP TYPE "public"."enum_ceremonies_status";
  DROP TYPE "public"."enum_ceremonies_attendance_policy";
  DROP TYPE "public"."enum_sessions_status";
  DROP TYPE "public"."enum_invitations_outcome";
  DROP TYPE "public"."enum_invitations_sms_status";
  DROP TYPE "public"."enum_session_checkins_source";
  DROP TYPE "public"."enum_exports_format";
  DROP TYPE "public"."enum_exports_sort_order";
  DROP TYPE "public"."enum_exports_drafts";
  DROP TYPE "public"."enum_imports_import_mode";
  DROP TYPE "public"."enum_imports_status";
  DROP TYPE "public"."enum_payload_jobs_log_task_slug";
  DROP TYPE "public"."enum_payload_jobs_log_state";
  DROP TYPE "public"."enum_payload_jobs_task_slug";`)
}
