SELECT crsql_begin_alter('cities');
--> statement-breakpoint
ALTER TABLE cities ADD `population` integer;
--> statement-breakpoint
SELECT crsql_commit_alter('cities');
--> statement-breakpoint
SELECT crsql_begin_alter('countries');
--> statement-breakpoint
ALTER TABLE countries ADD `population` integer;
--> statement-breakpoint
SELECT crsql_commit_alter('countries');