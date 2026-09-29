const { JSDOM } = require('jsdom');
const fs = require('fs');
const html = fs.readFileSync('frontend/index.html', 'utf8');
const dom = new JSDOM(html, { runScripts: "dangerously", resources: "usable", url: "http://localhost:3000" });
dom.window.document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM loaded");
});
dom.window.console = console;
