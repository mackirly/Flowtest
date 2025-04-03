import { fetchWithAuth } from './api-utils.js';
import { I18N_CONFIG } from './i18n-config.js';

class TestExecutionManager {
    constructor() {
        this.testRunId = null;
        this.pollInterval = null;
        this.lastOutput = '';
        this.startTime = null;
        this.activeTests = new Map();
        this.baseUrl = I18N_CONFIG.API_BASE_URL;
        console.log('TestExecutionManager initialized');
    }

    async executeTest(testCaseId) {
        console.log('executeTest called with ID:', testCaseId);
        try {
            const response = await fetch(`${this.baseUrl}/api/execute-test/${testCaseId}/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('access')}`
                }
            });

            if (!response.ok) {
                const errorText = await response.text();
                let errorMessage;
                try {
                    const errorData = JSON.parse(errorText);
                    errorMessage = errorData.error || errorData.detail || `HTTP error! status: ${response.status}`;
                } catch (e) {
                    errorMessage = errorText || `HTTP error! status: ${response.status}`;
                }
                throw new Error(errorMessage);
            }

            const data = await response.json();
            console.log('Test execution started:', data);
            
            if (data.test_run_id) {
                this.testRunId = data.test_run_id;
                this.startTime = new Date();
                this.activeTests.set(data.test_run_id, {
                    testCaseId,
                    startTime: new Date()
                });
                this.startPolling(data.test_run_id);
                this.showExecutionPanel();
            }
            
            return data;
        } catch (error) {
            console.error('Error executing test:', error);
            this.updateStatus({
                status: 'error',
                error_message: error.message
            });
            throw error;
        }
    }

    async executeAllTests(projectId) {
        console.log('executeAllTests called with project ID:', projectId);
        try {
            const response = await fetch(`${this.baseUrl}/api/projects/${projectId}/run-all-tests/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('access')}`
                },
                body: JSON.stringify({})
            });

            console.log('API response:', response);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('API error text:', errorText);
                let errorMessage;
                try {
                    const errorData = JSON.parse(errorText);
                    errorMessage = errorData.error || errorData.detail || `HTTP error! status: ${response.status}`;
                } catch (e) {
                    errorMessage = errorText || `HTTP error! status: ${response.status}`;
                }
                throw new Error(errorMessage);
            }

            const data = await response.json();
            console.log('All tests execution started:', data);

            data.test_runs.forEach(run => {
                console.log('Test run:', run);
                this.activeTests.set(run.test_run_id, {
                    testCaseId: run.test_id,
                    startTime: new Date()
                });
                this.startPolling(run.test_run_id);
            });

            this.showExecutionPanel();
            return data;
        } catch (error) {
            console.error('Error executing all tests:', error);
            this.updateStatus({
                status: 'error',
                error_message: error.message
            });
            throw error;
        }
    }

    showExecutionPanel() {
        console.log('Showing execution panel');
        const panel = document.getElementById('testExecutionPanel');
        if (panel) {
            panel.classList.remove('hidden');
        }
    }

    async startPolling(testRunId) {
        console.log('Starting polling for test run:', testRunId);
        if (!testRunId) {
            console.error('Cannot start polling: no test run ID');
            return;
        }

        console.log('Starting status polling for test run', testRunId);

        const pollTest = async () => {
            try {
                const response = await fetch(`${this.baseUrl}/api/get-test-status/${testRunId}/`, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('access')}`
                    }
                });

                console.log('API response:', response);

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error('API error text:', errorText);
                    let errorMessage;
                    try {
                        const errorData = JSON.parse(errorText);
                        errorMessage = errorData.error || errorData.detail || `HTTP error! status: ${response.status}`;
                    } catch (e) {
                        errorMessage = errorText || `HTTP error! status: ${response.status}`;
                    }
                    throw new Error(errorMessage);
                }

                const data = await response.json();
                console.log('Test status:', data);

                this.updateStatus(data, testRunId);

                if (['success', 'failed', 'error'].includes(data.status)) {
                    this.stopPolling(testRunId);
                    
                    if (data.selenium_video_path) {
                        this.showSeleniumVisualization(data);
                    }
                }

            } catch (error) {
                console.error('Error polling test status:', error);
                this.stopPolling(testRunId);
            }
        };

        const intervalId = setInterval(pollTest, 1000);
        this.activeTests.get(testRunId).intervalId = intervalId;
    }

    stopPolling(testRunId) {
        console.log('Stopping polling for test run:', testRunId);
        const testInfo = this.activeTests.get(testRunId);
        if (testInfo && testInfo.intervalId) {
            clearInterval(testInfo.intervalId);
            this.activeTests.delete(testRunId);
        }
    }

    showSeleniumVisualization(data) {
        console.log('Showing Selenium visualization');
        const visualizationPanel = document.getElementById('seleniumVisualization');
        const video = document.getElementById('testVideo');
        const actionsLog = document.getElementById('browserActions');
        
        if (visualizationPanel && video && actionsLog) {
            visualizationPanel.classList.remove('hidden');
            video.src = `${this.baseUrl}${data.selenium_video_path}`;
            
            if (data.browser_logs) {
                actionsLog.innerHTML = data.browser_logs.map(log => `
                    <div class="mb-2 p-2 border-b border-gray-200 dark:border-gray-600">
                        <span class="font-semibold">${log.action}:</span>
                        <span class="ml-2">${log.element || log.url}</span>
                        <span class="text-sm text-gray-500 ml-2">${new Date(log.timestamp).toLocaleTimeString()}</span>
                    </div>
                `).join('');
            }
        }
    }

    updateStatus(data, testRunId) {
        console.log('Updating status for test run:', testRunId);
        const testInfo = this.activeTests.get(testRunId);
        if (!testInfo) return;

        const statusElement = document.getElementById('currentStatus');
        const outputElement = document.getElementById('testOutput');
        const durationElement = document.getElementById('testDuration');
        const errorElement = document.getElementById('testError');
        
        if (statusElement) {
            statusElement.textContent = data.status;
            statusElement.className = `px-3 py-1 rounded-full text-white ${this.getStatusColor(data.status)}`;
        }

        if (outputElement && data.log_output && data.log_output !== this.lastOutput) {
            this.lastOutput = data.log_output;
            outputElement.textContent = data.log_output;
            outputElement.scrollTop = outputElement.scrollHeight;
        }

        if (durationElement) {
            const duration = data.duration || (new Date() - testInfo.startTime) / 1000;
            durationElement.textContent = `${duration.toFixed(2)}s`;
        }

        if (data.error_message && errorElement) {
            errorElement.textContent = data.error_message;
            errorElement.classList.remove('hidden');
        }
    }

    getStatusColor(status) {
        console.log('Getting status color for:', status);
        const colors = {
            'pending': 'bg-gray-500',
            'running': 'bg-blue-500',
            'success': 'bg-green-500',
            'failed': 'bg-red-500',
            'error': 'bg-red-600'
        };
        return colors[status] || 'bg-gray-500';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.testExecutionManager = new TestExecutionManager();
});

// Функция для запуска теста
async function runTest(testId) {
    try {
        const response = await fetchWithAuth(`/test-execution/`, {
            method: 'POST',
            body: JSON.stringify({ test_id: testId })
        });

        if (!response.ok) {
            throw new Error(`Failed to start test execution: ${response.status}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error running test:', error);
        throw error;
    }
}

// Функция для проверки статуса теста
async function checkTestStatus(executionId) {
    try {
        const response = await fetchWithAuth(`/test-status/?execution_id=${executionId}`);

        if (!response.ok) {
            throw new Error(`Failed to check test status: ${response.status}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error checking test status:', error);
        throw error;
    }
}

// Экспортируем функции
export { runTest, checkTestStatus };
