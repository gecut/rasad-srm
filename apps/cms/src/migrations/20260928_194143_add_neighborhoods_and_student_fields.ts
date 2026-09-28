import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
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
  
  ALTER TABLE "students" ADD COLUMN "landline" varchar;
  ALTER TABLE "students" ADD COLUMN "neighborhood_id" integer;
  ALTER TABLE "students" ADD COLUMN "address" varchar;
  ALTER TABLE "students" ADD COLUMN "referrer" varchar;
  ALTER TABLE "students" ADD COLUMN "notes" varchar;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "neighborhoods_id" integer;
  ALTER TABLE "neighborhoods_sub_districts" ADD CONSTRAINT "neighborhoods_sub_districts_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."neighborhoods"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "neighborhoods_sub_districts_order_idx" ON "neighborhoods_sub_districts" USING btree ("_order");
  CREATE INDEX "neighborhoods_sub_districts_parent_id_idx" ON "neighborhoods_sub_districts" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "neighborhoods_name_idx" ON "neighborhoods" USING btree ("name");
  CREATE INDEX "neighborhoods_updated_at_idx" ON "neighborhoods" USING btree ("updated_at");
  CREATE INDEX "neighborhoods_created_at_idx" ON "neighborhoods" USING btree ("created_at");
  ALTER TABLE "students" ADD CONSTRAINT "students_neighborhood_id_neighborhoods_id_fk" FOREIGN KEY ("neighborhood_id") REFERENCES "public"."neighborhoods"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_neighborhoods_fk" FOREIGN KEY ("neighborhoods_id") REFERENCES "public"."neighborhoods"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "students_neighborhood_idx" ON "students" USING btree ("neighborhood_id");
  CREATE INDEX "payload_locked_documents_rels_neighborhoods_id_idx" ON "payload_locked_documents_rels" USING btree ("neighborhoods_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "neighborhoods_sub_districts" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "neighborhoods" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "neighborhoods_sub_districts" CASCADE;
  DROP TABLE "neighborhoods" CASCADE;
  ALTER TABLE "students" DROP CONSTRAINT "students_neighborhood_id_neighborhoods_id_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_neighborhoods_fk";
  
  DROP INDEX "students_neighborhood_idx";
  DROP INDEX "payload_locked_documents_rels_neighborhoods_id_idx";
  ALTER TABLE "students" DROP COLUMN "landline";
  ALTER TABLE "students" DROP COLUMN "neighborhood_id";
  ALTER TABLE "students" DROP COLUMN "address";
  ALTER TABLE "students" DROP COLUMN "referrer";
  ALTER TABLE "students" DROP COLUMN "notes";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "neighborhoods_id";`)
}
