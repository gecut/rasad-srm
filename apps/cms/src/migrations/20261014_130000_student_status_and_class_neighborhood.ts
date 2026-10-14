import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    -- 1. Create new enum for unified student status
    DO $$ BEGIN
      CREATE TYPE "public"."enum_students_status" AS ENUM(
        'unknown',
        'waitlisted',
        'class_seeker',
        'referred_to_teacher',
        'absorbed',
        'stabilized',
        'removed'
      );
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;

    -- 2. Add status column to students
    ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "status" "enum_students_status" DEFAULT 'unknown' NOT NULL;

    -- 3. Data migration: Migrate data from lifecycle_status and readiness_status to status
    UPDATE "students"
    SET "status" = CASE
      WHEN "lifecycle_status"::text IN ('referred_to_teacher', 'absorbed', 'stabilized', 'removed')
        THEN "lifecycle_status"::text::"enum_students_status"
      WHEN ("lifecycle_status"::text = 'class_seeker' OR "readiness_status"::text = 'waitlisted') AND "grade" <= 3
        THEN 'waitlisted'::"enum_students_status"
      WHEN ("lifecycle_status"::text = 'class_seeker' OR "readiness_status"::text = 'waitlisted') AND ("grade" >= 4 OR "grade" IS NULL)
        THEN 'class_seeker'::"enum_students_status"
      ELSE 'unknown'::"enum_students_status"
    END;

    -- 4. Create index on status
    CREATE INDEX IF NOT EXISTS "students_status_idx" ON "students" USING btree ("status");

    -- 5. Add neighborhood_id to classes (create neighborhoods table if missing on legacy dev DBs)
    CREATE TABLE IF NOT EXISTS "public"."neighborhoods" (
      "id" serial PRIMARY KEY NOT NULL,
      "name" varchar NOT NULL,
      "description" varchar,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
    CREATE TABLE IF NOT EXISTS "public"."neighborhoods_sub_districts" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL,
      "name" varchar NOT NULL
    );

    ALTER TABLE "classes" ADD COLUMN IF NOT EXISTS "neighborhood_id" integer;
    DO $$ BEGIN
      ALTER TABLE "classes" ADD CONSTRAINT "classes_neighborhood_id_neighborhoods_id_fk"
        FOREIGN KEY ("neighborhood_id") REFERENCES "public"."neighborhoods"("id")
        ON DELETE set null ON UPDATE no action;
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
    CREATE INDEX IF NOT EXISTS "classes_neighborhood_idx" ON "classes" USING btree ("neighborhood_id");

    -- 6. Migrate any users with role 'follow_up_specialist' to 'employee'
    UPDATE "users"
    SET "role" = 'employee'
    WHERE "role"::text = 'follow_up_specialist';
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS "classes_neighborhood_idx";
    ALTER TABLE "classes" DROP CONSTRAINT IF EXISTS "classes_neighborhood_id_neighborhoods_id_fk";
    ALTER TABLE "classes" DROP COLUMN IF EXISTS "neighborhood_id";
    DROP INDEX IF EXISTS "students_status_idx";
    ALTER TABLE "students" DROP COLUMN IF EXISTS "status";
    DROP TYPE IF EXISTS "public"."enum_students_status";
  `)
}
