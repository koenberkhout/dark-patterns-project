# Cookie Dialog Compliance (formerly Dark Patterns Project)

## Chrome extension
- In `chrome-extension/js/conf.example.js`, set the constant **API_URL** to the URL of your own backend and rename the file to `conf.js`.
- To install the extension, open Chrome and navigate to `chrome://extensions/`. Switch on *Developer mode* in the upper right corner. Click on the button *Load unpacked* in the toolbar that appears, and point to the `chrome-extension` directory.

## Backend
- Set the correct environment variables in `backend/application/example.env` and rename the file to `.env`.
- Put the contents of the `public_html` directory in the public root of your host (this may be called *public_html*, *www*, or something similar).
- Put the `application` directory on the same level as the `public_html` directory.
- Make sure the full path of the `application` directory is listed in PHP's include path. Usually this looks something like `/home/username/domains/example.com/application`.
- Install the dependencies using Composer by running `composer update` (using composer.json) or `composer install` (using composer.json locked to the versions in composer.lock).

## Domaintool
See https://github.com/koenberkhout/dark-patterns-project/tree/main/domaintool.
