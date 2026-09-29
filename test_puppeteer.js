const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  page.on('requestfailed', request => console.log('REQUEST FAILED:', request.url(), request.failure().errorText));
  
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
  const bodyHTML = await page.evaluate(() => document.body.innerHTML);
  const hiddenCount = await page.evaluate(() => document.querySelectorAll('[hidden]').length);
  const dashboardVisible = await page.evaluate(() => {
     const el = document.getElementById('view-dashboard');
     return el ? !el.hidden && getComputedStyle(el).display !== 'none' : false;
  });
  console.log('Dashboard visible:', dashboardVisible);
  console.log('Hidden elements:', hiddenCount);
  await browser.close();
})();
