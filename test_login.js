const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: {width: 1280, height: 720}
  });
  
  try {
    const page = await browser.newPage();
    
    // Go to login page
    console.log('Navigating to login page...');
    await page.goto('http://localhost/login.html');
    
    // Wait for form elements
    await page.waitForSelector('#email');
    await page.waitForSelector('#password');
    
    // Fill login form
    console.log('Filling login form...');
    await page.type('#email', 'admin');
    await page.type('#password', 'admin');
    
    // Take screenshot before submit
    await page.screenshot({path: 'login-page.png'});
    
    // Submit form
    console.log('Submitting form...');
    await page.click('button[type="submit"]');
    
    // Wait for redirect
    console.log('Waiting for redirect...');
    await page.waitForNavigation({
      waitUntil: 'networkidle0',
      timeout: 5000
    });
    
    // Take screenshot after redirect
    await page.screenshot({path: 'login-result.png'});
    
    // Get final URL
    const finalUrl = page.url();
    console.log('Final URL:', finalUrl);
    
    // Check if we're on the dashboard
    if (finalUrl.includes('index.html')) {
      console.log('✅ Login successful - redirected to dashboard');
    } else {
      console.log('❌ Login failed - not on dashboard');
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await browser.close();
  }
})();