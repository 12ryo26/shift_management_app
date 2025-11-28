ALTER TABLE `shiftRequests` MODIFY COLUMN `requestType` enum('off','morning','early','late','all') NOT NULL;--> statement-breakpoint
ALTER TABLE `finalShifts` ADD `shiftType` enum('morning','early','late','all') NOT NULL;--> statement-breakpoint
ALTER TABLE `shiftRequests` DROP COLUMN `preferredStartTime`;--> statement-breakpoint
ALTER TABLE `shiftRequests` DROP COLUMN `preferredEndTime`;