CREATE TABLE `list` (
	`id` text PRIMARY KEY NOT NULL,
	`content` text,
	`position` text
);
--> statement-breakpoint
SELECT
	crsql_as_crr ('list');
--> statement-breakpoint
SELECT
	crsql_fract_as_ordered ('list', 'position');
--> statement-breakpoint
CREATE INDEX `positionIdx` ON `list` (`position`);