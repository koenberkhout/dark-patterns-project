// Show notification with instructions once
chrome.storage.local.get('notification', (data) => {
    if (data.notification) {
        chrome.runtime.sendMessage('', {
            type: 'notification',
            options: {
              title: data.notification.title,
              message: data.notification.message,
              iconUrl: data.notification.icon_url,
              type: 'basic',
              priority: 2
            }
        }, null, afterShowNotification);
    }
});

function afterShowNotification() {
    chrome.storage.local.remove('notification');
}

// Unhide html content on `document_idle`
document.documentElement.style.display = "initial";

// Add click listener to root document
document.addEventListener('click', e => {
    chrome.runtime.sendMessage('clicked');
});

// Add click listeners to child documents
const frames = document.getElementsByTagName("iframe");
for (let i = 0; i < frames.length; i++) {
    let iframeDocument = frames[i].contentDocument || frames[i].contentWindow.document;
    iframeDocument.body.style.display="none";
    iframeDocument.addEventListener('click', e => {
        chrome.runtime.sendMessage('clicked');
    });
}