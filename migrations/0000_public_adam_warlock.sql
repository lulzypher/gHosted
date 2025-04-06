CREATE TYPE "public"."content_type" AS ENUM('post', 'comment', 'media', 'profile');--> statement-breakpoint
CREATE TYPE "public"."node_role" AS ENUM('website', 'server', 'mobile', 'browser');--> statement-breakpoint
CREATE TYPE "public"."node_status" AS ENUM('online', 'offline', 'syncing');--> statement-breakpoint
CREATE TYPE "public"."pin_type" AS ENUM('pc', 'mobile', 'both');--> statement-breakpoint
CREATE TABLE "contents" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"content_type" "content_type" NOT NULL,
	"cid" text NOT NULL,
	"content" text,
	"media_cid" text,
	"metadata" jsonb,
	"signature" text NOT NULL,
	"is_encrypted" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"parent_id" integer,
	CONSTRAINT "contents_cid_unique" UNIQUE("cid")
);
--> statement-breakpoint
CREATE TABLE "node_connections" (
	"id" serial PRIMARY KEY NOT NULL,
	"source_node_id" integer NOT NULL,
	"target_node_id" integer NOT NULL,
	"status" text NOT NULL,
	"quality" integer,
	"last_connected" timestamp,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "node_connections_source_node_id_target_node_id_unique" UNIQUE("source_node_id","target_node_id")
);
--> statement-breakpoint
CREATE TABLE "nodes" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"node_id" text NOT NULL,
	"name" text NOT NULL,
	"role" "node_role" NOT NULL,
	"status" "node_status" DEFAULT 'offline' NOT NULL,
	"public_key" text NOT NULL,
	"last_seen" timestamp DEFAULT now() NOT NULL,
	"connection_info" jsonb,
	"ipfs_peer_id" text,
	"storage_capacity" integer,
	"storage_used" integer DEFAULT 0,
	"capabilities" jsonb,
	"is_hosting_website" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "nodes_node_id_unique" UNIQUE("node_id")
);
--> statement-breakpoint
CREATE TABLE "pins" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"content_id" integer NOT NULL,
	"node_id" integer,
	"pin_type" "pin_type" NOT NULL,
	"device_id" text,
	"pinned_at" timestamp DEFAULT now() NOT NULL,
	"is_active" boolean DEFAULT true,
	CONSTRAINT "pins_user_id_content_id_node_id_pin_type_unique" UNIQUE("user_id","content_id","node_id","pin_type")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password" text,
	"display_name" text NOT NULL,
	"bio" text,
	"avatar_cid" text,
	"did" text NOT NULL,
	"public_key" text NOT NULL,
	"encryption_key" text,
	"ipns_address" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"settings" jsonb,
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_did_unique" UNIQUE("did")
);
--> statement-breakpoint
CREATE TABLE "website_hosting" (
	"id" serial PRIMARY KEY NOT NULL,
	"node_id" integer NOT NULL,
	"start_time" timestamp DEFAULT now() NOT NULL,
	"end_time" timestamp,
	"domain" text NOT NULL,
	"health" integer DEFAULT 100,
	"stats" jsonb
);
--> statement-breakpoint
ALTER TABLE "contents" ADD CONSTRAINT "contents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "node_connections" ADD CONSTRAINT "node_connections_source_node_id_nodes_id_fk" FOREIGN KEY ("source_node_id") REFERENCES "public"."nodes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "node_connections" ADD CONSTRAINT "node_connections_target_node_id_nodes_id_fk" FOREIGN KEY ("target_node_id") REFERENCES "public"."nodes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nodes" ADD CONSTRAINT "nodes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pins" ADD CONSTRAINT "pins_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pins" ADD CONSTRAINT "pins_content_id_contents_id_fk" FOREIGN KEY ("content_id") REFERENCES "public"."contents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pins" ADD CONSTRAINT "pins_node_id_nodes_id_fk" FOREIGN KEY ("node_id") REFERENCES "public"."nodes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "website_hosting" ADD CONSTRAINT "website_hosting_node_id_nodes_id_fk" FOREIGN KEY ("node_id") REFERENCES "public"."nodes"("id") ON DELETE no action ON UPDATE no action;