// Test script to verify test run functionality
console.log('=== Test Run Feature Check ===');

// Check if functions are available
const functions = [
    'toggleTestRunSection',
    'createTestRun', 
    'showActiveTestRun',
    'closeTestRun',
    'updateTestRunProgress',
    'updateTestCaseStatus',
    'updateTestCaseHighlights',
    'updateFolderCounters',
    'refreshTestRunHistory',
    'loadTestRun',
    'refreshTreeForTestRun',
    'toggleFolderCheckbox',
    'toggleTestCaseCheckbox',
    'markTestPassed',
    'markTestFailed', 
    'markTestSkipped'
];

console.log('Checking if all functions are available:');
functions.forEach(func => {
    const exists = typeof window[func] === 'function';
    console.log(`✓ ${func}: ${exists ? 'OK' : 'MISSING'}`);
});

// Check if UI elements exist
console.log('\nChecking UI elements:');
const uiElements = [
    'test-run-arrow',
    'test-run-section',
    'test-run-name',
    'active-test-run',
    'active-run-name',
    'run-progress-text',
    'run-progress-bar',
    'run-passed-count',
    'run-failed-count',
    'run-skipped-count',
    'test-run-history'
];

uiElements.forEach(id => {
    const exists = document.getElementById(id) !== null;
    console.log(`✓ #${id}: ${exists ? 'OK' : 'MISSING'}`);
});

// Check current state
console.log('\nCurrent state:');
console.log(`Active test run: ${window.activeTestRun ? window.activeTestRun.name : 'None'}`);
console.log(`Test results count: ${window.testRunResults ? Object.keys(window.testRunResults).length : 0}`);

// Instructions
console.log('\n=== How to test: ===');
console.log('1. Click "Прогоны тестов" in sidebar to expand section');
console.log('2. Enter a name like "Прогон 07.06.2025" and click create');
console.log('3. Checkboxes should appear in the folder tree');
console.log('4. Select some test cases');
console.log('5. Open a test case - you should see status buttons');
console.log('6. Click status buttons to update test status');
console.log('7. Watch the progress bar and counters update');

console.log('\n=== Quick demo: ===');
console.log('Run: window.quickTestRunDemo()');

// Add quick demo function
window.quickTestRunDemo = function() {
    console.log('Creating demo test run...');
    
    // Expand test run section
    const section = document.getElementById('test-run-section');
    const arrow = document.getElementById('test-run-arrow');
    if (section && section.classList.contains('hidden')) {
        section.classList.remove('hidden');
        arrow.classList.add('rotate-180');
    }
    
    // Set test run name
    const nameInput = document.getElementById('test-run-name');
    if (nameInput) {
        nameInput.value = `Демо прогон ${new Date().toLocaleDateString('ru-RU')}`;
    }
    
    console.log('Demo ready! Now click the create button or press Enter in the input field.');
};