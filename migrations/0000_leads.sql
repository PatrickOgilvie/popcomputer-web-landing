CREATE TABLE `leads` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`company` text,
	`team_size` text NOT NULL,
	`message` text,
	`created_at` integer NOT NULL,
	`email_status` text DEFAULT 'queued' NOT NULL,
	`emailed_at` integer,
	CONSTRAINT "leads_name_length" CHECK(length("leads"."name") BETWEEN 1 AND 100),
	CONSTRAINT "leads_email_length" CHECK(length("leads"."email") BETWEEN 3 AND 254),
	CONSTRAINT "leads_company_length" CHECK("leads"."company" IS NULL OR length("leads"."company") <= 100),
	CONSTRAINT "leads_message_length" CHECK("leads"."message" IS NULL OR length("leads"."message") <= 2000),
	CONSTRAINT "leads_team_size" CHECK("leads"."team_size" IN ('1-10', '11-50', '51-200', '200+')),
	CONSTRAINT "leads_email_status" CHECK("leads"."email_status" IN ('queued', 'sent', 'held'))
);
--> statement-breakpoint
CREATE INDEX `leads_created_idx` ON `leads` (`created_at`);--> statement-breakpoint
CREATE INDEX `leads_emailed_idx` ON `leads` (`emailed_at`);