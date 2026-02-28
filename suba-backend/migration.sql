CREATE TABLE `ai_insights` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `type` enum('cost_saving_tip','overlap_detected','alert','suggestion') NOT NULL,
  `message` text DEFAULT NULL,
  `affected_services` text DEFAULT NULL,
  `confidence_score` decimal(3,2) DEFAULT NULL,
  `resolved` tinyint(1) DEFAULT 0,
  `generated_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `budget_reports` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `report_month` varchar(7) DEFAULT NULL,
  `total_spent` decimal(10,2) DEFAULT NULL,
  `recurring_services` int(11) DEFAULT NULL,
  `new_subscriptions` int(11) DEFAULT NULL,
  `canceled_subscriptions` int(11) DEFAULT NULL,
  `most_expensive_service` varchar(100) DEFAULT NULL,
  `category_breakdown` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`category_breakdown`)),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `notifications` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `type` enum('reminder','insight','invite','warning') NOT NULL,
  `title` varchar(255) DEFAULT NULL,
  `message` text DEFAULT NULL,
  `seen` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `payments` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `subscription_id` int(11) DEFAULT NULL,
  `plan` varchar(50) DEFAULT NULL,
  `amount` decimal(10,2) DEFAULT NULL,
  `currency` varchar(10) DEFAULT 'NGN',
  `method` varchar(50) DEFAULT NULL,
  `payment_method` varchar(50) DEFAULT NULL,
  `transaction_id` varchar(100) DEFAULT NULL,
  `status` enum('pending','successful','failed') DEFAULT 'pending',
  `paid_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `receipt_url` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `shared_plans` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `plan_name` varchar(255) NOT NULL,
  `total_amount` decimal(10,2) NOT NULL,
  `split_type` enum('equal','custom') NOT NULL DEFAULT 'equal',
  `max_participants` int(11) DEFAULT 2,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `shared_plan_participants` (
  `id` int(11) NOT NULL,
  `plan_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `split_amount` decimal(10,2) DEFAULT NULL,
  `status` enum('invited','accepted','declined','removed') DEFAULT 'invited',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `subscriptions` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `service_provider` varchar(100) DEFAULT NULL,
  `category` varchar(50) DEFAULT NULL,
  `amount` decimal(10,2) NOT NULL,
  `currency` varchar(10) DEFAULT 'NGN',
  `billing_cycle` enum('daily','weekly','monthly','yearly') NOT NULL,
  `next_billing_date` date NOT NULL,
  `last_payment_date` date DEFAULT NULL,
  `auto_renew` tinyint(1) DEFAULT 1,
  `status` enum('active','cancelled','paused') DEFAULT 'active',
  `skipped_at` datetime DEFAULT NULL,
  `next_reminder_date` date DEFAULT NULL,
  `total_payments` decimal(10,2) DEFAULT 0.00,
  `payment_count` int(11) DEFAULT 0,
  `reminder_days_before` int(11) DEFAULT 3,
  `is_shared` tinyint(1) DEFAULT 0,
  `notes` text DEFAULT NULL,
  `cancellation_link` text DEFAULT NULL,
  `logo_url` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `full_name` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `phone_number` varchar(20) DEFAULT NULL,
  `country` varchar(100) DEFAULT NULL,
  `avatar_url` text DEFAULT NULL,
  `prefers_dark_mode` tinyint(1) DEFAULT 0,
  `default_currency` varchar(10) DEFAULT 'NGN',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Add primary keys and indexes
ALTER TABLE `ai_insights`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

ALTER TABLE `budget_reports`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

ALTER TABLE `notifications`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

ALTER TABLE `payments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `subscription_id` (`subscription_id`);

ALTER TABLE `shared_plans`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

ALTER TABLE `shared_plan_participants`
  ADD PRIMARY KEY (`id`),
  ADD KEY `plan_id` (`plan_id`),
  ADD KEY `user_id` (`user_id`);

ALTER TABLE `subscriptions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);

-- Add auto-increment
ALTER TABLE `ai_insights`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

ALTER TABLE `budget_reports`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

ALTER TABLE `notifications`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

ALTER TABLE `payments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

ALTER TABLE `shared_plans`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

ALTER TABLE `shared_plan_participants`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

ALTER TABLE `subscriptions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

-- Add foreign key constraints
ALTER TABLE `ai_insights`
  ADD CONSTRAINT `ai_insights_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

ALTER TABLE `budget_reports`
  ADD CONSTRAINT `budget_reports_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

ALTER TABLE `notifications`
  ADD CONSTRAINT `notifications_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

ALTER TABLE `payments`
  ADD CONSTRAINT `payments_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `payments_ibfk_2` FOREIGN KEY (`subscription_id`) REFERENCES `subscriptions` (`id`) ON DELETE SET NULL;

ALTER TABLE `shared_plans`
  ADD CONSTRAINT `shared_plans_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

ALTER TABLE `shared_plan_participants`
  ADD CONSTRAINT `shared_plan_participants_ibfk_1` FOREIGN KEY (`plan_id`) REFERENCES `shared_plans` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `shared_plan_participants_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

ALTER TABLE `users`
  ADD COLUMN `default_monthly_budget` decimal(10,2) DEFAULT 0.00 AFTER `default_currency`;