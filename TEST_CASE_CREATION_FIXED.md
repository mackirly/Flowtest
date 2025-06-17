# Test Case Creation Fix

## Update: Fixed API URL Issue
After the initial fix, there was another issue where the API URL was being duplicated (`/api/api/`). This has been fixed by:

1. Removing the `/api` prefix from TestCaseClient methods since `apiRequest` already adds it
2. Updating all TestCaseClient methods to use the correct parameter format for `apiRequest`

# Test Case Creation Fix

## Problem
When clicking the "Save" button on the test case form, a success notification appeared but the test case was not actually created in the backend. The code was only showing a success message without making the actual API call.

## Root Cause
In the `saveTestCase` function in `/frontend/js/pages/test-cases.js`, the code was only logging the test case data and showing a success toast, but not actually calling the API to create or update the test case.

## Solution
Updated the `saveTestCase` and `deleteTestCase` functions to properly call the TestCaseClient API methods:

### 1. Fixed `saveTestCase` function:
- Added actual API calls using `testCaseClient.createTestCase()` for new test cases
- Added actual API calls using `testCaseClient.updateTestCase()` for existing test cases
- Changed field name from `type` to `test_type` to match backend expectations
- Changed field name from `automation_name` to `automation_test_name` to match backend
- Added proper error handling with detailed error messages
- Added check for current project selection before creating test case

### 2. Fixed `deleteTestCase` function:
- Added actual API call using `testCaseClient.deleteTestCase()`
- Added proper error handling with detailed error messages

## Changes Made

### `/frontend/js/pages/test-cases.js`
```javascript
// Before (not working):
window.saveTestCase = async function() {
    // ... collect form data ...
    try {
        if (testCaseId) {
            console.log('Updating test case:', testCaseId, formData);
            window.testCasesPage.toastManager.success('Тест-кейс обновлен');
        } else {
            console.log('Creating test case:', formData);
            window.testCasesPage.toastManager.success('Тест-кейс создан');
        }
        // ... rest of code
    }
}

// After (working):
window.saveTestCase = async function() {
    // ... collect form data ...
    try {
        if (testCaseId) {
            console.log('Updating test case:', testCaseId, formData);
            if (window.testCasesPage && window.testCasesPage.currentProject) {
                await window.testCasesPage.testCaseClient.updateTestCase(
                    window.testCasesPage.currentProject,
                    testCaseId,
                    formData
                );
                window.testCasesPage.toastManager.success('Тест-кейс обновлен');
            }
        } else {
            console.log('Creating test case:', formData);
            if (window.testCasesPage && window.testCasesPage.currentProject) {
                await window.testCasesPage.testCaseClient.createTestCase(
                    window.testCasesPage.currentProject,
                    formData
                );
                window.testCasesPage.toastManager.success('Тест-кейс создан');
            } else {
                window.testCasesPage.toastManager.error('Пожалуйста, выберите проект');
                return;
            }
        }
        // ... rest of code
    }
}
```

## Result
Now when clicking "Save" on the test case form:
1. The test case is actually created in the backend via API
2. The test case list is refreshed to show the new test case
3. Proper error messages are shown if something goes wrong
4. User is prompted to select a project if none is selected