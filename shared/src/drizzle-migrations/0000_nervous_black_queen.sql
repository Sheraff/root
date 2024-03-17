CREATE TABLE `cities` (
	`id` TEXT NOT NULL PRIMARY KEY,
	`name` text,
	`country_id` text
);
--> statement-breakpoint
SELECT crsql_as_crr ('cities');
--> statement-breakpoint
CREATE TABLE `countries` (
	`id` TEXT NOT NULL PRIMARY KEY,
	`name` text
);
--> statement-breakpoint
SELECT crsql_as_crr ('countries');
--> statement-breakpoint
CREATE INDEX `nameIdx` ON `countries` (`name`);