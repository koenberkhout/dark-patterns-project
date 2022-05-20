// Set defaults
chrome.browserAction.setPopup({popup: 'popup_apikey.html'});
chrome.browserAction.setBadgeText({ text: '' });
chrome.storage.local.remove('notification');
chrome.storage.local.set({ btn_record_enabled: false });
chrome.storage.local.set({ 'click_count': 0 });

// Set popup for authenticated users
chrome.storage.local.get('authenticated', (data) => {
    if (data.authenticated) {
        chrome.browserAction.setPopup({popup: 'popup.html'});
    }
});

// Add onMessage listener to send notifications
chrome.runtime.onMessage.addListener(data => {
    if (data.type === 'notification') {
        chrome.notifications.create('', data.options);
    }
});

// Add onMessage listener to clear all browsing data and visit website
chrome.runtime.onMessage.addListener(data => {
    if (data.type === 'clear_all_and_visit') {
        chrome.browsingData.remove(
            {},
            {
                // Clear all browsing data except saved passwords
                "passwords": false,
                "appcache": true,
                "cache": true,
                "cacheStorage": true,
                "cookies": true,
                "downloads": true,
                "fileSystems": true,
                "formData": true,
                "history": true,
                "indexedDB": true,
                "localStorage": true,
                "serviceWorkers": true,
                "webSQL": true
            }, 
            chrome.storage.local.set({ 'click_count': 0 }, 
            chrome.tabs.update({ url: new URL("https://" + data.options.url).toString(), active: true }))
        );
    }
});

// Measure clicks
chrome.runtime.onMessage.addListener(message => {
    if (message === 'clicked') {
        chrome.storage.local.get('click_count', (data) => {
            chrome.storage.local.set({'click_count' : (data.click_count + 1)});
        });
    }
});