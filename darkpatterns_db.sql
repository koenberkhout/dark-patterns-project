-- phpMyAdmin SQL Dump
-- version 5.2.0-1.el8.remi
-- https://www.phpmyadmin.net/
--
-- Host: localhost
-- Generation Time: Jun 12, 2022 at 03:04 PM
-- Server version: 10.5.15-MariaDB-cll-lve-log
-- PHP Version: 7.3.33

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `darkpatterns_db`
--

-- --------------------------------------------------------

--
-- Table structure for table `cookie`
--

CREATE TABLE `cookie` (
  `cookie_id` bigint(20) NOT NULL,
  `recording_id` int(11) NOT NULL,
  `website_url` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `domain` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `value` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `session` tinyint(1) NOT NULL,
  `expiration_date` datetime DEFAULT NULL,
  `host_only` tinyint(1) NOT NULL,
  `http_only` tinyint(1) NOT NULL,
  `path` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `same_site` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `secure` tinyint(1) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `reason`
--

CREATE TABLE `reason` (
  `reason_id` int(11) NOT NULL,
  `description` varchar(256) COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_default` tinyint(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `reason`
--

INSERT INTO `reason` (`reason_id`, `description`, `is_default`) VALUES
(1, 'Everything okay', 1),
(2, 'No dialog/notice at all', 0),
(3, 'Notice only', 0),
(4, 'Dialog, but action unavailable', 0),
(5, 'Website not loading', 0);

-- --------------------------------------------------------

--
-- Table structure for table `recording`
--

CREATE TABLE `recording` (
  `recording_id` int(11) NOT NULL,
  `website_url` varchar(256) COLLATE utf8mb4_unicode_ci NOT NULL,
  `reason_id` int(11) NOT NULL,
  `mode` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `date` datetime NOT NULL DEFAULT current_timestamp(),
  `clicks` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `website`
--

CREATE TABLE `website` (
  `website_id` int(11) NOT NULL,
  `rank` int(11) NOT NULL COMMENT 'tranco',
  `url_orig` varchar(256) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Original url',
  `url` varchar(256) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Final url',
  `user` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `initial_fetches` int(11) NOT NULL DEFAULT 0,
  `accept_all_fetches` int(11) NOT NULL DEFAULT 0,
  `deny_basic_fetches` int(11) NOT NULL DEFAULT 0,
  `deny_advanced_fetches` int(11) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `cookie`
--
ALTER TABLE `cookie`
  ADD PRIMARY KEY (`cookie_id`),
  ADD KEY `index_cookie_recording_id` (`recording_id`),
  ADD KEY `index_cookie_website_url` (`website_url`);

--
-- Indexes for table `reason`
--
ALTER TABLE `reason`
  ADD PRIMARY KEY (`reason_id`);

--
-- Indexes for table `recording`
--
ALTER TABLE `recording`
  ADD PRIMARY KEY (`recording_id`),
  ADD KEY `index_recording_website_url` (`website_url`) USING BTREE,
  ADD KEY `fk_recording_reason_id` (`reason_id`);

--
-- Indexes for table `website`
--
ALTER TABLE `website`
  ADD PRIMARY KEY (`website_id`),
  ADD UNIQUE KEY `unique_website_url` (`url`) USING BTREE;

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `cookie`
--
ALTER TABLE `cookie`
  MODIFY `cookie_id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `reason`
--
ALTER TABLE `reason`
  MODIFY `reason_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `recording`
--
ALTER TABLE `recording`
  MODIFY `recording_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=21;

--
-- AUTO_INCREMENT for table `website`
--
ALTER TABLE `website`
  MODIFY `website_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `cookie`
--
ALTER TABLE `cookie`
  ADD CONSTRAINT `fk_cookies_recording_id` FOREIGN KEY (`recording_id`) REFERENCES `recording` (`recording_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_cookies_recording_website_url` FOREIGN KEY (`website_url`) REFERENCES `recording` (`website_url`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `recording`
--
ALTER TABLE `recording`
  ADD CONSTRAINT `fk_recording_reason_id` FOREIGN KEY (`reason_id`) REFERENCES `reason` (`reason_id`),
  ADD CONSTRAINT `fk_recording_website_url` FOREIGN KEY (`website_url`) REFERENCES `website` (`url`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
