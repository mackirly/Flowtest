/**
 * Comprehensive test script for all FlowTest 2.0 pages
 * Run this with: node test-all-pages.js
 */

const puppeteer = require('puppeteer');

const BASE_URL = 'http://localhost';
const CREDENTIALS = {
    username: 'admin',
    password: 'admin123'
};

// Pages to test (protected)
const PROTECTED_PAGES = [
    { url: '/', name: 'Dashboard' },
    { url: '/test-cases.html', name: 'Test Cases' },
    { url: '/profile.html', name: 'Profile' },
    { url: '/settings.html', name: 'Settings' },
    { url: '/reports.html', name: 'Reports' },
    { url: '/events.html', name: 'Events' }
];

// Public pages
const PUBLIC_PAGES = [
    { url: '/login.html', name: 'Login' },
    { url: '/register.html', name: 'Register' },
    { url: '/forgot-password.html', name: 'Forgot Password' },
    { url: '/reset-password.html', name: 'Reset Password' }
];

async function testAllPages() {
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    const errors = [];
    
    // Set up console error logging
    page.on('console', msg => {
        if (msg.type() === 'error') {
            errors.push({
                url: page.url(),
                message: msg.text(),
                location: msg.location()
            });
        }
    });
    
    page.on('pageerror', error => {
        errors.push({
            url: page.url(),
            message: error.message,
            stack: error.stack
        });
    });
    
    console.log('🧪 Starting comprehensive page testing...\n');
    
    // Test 1: Check redirect to login for unauthenticated access
    console.log('📌 Test 1: Checking auth redirects...');
    for (const pageInfo of PROTECTED_PAGES) {
        try {
            await page.goto(BASE_URL + pageInfo.url, { waitUntil: 'networkidle2' });
            const currentUrl = page.url();
            
            if (currentUrl.includes('login.html')) {
                console.log(`✅ ${pageInfo.name}: Correctly redirected to login`);
            } else {
                console.log(`❌ ${pageInfo.name}: Failed to redirect (current: ${currentUrl})`);
                errors.push({
                    page: pageInfo.name,
                    error: 'No redirect to login for unauthenticated access'
                });
            }
        } catch (error) {
            console.log(`❌ ${pageInfo.name}: Error - ${error.message}`);
            errors.push({
                page: pageInfo.name,
                error: error.message
            });
        }
    }
    
    // Test 2: Login process
    console.log('\n📌 Test 2: Testing login process...');
    try {
        await page.goto(BASE_URL + '/login.html', { waitUntil: 'networkidle2' });
        
        // Wait for form elements
        await page.waitForSelector('#email', { timeout: 5000 });
        await page.waitForSelector('#password', { timeout: 5000 });
        
        // Fill in credentials
        await page.type('#email', CREDENTIALS.username);
        await page.type('#password', CREDENTIALS.password);
        
        // Submit form
        await page.click('button[type="submit"]');
        
        // Wait for navigation
        await page.waitForNavigation({ waitUntil: 'networkidle2' });
        
        const afterLoginUrl = page.url();
        if (!afterLoginUrl.includes('login.html')) {
            console.log('✅ Login successful, redirected to:', afterLoginUrl);
        } else {
            console.log('❌ Login failed, still on login page');
            errors.push({
                page: 'Login',
                error: 'Login failed'
            });
        }
    } catch (error) {
        console.log(`❌ Login test failed: ${error.message}`);
        errors.push({
            page: 'Login',
            error: error.message
        });
    }
    
    // Test 3: Test all protected pages after login
    console.log('\n📌 Test 3: Testing protected pages after login...');
    for (const pageInfo of PROTECTED_PAGES) {
        try {
            console.log(`\n🔍 Testing ${pageInfo.name}...`);
            
            await page.goto(BASE_URL + pageInfo.url, { waitUntil: 'networkidle2' });
            
            // Check if we're still on the correct page
            const currentUrl = page.url();
            if (currentUrl.includes('login.html')) {
                console.log(`❌ ${pageInfo.name}: Redirected to login (auth failed)`);
                errors.push({
                    page: pageInfo.name,
                    error: 'Redirected to login after authentication'
                });
                continue;
            }
            
            // Check for common elements
            const hasHeader = await page.$('header') !== null;
            const hasNavigation = await page.$('nav') !== null;
            
            console.log(`  Header present: ${hasHeader ? '✅' : '❌'}`);
            console.log(`  Navigation present: ${hasNavigation ? '✅' : '❌'}`);
            
            // Page-specific checks
            switch (pageInfo.url) {
                case '/':
                    // Dashboard specific checks
                    const hasStats = await page.$('.grid-cols-1.md\\:grid-cols-4') !== null;
                    console.log(`  Statistics grid: ${hasStats ? '✅' : '❌'}`);
                    break;
                    
                case '/profile.html':
                    // Profile specific checks
                    const hasProfileForm = await page.$('#profile-form') !== null;
                    const hasAvatar = await page.$('.avatar-container') !== null;
                    console.log(`  Profile form: ${hasProfileForm ? '✅' : '❌'}`);
                    console.log(`  Avatar section: ${hasAvatar ? '✅' : '❌'}`);
                    break;
                    
                case '/test-cases.html':
                    // Test cases specific checks
                    const hasTestCasesList = await page.$('#test-cases-list') !== null;
                    console.log(`  Test cases list: ${hasTestCasesList ? '✅' : '❌'}`);
                    break;
                    
                case '/settings.html':
                    // Settings specific checks
                    const hasSettingsNav = await page.$('.settings-nav') !== null;
                    console.log(`  Settings navigation: ${hasSettingsNav ? '✅' : '❌'}`);
                    break;
            }
            
            // Check for JavaScript errors on the page
            const pageErrors = errors.filter(e => e.url && e.url.includes(pageInfo.url));
            if (pageErrors.length > 0) {
                console.log(`  ⚠️  JavaScript errors found: ${pageErrors.length}`);
                pageErrors.forEach(err => {
                    console.log(`     - ${err.message}`);
                });
            }
            
        } catch (error) {
            console.log(`❌ ${pageInfo.name}: Test failed - ${error.message}`);
            errors.push({
                page: pageInfo.name,
                error: error.message
            });
        }
    }
    
    // Test 4: Test logout functionality
    console.log('\n📌 Test 4: Testing logout...');
    try {
        // Find and click logout button
        const logoutButton = await page.$('a[href="#"][onclick*="logout"]');
        if (logoutButton) {
            await logoutButton.click();
            await page.waitForNavigation({ waitUntil: 'networkidle2' });
            
            const afterLogoutUrl = page.url();
            if (afterLogoutUrl.includes('login.html')) {
                console.log('✅ Logout successful, redirected to login');
            } else {
                console.log('❌ Logout failed, not redirected to login');
                errors.push({
                    page: 'Logout',
                    error: 'Not redirected to login after logout'
                });
            }
        } else {
            console.log('❌ Logout button not found');
            errors.push({
                page: 'Logout',
                error: 'Logout button not found'
            });
        }
    } catch (error) {
        console.log(`❌ Logout test failed: ${error.message}`);
        errors.push({
            page: 'Logout',
            error: error.message
        });
    }
    
    // Test 5: Test public pages
    console.log('\n📌 Test 5: Testing public pages...');
    for (const pageInfo of PUBLIC_PAGES) {
        try {
            await page.goto(BASE_URL + pageInfo.url, { waitUntil: 'networkidle2' });
            const currentUrl = page.url();
            
            if (currentUrl.includes(pageInfo.url)) {
                console.log(`✅ ${pageInfo.name}: Accessible without auth`);
            } else {
                console.log(`❌ ${pageInfo.name}: Unexpected redirect`);
                errors.push({
                    page: pageInfo.name,
                    error: 'Unexpected redirect'
                });
            }
        } catch (error) {
            console.log(`❌ ${pageInfo.name}: Error - ${error.message}`);
            errors.push({
                page: pageInfo.name,
                error: error.message
            });
        }
    }
    
    await browser.close();
    
    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(50));
    
    if (errors.length === 0) {
        console.log('✅ All tests passed!');
    } else {
        console.log(`❌ Found ${errors.length} errors:\n`);
        errors.forEach((error, index) => {
            console.log(`${index + 1}. ${error.page || error.url}: ${error.error || error.message}`);
            if (error.stack) {
                console.log(`   Stack: ${error.stack.split('\n')[0]}`);
            }
        });
    }
    
    process.exit(errors.length > 0 ? 1 : 0);
}

// Run tests
testAllPages().catch(console.error);