const year          = document.getElementById("year");
const btnGotoMain   = document.getElementById("btn_goto_main");
const inputApiKey   = document.getElementById("input_api_key");
const btnHideApiKey = document.getElementById("btn_hide_api_key");
const btnShowApiKey = document.getElementById("btn_show_api_key");
const btnSaveApiKey = document.getElementById("btn_save_api_key");
const badgeValid    = document.getElementById("badge_valid");
const badgeInvalid  = document.getElementById("badge_invalid");

const URL_VALIDATE_KEY = API_URL + '/validate-key';

let apiKey = null;

/**
 * Add event listeners to buttons and/or inputs.
 */
btnGotoMain.addEventListener("click", goToMainPage);
btnShowApiKey.addEventListener("click", showApiKey);
btnHideApiKey.addEventListener("click", hideApiKey);
inputApiKey.addEventListener("input", onApiKeyInput);
btnSaveApiKey.addEventListener("click", saveApiKey);

/**
 * Immediately executes when the popup is opened.
 */
(async function initPopupWindow() {
    year.textContent = new Date().getFullYear();

    chrome.storage.local.get(['api_key', 'authenticated'], (data) => {
        if (data.api_key) {
            inputApiKey.value = data.api_key;
        }
        if (data.authenticated) {
            inputApiKey.classList.add("is-valid");
            btnGotoMain.disabled = false;
            badgeValid.style.display = "inline-block";
        } else {
            inputApiKey.classList.add("is-invalid");
            badgeInvalid.style.display = "inline-block";
        }
    });
})();

function goToMainPage() {
    chrome.browserAction.setPopup({popup: 'popup.html'}, setHref);
}

function setHref() {
    window.location.href = "popup.html";
}

function showApiKey() {
    btnHideApiKey.style.display = "block";
    btnShowApiKey.style.display = "none";
    inputApiKey.type = "text";
}

function hideApiKey() {
    btnHideApiKey.style.display = "none";
    btnShowApiKey.style.display = "block";
    inputApiKey.type = "password";
}

function onApiKeyInput() {
    inputApiKey.classList.remove("is-valid", "is-invalid");
    btnSaveApiKey.disabled = false;
    badgeValid.style.display = "none";
    badgeInvalid.style.display = "none";
    btnGotoMain.disabled = true;
}

function saveApiKey() {
    btnSaveApiKey.disabled = true;
    apiKey = inputApiKey.value;
    chrome.storage.local.set({ api_key: apiKey }, validateApiKey);
}

/**
 * TODO
 */
function validateApiKey() {
    fetch(prepareUrl(URL_VALIDATE_KEY))
    .then(res => {
        res.ok ? handleApiKeyValid(res) :  handleApiKeyInvalid();
    });
}

function handleApiKeyValid(res) {
    inputApiKey.classList.remove("is-invalid");
    inputApiKey.classList.add("is-valid");
    badgeValid.style.display = "inline-block";
    btnGotoMain.disabled = false;
    chrome.storage.local.set({ authenticated: true, user: res.headers.get('x-user') ?? "" });
    chrome.browserAction.setPopup({popup: 'popup.html'});
    TOAST.fire({
        icon:  'success',
        title: 'API Key successfully saved.'
    });
}

function handleApiKeyInvalid() {
    inputApiKey.classList.remove("is-valid");
    inputApiKey.classList.add("is-invalid");
    badgeInvalid.style.display = "inline-block";
    btnGotoMain.disabled = true;
    chrome.storage.local.set({ authenticated: false });
    chrome.browserAction.setPopup({popup: 'popup_apikey.html'});
    TOAST.fire({
        icon:  'error',
        title: 'API Key validation failed.'
    });
}