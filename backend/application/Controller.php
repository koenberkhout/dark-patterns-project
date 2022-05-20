<?php

class Controller {

    private $MODES = array('initial', 'accept_all', 'deny_all');

    private $HTTP_STATUSES = array(
        400 => 'Bad Request',
        401 => 'Authentication Failed',
    );

    private function dieWith($code, $message = null) {
        http_response_code($code);
        echo json_encode($message ?? $this->HTTP_STATUSES[$code]);
        die;
    }

    function beforeRoute($f3, $args) {
        // Always set content-type json
        header('Content-Type: application/json; charset=utf-8');

        // Validate API Key
        if (!isset($_GET['api_key']) || $_GET['api_key'] !== $_ENV['API_KEY']) {
            $this->dieWith(401);
        }
    }


    // 'GET /'
    function root() {
        echo json_encode('Welcome to the Dark Patterns Cookie Helper API.');
    }


    // 'GET /stats'
    function stats($f3) {
        $result = $f3->db->exec("SELECT * FROM `websites`");
        if (!$result || !is_array($result)) {
            echo json_encode("");
            die;
        }
        $count_total          = count($result);
        $completed_initial    = count(array_filter($result, fn ($item) => $item['initial_completed'] !== null));
        $completed_accept_all = count(array_filter($result, fn ($item) => $item['accept_all_completed'] !== null));
        $completed_deny_all   = count(array_filter($result, fn ($item) => $item['deny_all_completed'] !== null));

        echo json_encode(array(
            'count_total'          => $count_total,
            'completed_initial'    => $completed_initial,
            'completed_accept_all' => $completed_accept_all,
            'completed_deny_all'   => $completed_deny_all
        ));
    }


    // 'GET /next-website/@mode'
    function nextWebsite($f3,$args) {
        $mode = $args['mode'];
        if (!in_array($mode, $this->MODES)) {
            $this->dieWith(400);
        }
        $column_completed   = $mode . '_completed';
        $column_fetch_count = $mode . '_fetch_count';
        
        $result = $f3->db->exec("SELECT * FROM `websites` WHERE `{$column_completed}` IS NULL ORDER BY `{$column_fetch_count}` LIMIT 1");
        if (!$result) {
            echo json_encode("");
            die;
        }
        $website = $result[0]['url'];
        $f3->db->exec("UPDATE `websites` SET `{$column_fetch_count}` = `{$column_fetch_count}` + 1 WHERE `url` = '{$website}'");

        echo json_encode($website);
    }


    // 'POST /report-cookies/@url/@mode'
    function reportCookiesAndClicks($f3,$args) {

        // Extract mode
        $mode = $args['mode'];
        if (!in_array($mode, $this->MODES)) {
            $this->dieWith(400);
        }

        // Extract and verify url with a prepared statement (safe from SQL injection)
        $url = $args['url'];
        $result = $f3->db->exec("SELECT * FROM `websites` WHERE `url` = (?)", array($url));
        if (!$result || count($result) !== 1) {
            $this->dieWith(400);
        }

        // Extract data from POST
        $data = json_decode($f3->BODY, false);
        if (!$data || !isset($data->click_count) || !isset($data->cookies) || !is_array($data->cookies)) {
            $this->dieWith(400);
        }
        $click_count = $data->click_count;
        $cookies     = $data->cookies;

        // Ensure that query params and cookie fields match
        $cookiesFiltered = array_filter($cookies, fn ($cookie) => $cookie->url === $url && $cookie->mode === $mode);
        if (count($cookies) != count($cookiesFiltered)) {
            $this->dieWith(400);
        }

        // Insert cookies into database (the copyFrom function is safe from SQL injection)
        $f3->db->begin();
        $f3->db->exec("DELETE FROM `cookies` WHERE `url` = (?) AND `mode` = '{$mode}'", array($url));
        $cookie_mapper = new DB\SQL\Mapper($f3->db, 'cookies');
        foreach ($cookies as $cookie) {
            $cookie_mapper->copyFrom($cookie);
            $cookie_mapper->save();
            $cookie_mapper->reset();
        }
        if ($mode !== 'initial') {
            $column_click_count = $mode . '_click_count';
            $f3->db->exec("UPDATE `websites` SET `{$column_click_count}` = (?) WHERE `url` = (?)", array($click_count, $url));
        }
        $column_completed = $mode . '_completed';
        $f3->db->exec("UPDATE `websites` SET `{$column_completed}` = NOW() WHERE `url` = (?)", array($url));
        $f3->db->commit();

        echo json_encode("Cookies successfully recorded.");
    }
}