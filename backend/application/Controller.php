<?php

class Controller {

    private $MODES = array(
        'initial', 
        'accept_all', 
        'deny_basic', 
        'deny_advanced'
    );
    private $SOURCES = array(
        'cookiepedia', 
        'cookiedatabase', 
        'opencookiedatabase'
    );
    private $HTTP_STATUSES = array(
        400 => 'Bad Request',
        401 => 'Authentication Failed',
    );
    private $API_ENTRIES = [];

    // Pupulate $API_ENTRIES with values from .env
    function __construct() {
        $api_entries = explode(',', $_ENV['API_ENTRIES']);
        foreach ($api_entries as $api_entry) {
            $splitted = explode(':', $api_entry);
            $api_key  = $splitted[0];
            $user     = $splitted[1];
            $this->API_ENTRIES[$api_key] = $user;
        }
    }


    private function dieWith($code, $message = null) {
        http_response_code($code);
        echo json_encode($message ?? $this->HTTP_STATUSES[$code]);
        die;
    }


    function beforeRoute($f3, $args) {
        // Always set content-type json
        header('Content-Type: application/json; charset=utf-8');

        // Validate API Key
        if (!isset($_GET['api_key']) || !in_array($_GET['api_key'], array_keys($this->API_ENTRIES))) {
            $this->dieWith(401);
        }
    }


    // 'GET /'
    function root() {
        echo json_encode('Welcome to the Dark Patterns Cookie Helper API.');
    }


    // 'GET /validate-key'
    function validateKey() {
        header('X-User: ' . $this->API_ENTRIES[$_GET['api_key']]);
        echo json_encode('Your API key is valid.');
    }


    // 'GET /stats-reasons'
    function statsAndReasons($f3) {
        $result = $f3->db->exec("SELECT * FROM `website` LEFT OUTER JOIN `recording` ON `website`.url = `recording`.website_url");
        if (!$result || !is_array($result)) {
            echo json_encode("");
            die;
        }
        $stats = array('count_total' => count(array_unique(array_column($result, 'website_id'))));
        foreach ($this->MODES as $mode) {
            $stats['completed_' . $mode] = count(array_filter($result, fn ($item) => $item['mode'] === $mode));
        }
        $reasons = $f3->db->exec("SELECT * FROM `reason`");
        
        echo json_encode(array("stats" => $stats, "reasons" => $reasons));
    }


    // 'GET /next-website/@mode'
    function nextWebsite($f3,$args) {
        $mode = $args['mode'];
        if (!in_array($mode, $this->MODES)) {
            $this->dieWith(400);
        }
        // Get API key index for current user
        $api_key   = $_GET['api_key'];
        $numkeys   = count($this->API_ENTRIES);
        $key_index = array_search($api_key, array_keys($this->API_ENTRIES));
        $user      = $this->API_ENTRIES[$api_key];
        
        // Determine which url to visit next
        $f3->db->begin();
        $column_fetches = $mode . '_fetches';
        $result = $f3->db->exec("SELECT * FROM `website` LEFT OUTER JOIN `recording` ON `website`.url = `recording`.website_url WHERE `website_id` % {$numkeys} = {$key_index} ORDER BY `{$column_fetches}` ASC, `rank` ASC");
        if (!$result) {
            $f3->db->commit();
            echo json_encode("");
            die;
        }
        $urls_current_user = array_unique(array_column($result, 'url'));
        $next_url = null;
        foreach ($urls_current_user as $url) {
            if (count(array_filter($result, fn($resultRow) => $resultRow['url'] === $url && $resultRow['mode'] === $mode)) === 0) {
                $next_url = $url;
                break;
            }
        }
        if (!$next_url) {
            $f3->db->commit();
            echo json_encode("");
            die;
        }
        // Assign user and update fetchcount
        $f3->db->exec("UPDATE `website` SET `{$column_fetches}` = `{$column_fetches}` + 1, `user` = '{$user}' WHERE `url` = '{$next_url}'");
        $f3->db->commit();

        echo json_encode($next_url);
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
        $result = $f3->db->exec("SELECT * FROM `website` WHERE `url` = (?)", array($url));
        if (!$result || count($result) !== 1) {
            $this->dieWith(400);
        }

        // Extract data from POST
        $data = json_decode($f3->BODY, false);
        if (!$data || !isset($data->clicks) || !isset($data->cookies) || !isset($data->reason) || !is_array($data->cookies)) {
            $this->dieWith(400);
        }
        $clicks  = $data->clicks;
        $reason  = $data->reason;
        $cookies = $data->cookies;

        // Ensure that query params and cookie fields match
        $cookiesFiltered = array_filter($cookies, fn ($cookie) => $cookie->website_url === $url && $cookie->mode === $mode);
        if (count($cookies) != count($cookiesFiltered)) {
            $this->dieWith(400);
        }

        $this->insertCookiesIntoDatabase($f3, $cookies, $url, $reason, $mode, $clicks);
        echo json_encode("Cookies successfully recorded.");
    }

    private function insertCookiesIntoDatabase($f3, $cookies, $url, $reason, $mode, $clicks) {
        $f3->db->begin();
        $cookie_names_in_db = [];
        $result = $f3->db->exec("SELECT `cookie_name` FROM `purpose`");
        if (is_array($result)) {
            $cookie_names_in_db = array_map(fn($obj) => $obj['cookie_name'], $result);
        }
        $cookie_names = array_unique(array_filter(array_map(fn($obj) => $obj->name, $cookies), fn($name) => !in_array($name, $cookie_names_in_db)));
        foreach ($cookie_names as $cookie_name) {
            echo json_encode("insert " . $cookie_name);
            $f3->db->exec("INSERT INTO `purpose` (`cookie_name`, `cookiepedia`, `cookiedatabase`, `opencookiedatabase`) VALUES (?, NULL, NULL, NULL);", array($cookie_name));
        }
        $f3->db->exec("DELETE FROM `recording` WHERE `website_url` = (?) AND `mode` = '{$mode}'", array($url));
        $f3->db->exec("INSERT INTO `recording` (`website_url`, `reason_id`, `mode`, `clicks`) VALUES (?,?,?,?)", array($url, $reason, $mode, $clicks));
        $recording_id = $f3->db->lastInsertId();
        $cookie_mapper = new DB\SQL\Mapper($f3->db, 'cookie');
        foreach ($cookies as $cookie) {
            $cookie->recording_id = $recording_id;
            // The copyFrom function is safe from SQL injection:
            $cookie_mapper->copyFrom($cookie);
            $cookie_mapper->save();
            $cookie_mapper->reset();
        }
        $f3->db->commit();
    }

    // 'GET /unpurposed-cookie-names/'
    function unpurposedCookieNames($f3,$args) {
        $result = $f3->db->exec("SELECT * FROM `purpose` WHERE `cookiepedia` IS NULL OR `cookiedatabase` IS NULL OR `opencookiedatabase` IS NULL;");
        if (is_array($result) && count($result)) {
            echo json_encode($result);
            die;
        }
        echo json_encode('There are no unpurposed cookies in the database.');
    }

    // 'POST /report-cookie-purposes/@which'
    function reportCookiePurposes($f3,$args) {
        $which = $args['which'];
        if (!in_array($which, $this->SOURCES)) {
            $this->dieWith(400);
        }
        $cookie_purposes = json_decode($f3->BODY, false);
        if (is_array($cookie_purposes) && count($cookie_purposes)) {
            $f3->db->begin();
            foreach ($cookie_purposes as $cookie_purpose) {
                $f3->db->exec("UPDATE `purpose` SET `{$which}` = ? WHERE `cookie_name` = ?", array($cookie_purpose->purpose, $cookie_purpose->cookieName));
            }
            $f3->db->commit();
        }
        echo json_encode('Purposes successfully added');
    }
}