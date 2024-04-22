const puppeteer = require('puppeteer'),
	express = require('express'),
	bodyParser = require('body-parser');

const winston = require('winston');
require('winston-daily-rotate-file');

class HttpError extends Error {
	constructor(message, statusCode) {
		super(message);
		this.statusCode = statusCode;
	}
}

var transport_info = new winston.transports.DailyRotateFile({
	level: 'info',
	filename: 'application-%DATE%.log',
	datePattern: 'YYYY-MM-DD-HH',
	zippedArchive: true,
	maxSize: '20m',
	maxFiles: '14d',
});

var transport_error = new winston.transports.DailyRotateFile({
	level: 'info',
	filename: 'application-%DATE%.log',
	datePattern: 'YYYY-MM-DD-HH',
	zippedArchive: true,
	maxSize: '20m',
	maxFiles: '14d',
});

var logger = winston.createLogger({
	transports: [transport_info, transport_error],
});

// Send error message back to client
const error_handler = (error, res) => {
	logger.error(error.message);
	res.status(error.statusCode).send(error.message);
	res.end();
};

const PORT = Number(process.env.PORT) || 8080;
const app = express();

app.use(pdf);
app.use(bodyParser.json({ limit: '1000mb' }));
app.use(bodyParser.urlencoded({ limit: '1000mb', extended: true }));

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
	if (!req.body.html?.length) {
		throw new HttpError('No HTML was provided', 400);
	}

	const html = req.body.html || null,
		marginTop = req.body.margin.top || 0,
		marginRight = req.body.margin.right || 0,
		marginBottom = req.body.margin.bottom || 0,
		marginLeft = req.body.margin.left || 0,
		pageFormat = req.body.format || 'A4',
		scale = req.body.scale || 1,
		headerHTML = req.body.headerHTML || '<div></div>',
		footerHTML = req.body.footerHTML || '<div></div>',
		displayHeaderFooter = true;

	if (!html) {
		throw new HttpError('No HTML was provided', 400);
	}

	const browser = await puppeteer.launch({
		headless: true,
		args: ['--use-gl=egl', '--no-sandbox', '--disable-features=AsyncDNS'],
		ignoreHTTPSErrors: true,
	});

	const page = await browser.newPage();
	await page.setContent(html);

	// Handle LazyLoading by scrolling the page down 100ms at a time
	await autoScroll(page);

	// Generate the PDF and return the binary to the calling API method
	const timeout = 180 * 1000;
	const pdf = await page.pdf({
		displayHeaderFooter: displayHeaderFooter,
		printBackground: true,
		format: pageFormat,
		scale: scale,
		timeout: timeout,
		headerTemplate: headerHTML,
		footerTemplate: footerHTML,
		margin: {
			top: marginTop,
			bottom: marginBottom,
			left: marginLeft,
			right: marginRight,
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
		throw new HttpError('No URL specified', 404);
	}

	const browser = await puppeteer.launch({
		headless: true,
		args: ['--use-gl=egl', '--no-sandbox'],
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

app.get('/api/from-html-string', function (req, res) {
	error_handler(
		{ message: 'Invalid HTTP request mode', statusCode: 500 },
		res
	);
});

app.post('/api/from-html-string', function (req, res) {
	pdfFromHTML(req, res)
		.then((result) => {
			res.writeHead(200, {
				'Content-Type': 'application/pdf',
				'Content-Length': result.length,
			});
			res.end(result, 'binary');
		})
		.catch((error) => {
			error_handler(error, res);
		});
});

/**
 * Pass in a URL and get a PDF of that page
 * AutoScroll should handle all lazyload images
 */
app.get('/api/from-url', function (req, res) {
	pdfFromURL(req, res)
		.then((result) => {
			res.writeHead(200, {
				'Content-Type': 'application/pdf',
				'Content-Length': result.length,
			});
			res.end(result, 'binary');
		})
		.catch((error) => {
			error_handler(error, res);
		});
});

/**
 * Add an endpoint to show current version
 * which check that the server is up.
 */
app.get('/api/version', function (req, res) {
	const packageJson = require('../package.json');
	const { author, name, description, version } = packageJson;

	const responseData = { name, description, author, version };

	res.setHeader('Content-Type', 'application/json');
	res.status(200).send(JSON.stringify(responseData));
});

/**
 * Add an endpoint for ping services
 * which check that the server is up.
 */
app.get('/api/vasili', function (req, res) {
	res.status(200).send('Give Me a Ping, Vasili. One Ping Only.');
});

/**
 * 404 not found
 * This must be the last route definition
 * so that it handles every request
 * which is not defined above
 */
app.get('*', function (req, res) {
	res.status(404).send("These are not the droids you're looking for.");
});

/**
 * Go! Start listening for requests
 */
app.listen(PORT, () => console.log(`pdf-machine listening to ${PORT}!`));
