const puppeteer = require('puppeteer'),
	express = require('express'),
	pdf = require('express-pdf'),
	bodyParser = require('body-parser');

const winston = require('winston');
require('winston-daily-rotate-file');

var transport = new winston.transports.DailyRotateFile({
	level: 'info',
	filename: 'application-%DATE%.log',
	datePattern: 'YYYY-MM-DD-HH',
	zippedArchive: true,
	maxSize: '20m',
	maxFiles: '14d',
});

var logger = winston.createLogger({
	transports: [transport],
});

const PORT = Number(process.env.PORT) || 8080;
const app = express();

app.use(pdf);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

/**
 * Handle LazyLoading by scrolling the page down 100px every 100ms
 */
async function autoScroll(page) {
	await page.evaluate(async () => {
		await new Promise((resolve) => {
			var totalHeight = 0;
			var distance = 100;
			var timer = setInterval(() => {
				var scrollHeight = document.body.scrollHeight;
				window.scrollBy(0, distance);
				totalHeight += distance;

				if (totalHeight >= scrollHeight - window.innerHeight) {
					clearInterval(timer);
					resolve();
				}
			}, 100);
		});
	});
}

/**
 * Pass in an HTML string from which to generate a PDF
 */
async function pdfFromHTML(req, res) {
	const html = req.body.html || null;

	if (!html) {
		res.status(400).send('No HTML was provided');
	}

	const browser = await puppeteer.launch({
		headless: true,
	});

	const page = await browser.newPage();
	await page.setContent(html);

	// Handle LazyLoading by scrolling the page down 100ms at a time
	await autoScroll(page);

	// Generate the PDF and return the binary to the calling API method
	const timeout = 60 * 1000;
	const pdf = await page.pdf({
		displayHeaderFooter: false,
		printBackground: true,
		format: 'A4',
		timeout: timeout,
		margin: {
			top: '1.5cm',
			bottom: '1.5cm',
			left: '1.5cm',
			right: '1.5cm',
		},
	});

	await browser.close();
	return pdf;
}

/**
 * Pass in a URL as a GET parameter to create a PDF from that URL
 */
async function pdfFromURL(req, res) {
	const url = req.query.url || null;

	if (!url) {
		res.status(404).send('No URL specified');
	}

	const browser = await puppeteer.launch({
		headless: true,
		ignoreHTTPSErrors: true,
	});

	const page = await browser.newPage();
	let remote_response;

	try {
		remote_response = await page.goto(url, {
			waitUntil: 'networkidle2',
			timeout: 60000,
		});
	} catch (err) {
		// e.g. Connection refused because of invalid SSL certificate
		// (although that is caught within puppeteer.launch)
		await browser.close();
		logger.error(err);
		res.status(500).send(
			'The website could not provide content for the generation of a PDF.'
		);
	}

	// Unexpected response, e.g. 301, 302 etc.
	if (!!remote_response && remote_response.status() > 299) {
		await browser.close();
		res.status(remote_response.status).send(
			`The website returned the status code ${remote_response.status}`
		);
	}

	// Handle LazyLoading by scrolling the page down 100ms at a time
	await autoScroll(page);

	// Generate the PDF and return the binary to the calling API method
	const timeout = 60 * 1000;
	const pdf = await page.pdf({
		displayHeaderFooter: false,
		printBackground: true,
		format: 'A4',
		timeout: timeout,
		margin: {
			top: '1.5cm',
			bottom: '1.5cm',
			left: '1.5cm',
			right: '1.5cm',
		},
	});

	await browser.close();
	return pdf;
}

app.post('/api/from-html-string', function (req, res) {
	console.info('Incoming: api/from-html-string');
	pdfFromHTML(req, res).then((result) => {
		res.writeHead(200, {
			'Content-Type': 'application/pdf',
			'Content-Length': result.length,
		});
		res.end(result, 'binary');
	});
});

/**
 * Pass in a URL and get a PDF of that page
 * AutoScroll should handle all lazyload images
 */
app.get('/api/from-url', function (req, res) {
	console.info('Incoming: api/from-url');
	pdfFromURL(req, res).then((result) => {
		res.writeHead(200, {
			'Content-Type': 'application/pdf',
			'Content-Length': result.length,
		});
		res.end(result, 'binary');
	});
});

/**
 * 404 not found
 * This must be the last route definition
 * so that it handles every request
 * which is not defined above
 */
app.get('*', function (req, res) {
	console.info('Incoming: other request');
	res.status(404).send("These are not the droids you're looking for.");
});

/**
 * Go! Start listening for requests
 */
app.listen(PORT, () => console.log(`pdf-machine listening to ${PORT}!`));
