const puppeteer = require('puppeteer');

class FlowTestAutomationTester {
    constructor() {
        this.browser = null;
        this.page = null;
        this.baseUrl = 'http://localhost';
    }

    async init() {
        console.log('🚀 Запуск браузера...');
        this.browser = await puppeteer.launch({
            headless: false,
            devtools: false,
            defaultViewport: null,
            args: ['--start-maximized']
        });
        
        this.page = await this.browser.newPage();
        
        // Включаем логирование консоли
        this.page.on('console', msg => {
            console.log(`[Browser Console] ${msg.type()}: ${msg.text()}`);
        });
        
        // Обработка ошибок
        this.page.on('pageerror', error => {
            console.error(`[Page Error] ${error.message}`);
        });
    }

    async login(username = 'admin', password = 'admin123') {
        console.log('🔐 Выполняем вход в систему...');
        
        await this.page.goto(`${this.baseUrl}/login.html`);
        await this.page.waitForSelector('#email', { timeout: 10000 });
        
        // Заполняем форму входа
        await this.page.type('#email', username);
        await this.page.type('#password', password);
        
        // Нажимаем кнопку входа
        await this.page.click('button[type="submit"]');
        
        // Ждем перенаправления на главную страницу
        await this.page.waitForNavigation({ waitUntil: 'networkidle0' });
        
        console.log('✅ Успешно вошли в систему');
    }

    async navigateToTestCases() {
        console.log('📁 Переходим на страницу тест-кейсов...');
        
        await this.page.goto(`${this.baseUrl}/test-cases.html`);
        await this.page.waitForSelector('#projectSelector', { timeout: 10000 });
        
        console.log('✅ Страница тест-кейсов загружена');
    }

    async selectOrCreateProject() {
        console.log('📊 Выбираем или создаем проект...');
        
        // Ждем загрузки проектов
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const projectSelector = await this.page.$('#projectSelector');
        const options = await this.page.$$eval('#projectSelector option', options => 
            options.map(option => ({ value: option.value, text: option.textContent }))
        );
        
        console.log('Доступные проекты:', options);
        
        // Если есть проекты, выбираем первый доступный
        if (options.length > 1) {
            const firstProject = options.find(opt => opt.value !== '');
            if (firstProject) {
                await this.page.select('#projectSelector', firstProject.value);
                console.log(`✅ Выбран проект: ${firstProject.text}`);
                
                // Ждем загрузки структуры проекта
                await new Promise(resolve => setTimeout(resolve, 3000));
                return firstProject.value;
            }
        }
        
        // Если проектов нет, создаем новый
        console.log('📝 Создаем новый проект...');
        await this.page.click('#addProjectBtn');
        
        // Ждем появления модального окна создания проекта
        await this.page.waitForSelector('.modal', { timeout: 5000 });
        
        const projectName = `Test Project ${Date.now()}`;
        await this.page.type('input[name="name"]', projectName);
        await this.page.type('textarea[name="description"]', 'Проект для тестирования автоматизации');
        
        // Сохраняем проект
        await this.page.click('button[type="submit"]');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        console.log(`✅ Создан новый проект: ${projectName}`);
        return null;
    }

    async createTestCase() {
        console.log('📝 Создаем новый тест-кейс...');
        
        // Кликаем правой кнопкой мыши по области контента для вызова контекстного меню
        const contentArea = await this.page.$('#content-area');
        if (contentArea) {
            await contentArea.click({ button: 'right' });
        } else {
            // Если нет области контента, кликаем по empty state
            await this.page.click('#empty-state', { button: 'right' });
        }
        
        // Ждем появления контекстного меню
        await this.page.waitForSelector('#context-menu:not(.hidden)', { timeout: 5000 });
        
        // Кликаем "Новый тест-кейс"
        await this.page.click('[data-i18n="newTestCase"], button:contains("Новый тест-кейс")');
        
        // Ждем открытия формы создания тест-кейса
        await this.page.waitForSelector('#test-case-form-view:not(.hidden)', { timeout: 5000 });
        
        console.log('✅ Форма создания тест-кейса открыта');
        
        // Заполняем форму тест-кейса
        const testCaseName = `Automated Login Test ${Date.now()}`;
        await this.page.type('#tc-title', testCaseName);
        await this.page.type('#tc-description', 'Автоматизированный тест для проверки функциональности входа в систему');
        await this.page.type('#tc-preconditions', 'Система доступна, пользователь не авторизован');
        
        // Устанавливаем тип тестирования как "Автоматизированный"
        await this.page.select('#tc-type', 'automated');
        
        // Ждем появления секции автоматизации
        await this.page.waitForSelector('#automation-section:not(.hidden)', { timeout: 3000 });
        
        // Указываем название автотеста
        await this.page.type('#tc-automation-name', 'test_login_valid_credentials');
        
        // Сохраняем тест-кейс
        await this.page.click('button[onclick="saveTestCase()"]');
        
        // Ждем сохранения и возврата к списку
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        console.log(`✅ Тест-кейс создан: ${testCaseName}`);
        return testCaseName;
    }

    async runAutomatedTest() {
        console.log('🤖 Запускаем автоматизированный тест...');
        
        // Ищем кнопку запуска автотеста
        let runButton = null;
        try {
            // Попробуем найти кнопку с иконкой play
            runButton = await this.page.$('button .ri-play-line');
            if (runButton) {
                runButton = await runButton.evaluateHandle(el => el.closest('button'));
            }
            
            if (!runButton) {
                // Альтернативный поиск по тексту
                const buttons = await this.page.$$('button');
                for (const button of buttons) {
                    const text = await this.page.evaluate(el => el.textContent, button);
                    if (text.includes('Run Test') || text.includes('Run') || text.includes('Запустить')) {
                        runButton = button;
                        break;
                    }
                }
            }
            
            if (runButton) {
                await runButton.click();
                console.log('✅ Автотест запущен');
                
                // Ждем завершения выполнения теста (максимум 30 секунд)
                await new Promise(resolve => setTimeout(resolve, 5000));
                
                // Проверяем статус выполнения
                const statusBadge = await this.page.$('.test-status-badge');
                if (statusBadge) {
                    const status = await this.page.evaluate(el => el.textContent, statusBadge);
                    console.log(`📊 Статус автотеста: ${status}`);
                    return status;
                }
            } else {
                console.log('⚠️ Кнопка запуска автотеста не найдена');
            }
        } catch (error) {
            console.log('⚠️ Ошибка при поиске кнопки запуска:', error.message);
        }
        
        return null;
    }

    async verifyTestExecution() {
        console.log('🔍 Проверяем результаты выполнения...');
        
        // Проверяем наличие уведомлений о выполнении теста
        const notifications = await this.page.$$('.toast');
        if (notifications.length > 0) {
            for (const notification of notifications) {
                const text = await this.page.evaluate(el => el.textContent, notification);
                console.log(`📢 Уведомление: ${text}`);
            }
        }
        
        // Проверяем статус в карточке тест-кейса
        const testCards = await this.page.$$('.test-case-card');
        for (const card of testCards) {
            const title = await card.$eval('h3', el => el.textContent);
            const statusBadge = await card.$('.test-status-badge');
            
            if (statusBadge) {
                const status = await this.page.evaluate(el => el.textContent, statusBadge);
                console.log(`📋 Тест-кейс: ${title} - Статус: ${status}`);
            }
        }
        
        console.log('✅ Проверка результатов завершена');
    }

    async takeScreenshot(filename) {
        await this.page.screenshot({ 
            path: filename, 
            fullPage: true 
        });
        console.log(`📸 Скриншот сохранен: ${filename}`);
    }

    async cleanup() {
        if (this.browser) {
            await this.browser.close();
            console.log('🔚 Браузер закрыт');
        }
    }

    async runFullTest() {
        try {
            await this.init();
            
            // Делаем скриншот начального состояния
            await this.takeScreenshot('test_start.png');
            
            await this.login();
            await this.navigateToTestCases();
            
            // Скриншот страницы тест-кейсов
            await this.takeScreenshot('test_cases_page.png');
            
            const projectId = await this.selectOrCreateProject();
            const testCaseName = await this.createTestCase();
            
            // Скриншот после создания тест-кейса
            await this.takeScreenshot('test_case_created.png');
            
            const testStatus = await this.runAutomatedTest();
            
            // Ждем немного для завершения асинхронных операций
            await new Promise(resolve => setTimeout(resolve, 5000));
            
            await this.verifyTestExecution();
            
            // Финальный скриншот
            await this.takeScreenshot('test_completed.png');
            
            console.log('🎉 Тест интеграции автоматизации завершен успешно!');
            
        } catch (error) {
            console.error('❌ Ошибка во время выполнения теста:', error);
            
            // Скриншот при ошибке
            await this.takeScreenshot('test_error.png');
            
            throw error;
        } finally {
            await this.cleanup();
        }
    }
}

// Запуск теста
async function main() {
    console.log('🧪 Начинаем тест интеграции автоматизации FlowTest 2.0');
    
    const tester = new FlowTestAutomationTester();
    await tester.runFullTest();
}

// Запуск только если скрипт вызван напрямую
if (require.main === module) {
    main().catch(console.error);
}

module.exports = FlowTestAutomationTester;