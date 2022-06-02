const BADGE_CONFIG = {
    initial:       ['initial',  '#007bff', "INITIAL (DO NOTHING)", "color_initial.png", "Do nothing and open the extension popup to record the results."],
    accept_all:    ['accept',   '#28a745', "ACCEPT ALL", "color_accept_all.png", "Do 'Accept All' and open the extension popup to record the results."],
    deny_basic:    ['basic',    '#fd7e14', "DENY (BASIC)", "color_deny_basic.png", "Do 'Deny (Basic)' and open the extension popup to record the results."],
    deny_advanced: ['advanced', '#dc3545', "DENY (ADVANCED)", "color_deny_advanced.png", "Do 'Deny (Advanced)' and open the extension popup to record the results."]
}

const MODE_DICT = {
    initial:       'Initial',
    accept_all:    'Accept All',
    deny_basic:    'Deny (Basic)',
    deny_advanced: 'Deny (Advanced)'
};

const URL_STATS          = API_URL + '/stats';
const URL_NEXT_WEBSITE   = API_URL + '/next-website/@mode';
const URL_REPORT_COOKIES = API_URL + '/report-cookies/@mode/@url';

const year                  = document.getElementById("year");
const btnGotoApikey         = document.getElementById("btn_goto_apikey");
const inputWebsite          = document.getElementById("input_website");
const btnVisitNext          = document.getElementById("btn_visit_next");
const btnRecordCookies      = document.getElementById("btn_record_cookies");
const btnClearRevisit       = document.getElementById("btn_clear_revisit");
const btnTest               = document.getElementById("btn_test");
const txtCurrentMode        = document.getElementById("current_mode");
const txtUser               = document.getElementById("user");
const countTotals           = document.getElementsByClassName("count_total");
const inputReasons          = document.getElementsByClassName("input-reason");
const completedInitial      = document.getElementById("completed_initial");
const completedAcceptAll    = document.getElementById("completed_accept_all");
const completedDenyBasic    = document.getElementById("completed_deny_basic");
const completedDenyAdvanced = document.getElementById("completed_deny_advanced");

let futureMode  = 'initial';
let currentMode = null;
let apiKey      = null;
let website     = "";

/**
 * Add event listeners to buttons and/or inputs.
 */
btnClearRevisit.addEventListener("click", clearBrowsingDataAndVisitWebsite);
btnGotoApikey.addEventListener("click", goToApiKeyPage);
btnVisitNext.addEventListener("click", visitNextWebsite);
btnRecordCookies.addEventListener("click", recordCookiesAndClicks);
document.querySelectorAll("input[name='mode']").forEach((option) => {
     option.addEventListener('change', handleModeChange);
});

/**
 * Immediately executes when the popup is opened.
 */
(async function initPopupWindow() {
    year.textContent = new Date().getFullYear();
    chrome.browserAction.setBadgeText({ text: '' });
    chrome.storage.local.get(['future_mode', 'current_mode', 'website', 'api_key', 'btn_record_enabled', 'user'], (data) => {
        if (data.future_mode) {
            futureMode = data.future_mode;
        }
        document.getElementById(futureMode).checked = true;

        if (data.current_mode) {
            currentMode = data.current_mode;
            txtCurrentMode.textContent = MODE_DICT[currentMode];
        }
        if (data.website) {
            website = data.website;
            inputWebsite.value = website;
            btnClearRevisit.disabled = false;
        }
        if (data.api_key) {
            apiKey = data.api_key;
            fetchStats();
        }
        if (data.user) {
            txtUser.textContent = data.user;
        }
        if (data.btn_record_enabled) {
            btnRecordCookies.title = "";
            btnRecordCookies.disabled = false;
            Array.from(inputReasons).forEach((elem) => {
                elem.disabled = false;
            });
            chrome.storage.local.set({ btn_record_enabled: false });
        } else {
            btnVisitNext.disabled = false;
        }
    });
})();

function fetchStats() {
    fetch(prepareUrl(URL_STATS))
    .then(res => {
        if (!res.ok) {
            TOAST.fire({
                icon:  'error',
                title: 'Could not connect to the server.'
            });
            console.log(res);
        } else {
            res.json().then(stats => updateStats(stats));
        }
    });
}

function updateStats(stats) {
    Array.from(countTotals).forEach((elem) => {
        elem.textContent = stats['count_total'];
    });
    completedInitial.textContent      = stats['completed_initial'];
    completedAcceptAll.textContent    = stats['completed_accept_all'];
    completedDenyBasic.textContent    = stats['completed_deny_basic'];
    completedDenyAdvanced.textContent = stats['completed_deny_advanced'];
}

function handleModeChange(e) {
    btnRecordCookies.disabled = true;
    futureMode = e.target.id;
    chrome.storage.local.set({ future_mode: futureMode });
}

async function clearBrowsingDataAndVisitWebsite() {
    currentMode = futureMode;
    txtCurrentMode.textContent = MODE_DICT[futureMode];
    setActionBadgeAndNotification();
    chrome.storage.local.set({ current_mode: currentMode });
    chrome.runtime.sendMessage('', {
        type: 'clear_all_and_visit',
        options: {
            url: website
        }
    }, null, window.close());
}

function setActionBadgeAndNotification() {
    chrome.browserAction.setBadgeText({ text: BADGE_CONFIG[currentMode][0] });
    chrome.browserAction.setBadgeBackgroundColor({ color: BADGE_CONFIG[currentMode][1] });
    chrome.storage.local.set({ notification: {
            title: BADGE_CONFIG[currentMode][2],
            icon_url: 'img/' + BADGE_CONFIG[currentMode][3],
            message: BADGE_CONFIG[currentMode][4]
        } 
    });
}

function goToApiKeyPage() {
    chrome.browserAction.setPopup({popup: 'popup_apikey.html'}, setHref);
}

function setHref() {
    window.location.href = "popup_apikey.html";
}

function visitNextWebsite() {
    btnVisitNext.disabled = true;

    fetch(prepareUrl(URL_NEXT_WEBSITE, [['@mode',futureMode]]))
        .then(res => {
            if (!res.ok) {
                TOAST.fire({
                    icon:  'error',
                    title: 'Error, please try again later.'
                });
                console.log(res);
            }
            return res.json();
        })
        .then(nextWebsite => {
            if (nextWebsite.length) {
                btnClearRevisit.disabled = false;
                btnRecordCookies.disabled = false;
                website = nextWebsite;
                inputWebsite.value = nextWebsite;
                chrome.storage.local.set({ website: nextWebsite }, clearBrowsingDataAndVisitWebsite);
            } else {
                btnVisitNext.disabled = false;
                TOAST.fire({
                    icon:  'warning',
                    title: 'You have already visited all websites assigned to you for the current mode.'
                });
            }
        });
}

function recordCookiesAndClicks() {
    btnRecordCookies.disabled = true;
    Array.from(inputReasons).forEach((elem) => {
        elem.disabled = true;
    });
    btnVisitNext.disabled = false;
    
    chrome.storage.local.get('clicks', (data) => {

        let reason = document.querySelector('input[name="reasons"]:checked').value;
        let clicks = reason !== 'ok' ? parseInt(reason) : data.clicks;

        chrome.cookies.getAll({}, (cookies) => {
            cookies = cookies.map(cookie => _.mapKeys(cookie, (v, k) => _.snakeCase(k)));
            cookies.forEach((cookie) => {
                cookie['expiration_date'] = cookie['expiration_date'] ? new Date(cookie['expiration_date']*1000).toISOString() : null;
                cookie['url'] = website;
                cookie['mode'] = currentMode;
                delete cookie['store_id'];
            });
            fetch(prepareUrl(URL_REPORT_COOKIES, [['@mode',currentMode], ['@url',website]]), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    clicks: clicks,
                    cookies: cookies
                })
            })
            .then(res => {
                if (res.ok) {
                    TOAST.fire({
                        icon:  'success',
                        title: 'Cookies successfully recorded.'
                    });
                    fetchStats();
                } else {
                    TOAST.fire({
                        icon:  'error',
                        title: 'Error, please try again later.'
                    });
                    console.log(res);
                }
            });
        });
    });
}