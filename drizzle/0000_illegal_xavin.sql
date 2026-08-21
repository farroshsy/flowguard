CREATE TABLE `controlContracts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`controlKey` varchar(128) NOT NULL,
	`title` varchar(256) NOT NULL,
	`domain` varchar(64) NOT NULL,
	`yaml` text NOT NULL,
	`version` varchar(64) NOT NULL DEFAULT 'v1',
	`provenance` varchar(256) NOT NULL DEFAULT 'User-authored FlowGuard contract',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `controlContracts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `controlExecutions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`contractId` int,
	`controlKey` varchar(128) NOT NULL,
	`process` varchar(128) NOT NULL,
	`verdict` enum('PASS','FAIL','INCONCLUSIVE') NOT NULL,
	`traceId` varchar(256) NOT NULL,
	`evidenceHash` varchar(128) NOT NULL,
	`provenanceLabel` varchar(128) NOT NULL,
	`provenanceSource` varchar(512) NOT NULL,
	`finding` json,
	`assertions` json NOT NULL,
	`executedAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `controlExecutions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `grcExceptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`executionId` int NOT NULL,
	`externalGrcReference` varchar(256),
	`controlKey` varchar(128) NOT NULL,
	`title` varchar(256) NOT NULL,
	`status` enum('OPEN','IN_REMEDIATION','CLOSED') NOT NULL DEFAULT 'OPEN',
	`severity` enum('HIGH','MEDIUM','LOW') NOT NULL DEFAULT 'MEDIUM',
	`ownerLabel` varchar(256) NOT NULL,
	`dueAt` timestamp,
	`remediation` text NOT NULL,
	`retestStatus` enum('PENDING','PASSED','FAILED') NOT NULL DEFAULT 'PENDING',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `grcExceptions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`loginMethod` varchar(64),
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);
--> statement-breakpoint
CREATE INDEX `controlContracts_owner_updated_idx` ON `controlContracts` (`ownerId`,`updatedAt`);--> statement-breakpoint
CREATE INDEX `controlExecutions_owner_created_idx` ON `controlExecutions` (`ownerId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `controlExecutions_trace_idx` ON `controlExecutions` (`traceId`);--> statement-breakpoint
CREATE INDEX `grcExceptions_owner_status_idx` ON `grcExceptions` (`ownerId`,`status`);--> statement-breakpoint
CREATE INDEX `grcExceptions_execution_idx` ON `grcExceptions` (`executionId`);