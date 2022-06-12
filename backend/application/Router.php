<?php

require_once 'composer/vendor/autoload.php';

// Load environment variables from .env
(Dotenv\Dotenv::createImmutable(__DIR__))->load();

// Controller handles the requests
require_once 'Controller.php';

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
$f3->route('GET  /stats-reasons',             'Controller->statsAndReasons');
$f3->route('GET  /validate-key',              'Controller->validateKey');
$f3->route('GET  /next-website/@mode',        'Controller->nextWebsite');
$f3->route('POST /report-cookies/@mode/@url', 'Controller->reportCookiesAndClicks');

// Start routing
$f3->run();