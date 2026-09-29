const { JSDOM } = require('jsdom');
const fs = require('fs');

const html = fs.readFileSync('frontend/index.html', 'utf8');

const options = {
  runScripts: "dangerously",
  resources: "usable",
  url: "http://localhost:3000"
};

const dom = new JSDOM(html, options);

dom.window.console = {
  log: (...args) => console.log(...args),
  error: (...args) => console.error(...args),
  warn: (...args) => console.warn(...args)
};

dom.window.addEventListener('error', (event) => {
  console.error("Window Error:", event.error);
});

setTimeout(() => {
  console.log("Done waiting");
  process.exit(0);
}, 2000);
