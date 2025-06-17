const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    try {
        console.log('Navigating to login page...');
        await page.goto('http://localhost/login.html');
        await page.waitForSelector('#username', { timeout: 5000 });
        
        // Login
        console.log('Logging in...');
        await page.type('#username', 'admin');
        await page.type('#password', 'admin123');
        await page.click('button[type="submit"]');
        
        // Wait for navigation to dashboard
        await page.waitForNavigation();
        await page.waitForTimeout(2000);
        
        // Navigate to test cases page
        console.log('Navigating to test cases page...');
        await page.goto('http://localhost/test-cases.html');
        await page.waitForTimeout(2000);
        
        // Wait for project selector
        await page.waitForSelector('#projectSelector', { timeout: 5000 });
        
        // Select "Test Automation Project"
        console.log('Selecting Test Automation Project...');
        await page.select('#projectSelector', '3'); // Assuming ID is 3
        await page.waitForTimeout(2000);
        
        // Look for test case cards
        console.log('Looking for test case cards...');
        const testCards = await page.$$('.test-case-card');
        console.log(`Found ${testCards.length} test case cards`);
        
        // Look for History buttons
        console.log('Looking for History buttons...');
        const historyButtons = await page.$$('button:has-text("History")');
        console.log(`Found ${historyButtons.length} buttons with text "History"`);
        
        // Alternative search methods
        const historyButtonsByClass = await page.$$('.ri-history-line');
        console.log(`Found ${historyButtonsByClass.length} elements with history icon class`);
        
        // Search for buttons containing history text
        const buttonsWithHistory = await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button'));
            return buttons.filter(btn => btn.textContent.includes('History')).map(btn => ({
                text: btn.textContent.trim(),
                classList: Array.from(btn.classList),
                onclick: btn.getAttribute('onclick'),
                parent: btn.parentElement?.className
            }));
        });
        console.log('Buttons containing "History":', buttonsWithHistory);
        
        // Check if any test cards are automated
        const automatedTests = await page.evaluate(() => {
            const cards = Array.from(document.querySelectorAll('.test-case-card'));
            return cards.map(card => {
                const hasAutomatedText = card.textContent.includes('Automated');
                const hasCodeIcon = card.querySelector('.ri-code-s-slash-line') !== null;
                const buttons = Array.from(card.querySelectorAll('button')).map(btn => btn.textContent.trim());
                return {
                    title: card.querySelector('h3')?.textContent || 'Unknown',
                    hasAutomatedText,
                    hasCodeIcon,
                    buttons
                };
            });
        });
        console.log('Test cards analysis:', automatedTests);
        
        // Check the HTML structure of test cards
        if (testCards.length > 0) {
            const firstCardHTML = await testCards[0].evaluate(el => el.innerHTML);
            console.log('First test card HTML:', firstCardHTML);
        }
        
        // Try to find any automated test indicators
        const automatedIndicators = await page.evaluate(() => {
            const indicators = [];
            
            // Look for automated badges/labels
            const automatedLabels = document.querySelectorAll('*:contains("Automated"), *:contains("automated")');
            indicators.push(`Automated labels: ${automatedLabels.length}`);
            
            // Look for code icons
            const codeIcons = document.querySelectorAll('.ri-code-s-slash-line, .ri-robot-line');
            indicators.push(`Code/Robot icons: ${codeIcons.length}`);
            
            // Look for run test buttons
            const runButtons = Array.from(document.querySelectorAll('button')).filter(btn => 
                btn.textContent.includes('Run Test') || btn.textContent.includes('Run')
            );
            indicators.push(`Run Test buttons: ${runButtons.length}`);
            
            return indicators;
        });
        console.log('Automated test indicators:', automatedIndicators);
        
        // Take a screenshot for visual inspection
        await page.screenshot({ path: 'test_cases_page_debug.png', fullPage: true });
        console.log('Screenshot saved as test_cases_page_debug.png');
        
        // Check localStorage for any test data
        const testData = await page.evaluate(() => {
            const data = {};
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key.includes('test') || key.includes('project')) {
                    data[key] = localStorage.getItem(key);
                }
            }
            return data;
        });
        console.log('Test-related localStorage data:', testData);
        
    } catch (error) {
        console.error('Error:', error);
        
        // Take error screenshot
        await page.screenshot({ path: 'error_screenshot.png' });
        console.log('Error screenshot saved');
    }
    
    // Keep browser open for manual inspection
    console.log('\nBrowser will remain open for manual inspection. Press Ctrl+C to close.');
    
})();