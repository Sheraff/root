CREATE TABLE `list` (
	`id` text PRIMARY KEY NOT NULL,
	`content` text,
	`position` text
);
--> statement-breakpoint
CREATE INDEX `positionIdx` ON `list` (`position`);