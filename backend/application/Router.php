<?php

require_once 'composer/vendor/autoload.php';
require_once 'Controller.php';

// Load environment variables from .env
(Dotenv\Dotenv::createImmutable(__DIR__))->load();

// Load fat-free framework
$f3 = \Base::instance();

// Set MySQL database
$db = new DB\SQL(
    'mysql:host=' . $_ENV["DB_HOST"] . ';port=' . $_ENV["DB_PORT"] . ';dbname=' . $_ENV["DB_NAME"],
    $_ENV["DB_USER"],
    $_ENV["DB_PASS"]
);
$f3->set('db', $db);

// TODO [start] remove in production
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);
$f3->set('DEBUG', 3);
// TODO [end]

// Endpoints
$f3->route('GET  /',                          'Controller->root');
$f3->route('GET  /stats',                     'Controller->stats');
$f3->route('GET  /next-website/@mode',        'Controller->nextWebsite');
$f3->route('POST /report-cookies/@mode/@url', 'Controller->reportCookiesAndClicks');

// Start routing
$f3->run();