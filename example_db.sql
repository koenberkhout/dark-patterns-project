-- phpMyAdmin SQL Dump
-- version 5.1.3-2.el8.remi
-- https://www.phpmyadmin.net/
--
-- Host: localhost
-- Generation Time: Jun 02, 2022 at 07:24 PM
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
-- Database: `example_db`
--

-- --------------------------------------------------------

--
-- Table structure for table `cookies`
--

CREATE TABLE `cookies` (
  `id` bigint(20) NOT NULL,
  `url` varchar(256) COLLATE utf8mb4_unicode_ci NOT NULL,
  `mode` enum('initial','accept_all','deny_all') COLLATE utf8mb4_unicode_ci NOT NULL,
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
-- Table structure for table `websites`
--

CREATE TABLE `websites` (
  `id` int(11) NOT NULL,
  `url` varchar(256) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `initial_fetches` int(11) NOT NULL DEFAULT 0,
  `initial_completed` datetime DEFAULT NULL,
  `accept_all_fetches` int(11) NOT NULL DEFAULT 0,
  `accept_all_completed` datetime DEFAULT NULL,
  `accept_all_clicks` int(11) DEFAULT NULL,
  `deny_basic_fetches` int(11) NOT NULL DEFAULT 0,
  `deny_basic_completed` datetime DEFAULT NULL,
  `deny_basic_clicks` int(11) DEFAULT NULL,
  `deny_advanced_fetches` int(11) NOT NULL DEFAULT 0,
  `deny_advanced_completed` datetime DEFAULT NULL,
  `deny_advanced_clicks` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `websites`
--

INSERT INTO `websites` (`id`, `url`, `user`, `initial_fetches`, `initial_completed`, `accept_all_fetches`, `accept_all_completed`, `accept_all_clicks`, `deny_basic_fetches`, `deny_basic_completed`, `deny_basic_clicks`, `deny_advanced_fetches`, `deny_advanced_completed`, `deny_advanced_clicks`) VALUES
(1, 'apple.com', NULL, 0, NULL, 0, NULL, NULL, 0, NULL, NULL, 0, NULL, NULL),
(2, 'cnn.com', NULL, 0, NULL, 0, NULL, NULL, 0, NULL, NULL, 0, NULL, NULL),
(3, 'google.com', NULL, 0, NULL, 0, NULL, NULL, 0, NULL, NULL, 0, NULL, NULL),
(4, 'tesla.com', NULL, 0, NULL, 0, NULL, NULL, 0, NULL, NULL, 0, NULL, NULL),
(5, 'microsoft.com', NULL, 0, NULL, 0, NULL, NULL, 0, NULL, NULL, 0, NULL, NULL),
(6, 'omroepbrabant.nl', NULL, 0, NULL, 0, NULL, NULL, 0, NULL, NULL, 0, NULL, NULL),
(7, 'ou.nl', NULL, 0, NULL, 0, NULL, NULL, 0, NULL, NULL, 0, NULL, NULL);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `cookies`
--
ALTER TABLE `cookies`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_cookies_url` (`url`);

--
-- Indexes for table `websites`
--
ALTER TABLE `websites`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_website_url` (`url`) USING BTREE;

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `cookies`
--
ALTER TABLE `cookies`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `websites`
--
ALTER TABLE `websites`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `cookies`
--
ALTER TABLE `cookies`
  ADD CONSTRAINT `fk_cookies_url` FOREIGN KEY (`url`) REFERENCES `websites` (`url`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
