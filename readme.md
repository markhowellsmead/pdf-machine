# PDF Machine

A simple PDF generator by [Say Hello](https://sayhello.ch/) to allow PDF generation from HTML content.

This Node app supports generation from an HTML string or a URL and uses Puppeteer to launch a headless browser instance to render the HTML and generate a PDF.

Any CSS supported by the headless (Chrome) browser will be correctly rendered in the PDF. External media (e.g. fonts or images) will also be embedded directly in the PDF.

## Endpoints

-   _/api/from-html-string_ (POST). Pass in a complete HTML page as a string.
-   _/api/from-url_ (GET). Pass in a valid URL using the `url` GET parameter.
-   _/api/vasili_ (GET). Simple endpoint which outputs a plain text string. Allows a monitor to check that the app is responding.

## Local development

Running this code in a local development requires Node, NPM and Puppeteer in the versions specified in package.json. Navigate to the project folder and execute `npm run prod` to serve the app.

## Changelog

### 0.3.0 (18.4.2024

-   Update Node version
-   disable AsyncDNS in Puppeteer config
-   Throw appropriate error if no HTML sent to API
-   Update all dependencies

## Author

Mark Howells-Mead, mark@sayhello.ch, since June 2022.
