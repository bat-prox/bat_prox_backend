-- phpMyAdmin SQL Dump
-- version 5.1.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Mar 23, 2026 at 09:10 AM
-- Server version: 10.4.19-MariaDB
-- PHP Version: 8.0.7

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `test_db`
--

-- --------------------------------------------------------

--
-- Table structure for table `forgot_password_requests`
--

CREATE TABLE `forgot_password_requests` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `user_id` int(11) NOT NULL,
  `phone` varchar(20) NOT NULL,
  `status` enum('pending','processing','completed','rejected') DEFAULT 'pending',
  `requested_at` datetime DEFAULT current_timestamp(),
  `processed_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Dumping data for table `forgot_password_requests`
--

INSERT INTO `forgot_password_requests` (`id`, `user_id`, `phone`, `status`, `requested_at`, `processed_at`) VALUES
(1, 29, '03023272316', 'pending', '2026-03-19 01:35:09', NULL),
(2, 29, '03023272316', 'pending', '2026-03-19 12:12:44', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `likes`
--

CREATE TABLE `likes` (
  `id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `video_id` int(11) DEFAULT NULL,
  `liked_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------

--
-- Table structure for table `payment_methods`
--

CREATE TABLE `payment_methods` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `title` varchar(100) NOT NULL,
  `account_no` varchar(100) NOT NULL,
  `bank_name` varchar(100) NOT NULL,
  `bank_icon` varchar(255) DEFAULT NULL,
  `status` enum('active','inactive') DEFAULT 'active',
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Dumping data for table `payment_methods`
--

INSERT INTO `payment_methods` (`id`, `title`, `account_no`, `bank_name`, `bank_icon`, `status`, `created_at`, `updated_at`) VALUES
(1, 'Easypaisa', '0321234567', 'Easypaisa Pakistan', 'https://example.com/easypaisa.png', 'active', '2026-03-19 02:45:15', '2026-03-19 02:45:15'),
(2, 'JazzCash', '0321234560', 'JAzzcash Pakistan', 'https://example.com/easypaisa.png', 'active', '2026-03-19 11:22:33', '2026-03-19 11:22:33');

-- --------------------------------------------------------

--
-- Table structure for table `profiles`
--

CREATE TABLE `profiles` (
  `user_id` int(11) NOT NULL,
  `full_name` varchar(100) DEFAULT NULL,
  `bio` text DEFAULT NULL,
  `profile_image` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------

--
-- Table structure for table `tasks`
--

CREATE TABLE `tasks` (
  `id` varchar(36) NOT NULL,
  `user_id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `status` enum('pending','processing','completed','canceled') DEFAULT 'pending',
  `version` int(11) DEFAULT 1,
  `is_deleted` tinyint(1) DEFAULT 0,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `startTaskAt` datetime DEFAULT NULL,
  `endTaskAt` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------

--
-- Table structure for table `test_user`
--

CREATE TABLE `test_user` (
  `id` int(11) NOT NULL,
  `name` varchar(50) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `password` varchar(225) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------

--
-- Table structure for table `transactions`
--

CREATE TABLE `transactions` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `amount` decimal(15,2) NOT NULL,
  `transaction_id` varchar(255) NOT NULL,
  `from_account` varchar(255) NOT NULL,
  `from_bank` varchar(255) NOT NULL,
  `from_account_title` varchar(255) NOT NULL,
  `to_account_no` varchar(255) NOT NULL,
  `to_bank` varchar(255) NOT NULL,
  `to_account_title` varchar(255) NOT NULL,
  `status` enum('pending','confirmed','failed') DEFAULT 'pending',
  `type` enum('deposit','withdraw') DEFAULT 'deposit',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Dumping data for table `transactions`
--

INSERT INTO `transactions` (`id`, `user_id`, `amount`, `transaction_id`, `from_account`, `from_bank`, `from_account_title`, `to_account_no`, `to_bank`, `to_account_title`, `status`, `type`, `created_at`) VALUES
(1, 31, '1000.50', 'TXN123456', 'User Bank Acc No', 'User Bank', 'User Name', '1234567890', 'Bank Name', 'App Account Title', 'confirmed', 'deposit', '2026-03-19 06:06:12'),
(2, 31, '100.00', 'W1774007871832957', '', '', '', '1234567890', 'Bank Name', 'John Doe', 'pending', 'withdraw', '2026-03-20 11:57:51'),
(3, 31, '100.00', 'W1774008417543900', '', '', '', '1234567890', 'Bank Name', 'John Doe', 'confirmed', 'withdraw', '2026-03-20 12:06:57'),
(4, 29, '1000.50', 'TXN123458', 'User Bank Acc No', 'User Bank', 'User Name', '1234567890', 'Bank Name', 'App Account Title', 'pending', 'deposit', '2026-03-21 06:08:38'),
(5, 29, '400.00', 'W1774073359555461', '', '', '', '1234567890', 'Bank Name', 'John Doe', 'pending', 'withdraw', '2026-03-21 06:09:19');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `name` varchar(256) NOT NULL,
  `image` varchar(255) DEFAULT NULL,
  `Video` varchar(255) DEFAULT NULL,
  `password` varchar(255) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `age` int(11) DEFAULT NULL,
  `fb_id` varchar(50) DEFAULT NULL,
  `address` varchar(100) DEFAULT NULL,
  `status` varchar(10) DEFAULT 'inactive',
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0,
  `deleted_at` datetime DEFAULT NULL,
  `is_Verified` tinyint(1) NOT NULL DEFAULT 0,
  `phone` varchar(100) DEFAULT NULL,
  `token_version` int(11) DEFAULT 0,
  `refresh_token` text DEFAULT NULL,
  `role` varchar(20) NOT NULL DEFAULT 'user',
  `batprox_username` varchar(255) DEFAULT NULL,
  `batprox_password` varchar(255) DEFAULT NULL,
  `isPlayStore` tinyint(1) NOT NULL DEFAULT 0,
  `balance` decimal(15,2) NOT NULL DEFAULT 0.00
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `name`, `image`, `Video`, `password`, `email`, `created_at`, `age`, `fb_id`, `address`, `status`, `is_Verified`, `phone`, `token_version`, `refresh_token`, `role`, `batprox_username`, `batprox_password`, `isPlayStore`, `balance`) VALUES
(29, 'Hans', NULL, NULL, '$2b$10$8y5oiXQ8Roo1uwg8UEMaXeYK5IUJzXk06K/PyjTC6cKJg13PTs1y6', NULL, '2026-03-19 01:22:56', NULL, NULL, NULL, 'active', 0, '03023272316', 6, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MjksInRva2VuX3ZlcnNpb24iOjYsInR5cGUiOiJyZWZyZXNoIiwiaWF0IjoxNzc0MDQxMjkwLCJleHAiOjE3NzQ2NDYwOTB9.IRV604yCmeR2FkHm6oKvu5AvebXejciUygEIxE84ySI', 'user', 'BatPro_123', 'batprox', 0, '500.00'),
(30, 'Admin', NULL, NULL, '$2b$10$CEFzkxdNGwrI.OxtWlvAIuM2N4Bfh3k6xX3EuxJszTTMADthzPD3K', NULL, '2026-03-19 01:43:20', NULL, NULL, NULL, 'active', 0, '09274144557', 1, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MzAsInRva2VuX3ZlcnNpb24iOjEsInR5cGUiOiJyZWZyZXNoIiwiaWF0IjoxNzczODY1MTQ4LCJleHAiOjE3NzQ0Njk5NDh9.5ot9DTzyrv24lFY53uGb7lfDOnU7QhS8wlhMBZj58Gc', 'admin', NULL, NULL, 0, '0.00'),
(31, 'Admin', NULL, NULL, '$2b$10$O2ZgZrTibkd2Efha0xEWBuAdqhhbxW0bJOSGYrr83DChqVwfNzbDi', NULL, '2026-03-19 01:48:36', NULL, NULL, NULL, 'active', 0, '09272144557', 15, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MzEsInRva2VuX3ZlcnNpb24iOjE1LCJ0eXBlIjoicmVmcmVzaCIsImlhdCI6MTc3NDA0MjE2NiwiZXhwIjoxNzc0NjQ2OTY2fQ.G0BHnCo0xz-TC3hMyfQAWdhhd5lC75KqsUnuAaZU58E', 'admin', NULL, NULL, 0, '0.00'),
(32, 'Hans', NULL, NULL, '$2b$10$dhv2RSoW0v/HwHNzuArEyOUz9Z/wBebLmblWtlWM/j5bk0dk8vPZa', NULL, '2026-03-19 02:36:41', NULL, NULL, NULL, 'active', 0, '03023272310', 0, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MzIsInRva2VuX3ZlcnNpb24iOjAsInR5cGUiOiJyZWZyZXNoIiwiaWF0IjoxNzczODY4MDAxLCJleHAiOjE3NzQ0NzI4MDF9.8QLz-50iye0SLjdq2-mABPTniqyNjr1xXpArBtpbNrk', 'user', NULL, NULL, 1, '0.00'),
(33, 'Hans Raj', NULL, NULL, '$2b$10$wl4gWtU7vdXsU4vg2KL2eevGdBpzri/c6zGoj4WbuHlnUjPz4/bqa', NULL, '2026-03-19 11:59:42', NULL, NULL, NULL, 'active', 0, '03232323232', 0, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MzMsInRva2VuX3ZlcnNpb24iOjAsInR5cGUiOiJyZWZyZXNoIiwiaWF0IjoxNzczOTAxNzgyLCJleHAiOjE3NzQ1MDY1ODJ9.8c33wi-95ZHU0VBHB4dSKOEdoSgC8FMH0X8dhs7atJ0', 'user', NULL, NULL, 0, '0.00');

-- --------------------------------------------------------

--
-- Table structure for table `videos`
--

CREATE TABLE `videos` (
  `id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `title` varchar(100) DEFAULT NULL,
  `video_path` varchar(255) DEFAULT NULL,
  `thumbnail_path` varchar(255) DEFAULT NULL,
  `uploaded_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `forgot_password_requests`
--
ALTER TABLE `forgot_password_requests`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_forgot_password_phone` (`phone`),
  ADD KEY `idx_forgot_password_status` (`status`),
  ADD KEY `fk_forgot_password_user` (`user_id`);

--
-- Indexes for table `likes`
--
ALTER TABLE `likes`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `user_id` (`user_id`,`video_id`),
  ADD KEY `video_id` (`video_id`);

--
-- Indexes for table `payment_methods`
--
ALTER TABLE `payment_methods`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_payment_status` (`status`);

--
-- Indexes for table `profiles`
--
ALTER TABLE `profiles`
  ADD PRIMARY KEY (`user_id`);

--
-- Indexes for table `tasks`
--
ALTER TABLE `tasks`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `test_user`
--
ALTER TABLE `test_user`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `transactions`
--
ALTER TABLE `transactions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `transaction_id` (`transaction_id`),
  ADD KEY `idx_user_id` (`user_id`),
  ADD KEY `idx_transaction_id` (`transaction_id`),
  ADD KEY `idx_status` (`status`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_users_email` (`email`),
  ADD KEY `idx_users_token_version` (`token_version`);

--
-- Indexes for table `videos`
--
ALTER TABLE `videos`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `forgot_password_requests`
--
ALTER TABLE `forgot_password_requests`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `likes`
--
ALTER TABLE `likes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `payment_methods`
--
ALTER TABLE `payment_methods`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `test_user`
--
ALTER TABLE `test_user`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `transactions`
--
ALTER TABLE `transactions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=34;

--
-- AUTO_INCREMENT for table `videos`
--
ALTER TABLE `videos`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `forgot_password_requests`
--
ALTER TABLE `forgot_password_requests`
  ADD CONSTRAINT `fk_forgot_password_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `likes`
--
ALTER TABLE `likes`
  ADD CONSTRAINT `likes_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `likes_ibfk_2` FOREIGN KEY (`video_id`) REFERENCES `videos` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `profiles`
--
ALTER TABLE `profiles`
  ADD CONSTRAINT `profiles_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `tasks`
--
ALTER TABLE `tasks`
  ADD CONSTRAINT `tasks_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `transactions`
--
ALTER TABLE `transactions`
  ADD CONSTRAINT `transactions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `videos`
--
ALTER TABLE `videos`
  ADD CONSTRAINT `videos_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
