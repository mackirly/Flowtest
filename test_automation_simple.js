const puppeteer = require('puppeteer');

class SimpleAutomationTest {
    constructor() {
        this.browser = null;
        this.page = null;
        this.baseUrl = 'http://localhost';
        this.token = null;
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
            console.log(`[Browser] ${msg.type()}: ${msg.text()}`);
        });
        
        // Обработка ошибок
        this.page.on('pageerror', error => {
            console.error(`[Page Error] ${error.message}`);
        });
    }

    async getAuthToken() {
        console.log('🔐 Получаем токен авторизации...');
        
        const response = await fetch(`${this.baseUrl}/api/core/token/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                username: 'admin',
                password: 'admin123'
            })
        });

        if (!response.ok) {
            throw new Error(`Ошибка авторизации: ${response.status}`);
        }

        const data = await response.json();
        this.token = data.access;
        console.log('✅ Токен получен');
        return this.token;
    }

    async getOrCreateProject() {
        console.log('📊 Получаем список проектов...');
        
        const response = await fetch(`${this.baseUrl}/api/projects/`, {
            headers: {
                'Authorization': `Bearer ${this.token}`,
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            throw new Error(`Ошибка получения проектов: ${response.status}`);
        }

        const data = await response.json();
        console.log(`📋 Найдено проектов: ${data.results.length}`);
        
        if (data.results.length > 0) {
            const project = data.results[0];
            console.log(`✅ Используем проект: ${project.name} (ID: ${project.id})`);
            return project.id;
        }

        // Создаем новый проект, если нет существующих
        console.log('📝 Создаем новый проект...');
        const createResponse = await fetch(`${this.baseUrl}/api/projects/`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name: `Test Project ${Date.now()}`,
                description: 'Проект для тестирования автоматизации'
            })
        });

        if (!createResponse.ok) {
            throw new Error(`Ошибка создания проекта: ${createResponse.status}`);
        }

        const newProject = await createResponse.json();
        console.log(`✅ Создан проект: ${newProject.name} (ID: ${newProject.id})`);
        return newProject.id;
    }

    async createAutomatedTestCase(projectId) {
        console.log('🧪 Создаем автоматизированный тест-кейс...');
        
        const testCaseData = {
            title: `Automated Login Test ${Date.now()}`,
            description: 'Автоматизированный тест для проверки функциональности входа в систему',
            preconditions: 'Система доступна, пользователь не авторизован',
            steps: JSON.stringify([
                {
                    action: 'Открыть страницу входа',
                    expected_result: 'Отображается форма входа'
                },
                {
                    action: 'Ввести корректные данные пользователя',
                    expected_result: 'Данные введены в поля формы'
                },
                {
                    action: 'Нажать кнопку "Войти"',
                    expected_result: 'Пользователь успешно авторизован и перенаправлен на главную страницу'
                }
            ]),
            expected_result: 'Пользователь успешно авторизован в системе',
            priority: 'high',
            test_type: 'automated',
            automation_test_name: 'test_login_valid_credentials',
            platform: 'web',
            project: projectId
        };

        const response = await fetch(`${this.baseUrl}/api/testcases/`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(testCaseData)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Ошибка создания тест-кейса: ${response.status} - ${errorText}`);
        }

        const testCase = await response.json();
        console.log(`✅ Тест-кейс создан: ${testCase.title} (ID: ${testCase.id})`);
        console.log(`🤖 Привязанный автотест: ${testCase.automation_test_name}`);
        return testCase;
    }

    async runAutomatedTest(testCaseId) {
        console.log('🚀 Запускаем автоматизированный тест...');
        
        const response = await fetch(`${this.baseUrl}/api/testcases/${testCaseId}/run/`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.token}`,
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`❌ Ошибка запуска теста: ${response.status} - ${errorText}`);
            return null;
        }

        const result = await response.json();
        console.log('✅ Автотест запущен:', result);
        return result;
    }

    async checkTestStatus(testCaseId) {
        console.log('🔍 Проверяем статус выполнения...');
        
        const response = await fetch(`${this.baseUrl}/api/testcases/${testCaseId}/`, {
            headers: {
                'Authorization': `Bearer ${this.token}`,
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            throw new Error(`Ошибка получения статуса: ${response.status}`);
        }

        const testCase = await response.json();
        console.log(`📊 Статус тест-кейса: ${testCase.status || 'pending'}`);
        console.log(`📅 Последнее выполнение: ${testCase.last_run || 'никогда'}`);
        return testCase;
    }

    async runActualAutomationTest() {
        console.log('🧪 Выполняем реальный автотест с Puppeteer...');
        
        try {
            // Перейдем на страницу входа
            await this.page.goto(`${this.baseUrl}/login.html`);
            await this.page.waitForSelector('#email', { timeout: 10000 });
            
            console.log('✅ Страница входа загружена');
            
            // Заполняем данные для входа
            await this.page.type('#email', 'admin');
            await this.page.type('#password', 'admin123');
            
            console.log('✅ Данные для входа введены');
            
            // Нажимаем кнопку входа
            await this.page.click('button[type="submit"]');
            
            // Ждем перенаправления
            await this.page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 15000 });
            
            // Проверяем, что мы попали на главную страницу
            const currentUrl = this.page.url();
            if (currentUrl.includes('index.html') || currentUrl.endsWith('/')) {
                console.log('✅ Автотест прошел успешно - пользователь авторизован');
                return 'passed';
            } else {
                console.log('❌ Автотест не прошел - перенаправление не произошло');
                return 'failed';
            }
            
        } catch (error) {
            console.error('❌ Ошибка во время выполнения автотеста:', error.message);
            return 'failed';
        }
    }

    async updateTestCaseStatus(testCaseId, status, message = '') {
        console.log(`📝 Обновляем статус тест-кейса на: ${status}`);
        
        const updateData = {
            status: status,
            last_run: new Date().toISOString()
        };
        
        if (message) {
            updateData.execution_notes = message;
        }

        const response = await fetch(`${this.baseUrl}/api/testcases/${testCaseId}/`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${this.token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(updateData)
        });

        if (!response.ok) {
            console.error(`❌ Ошибка обновления статуса: ${response.status}`);
            return false;
        }

        console.log('✅ Статус тест-кейса обновлен');
        return true;
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
            await this.takeScreenshot('automation_test_start.png');
            
            // Получаем токен авторизации
            await this.getAuthToken();
            
            // Получаем или создаем проект
            const projectId = await this.getOrCreateProject();
            
            // Создаем автоматизированный тест-кейс
            const testCase = await this.createAutomatedTestCase(projectId);
            
            // Запускаем тест через API (если endpoint существует)
            const runResult = await this.runAutomatedTest(testCase.id);
            
            // Выполняем реальный автотест с Puppeteer
            const testResult = await this.runActualAutomationTest();
            await this.takeScreenshot('automation_test_login.png');
            
            // Обновляем статус тест-кейса
            const message = `Автотест выполнен ${testResult === 'passed' ? 'успешно' : 'с ошибкой'} в ${new Date().toLocaleString()}`;
            await this.updateTestCaseStatus(testCase.id, testResult, message);
            
            // Проверяем финальный статус
            await this.checkTestStatus(testCase.id);
            
            await this.takeScreenshot('automation_test_completed.png');
            
            console.log('🎉 Тест интеграции автоматизации завершен!');
            console.log(`📋 Создан тест-кейс ID: ${testCase.id}`);
            console.log(`🤖 Автотест: ${testCase.automation_test_name}`);
            console.log(`📊 Результат: ${testResult}`);
            
            return {
                testCaseId: testCase.id,
                automationTestName: testCase.automation_test_name,
                result: testResult,
                success: testResult === 'passed'
            };
            
        } catch (error) {
            console.error('❌ Ошибка во время выполнения теста:', error);
            await this.takeScreenshot('automation_test_error.png');
            throw error;
        } finally {
            await this.cleanup();
        }
    }
}

// Запуск теста
async function main() {
    console.log('🧪 Начинаем простой тест интеграции автоматизации FlowTest 2.0');
    
    const tester = new SimpleAutomationTest();
    const result = await tester.runFullTest();
    
    console.log('\n📋 Итоговый результат:');
    console.log('========================');
    console.log(`Тест-кейс ID: ${result.testCaseId}`);
    console.log(`Автотест: ${result.automationTestName}`);
    console.log(`Статус: ${result.success ? '✅ ПРОЙДЕН' : '❌ НЕ ПРОЙДЕН'}`);
    console.log(`Результат: ${result.result}`);
}

// Запуск только если скрипт вызван напрямую
if (require.main === module) {
    main().catch(console.error);
}

module.exports = SimpleAutomationTest;