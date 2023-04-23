# PDF Machine

A simple PDF generator by [Say Hello](https://sayhello.ch/) to allow PDF generation from HTML content.

This Node app supports generation from an HTML string or a URL and uses Puppeteer to launch a headless browser instance to render the HTML and generate a PDF. 

Any CSS supported by the headless (Chrome) browser will be correctly rendered in the PDF. External media (e.g. fonts or images) will also be embedded directly in the PDF.

## Endpoints

* */api/from-html-string* (POST). Pass in a complete HTML page as a string.
* */api/from-url* (GET). Pass in a valid URL using the `url` GET parameter.
* */api/vasili* (GET). Simple endpoint which outputs a plain text string. Allows e.g. monitoring that the app is responding.

## Author

Mark Howells-Mead, mark@sayhello.ch, since June 2022.
