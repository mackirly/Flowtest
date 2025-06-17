const puppeteer = require('puppeteer');
const path = require('path');
const assert = require('assert');

describe('Avatar Upload Test', () => {
    let browser;
    let page;
    
    before(async () => {
        browser = await puppeteer.launch({
            headless: false,
            args: ['--no-sandbox', '--window-size=1920,1080']
        });
        page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080 });
    });

    after(async () => {
        await browser.close();
    });

    it('should upload and crop avatar successfully', async () => {
        // Login
        await page.goto('http://localhost:3000/login.html');
        await page.waitForSelector('#email');
        await page.type('#email', 'test@example.com');
        await page.type('#password', 'testpassword');
        await page.click('button[type="submit"]');
        
        // Navigate to profile page
        await page.waitForNavigation();
        await page.goto('http://localhost:3000/profile.html');
        
        // Upload avatar
        const avatarInput = await page.waitForSelector('#avatar-upload');
        const testAvatarPath = path.join(__dirname, 'images', 'test-avatar.png');
        await avatarInput.uploadFile(testAvatarPath);
        
        // Wait for crop modal
        await page.waitForSelector('#avatar-crop-modal:not(.hidden)', { timeout: 5000 });
        
        // Verify crop modal is visible
        const modalVisible = await page.evaluate(() => {
            const modal = document.querySelector('#avatar-crop-modal');
            return window.getComputedStyle(modal).display !== 'none';
        });
        assert.strictEqual(modalVisible, true, 'Crop modal should be visible');
        
        // Wait for cropper to initialize
        await page.waitForSelector('.cropper-container');
        
        // Test cropper interaction
        await page.mouse.move(300, 300);
        await page.mouse.down();
        await page.mouse.move(350, 350);
        await page.mouse.up();
        
        // Save cropped avatar
        await page.click('#save-avatar-crop-button');
        
        // Wait for avatar to update
        await page.waitForFunction(() => {
            const avatarImg = document.querySelector('#user-avatar-image');
            return !avatarImg.classList.contains('hidden') && avatarImg.src !== '';
        }, { timeout: 30000 });
        
        // Verify avatar was updated
        const avatarVisible = await page.evaluate(() => {
            const avatarText = document.querySelector('#user-avatar-text');
            const avatarImage = document.querySelector('#user-avatar-image');
            return avatarText.classList.contains('hidden') && 
                   !avatarImage.classList.contains('hidden') &&
                   avatarImage.src.includes('avatar');
        });
        assert.strictEqual(avatarVisible, true, 'Avatar image should be visible');
    }).timeout(30000);
});