# Regression Testing Feature Implemented

This document describes the regression testing feature that has been implemented in FlowTest.

## What was implemented:

### 1. Visual Status Indicators in Test Case Tree
- Test cases now show status icons (✓ passed, ✗ failed, ⏭ skipped, ⏱ pending, etc.)
- Status is displayed next to each test case in the folder tree
- Color-coded indicators for quick visual identification

### 2. Manual Test Result Recording
- Right-click on any manual test case to record test results
- Modal dialog for entering:
  - Test status (passed/failed/skipped/error)
  - Comments/description
  - Error messages (for failed tests)
- Results are saved as manual test runs

### 3. Test Run History Updates
- Test run history now shows both manual and automated runs
- Displays run type icon (👤 for manual, 🤖 for automated)
- All manual test results are tracked in the history

### 4. Regression Testing Management
- New regression testing modal with three tabs:
  - Create new regression runs
  - View active regression runs
  - View regression history
- Select multiple test cases for regression testing
- Track progress of regression runs
- Complete or cancel active regression runs

### 5. Backend API Support
- New API endpoints for:
  - Creating regression runs
  - Managing manual test runs
  - Tracking regression progress
  - Recording manual test results

## How to add the Regression button to your UI:

Add this button to your test-cases.html file where you want the regression button to appear (typically near other action buttons):

```html
<button id="regression-button" type="button" 
        class="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium flex items-center transition-colors shadow-lg hover:shadow-xl">
    <i class="ri-git-branch-line mr-2"></i> Регрессионное тестирование
</button>
```

The button event listener is already configured in the JavaScript code.

## Database Migration Required:

Run the following command to apply the database changes:

```bash
docker-compose exec backend python manage.py migrate testcases
```

Or if running locally:
```bash
cd backend
python manage.py migrate testcases
```

## Usage:

1. **Visual Status Indicators**: 
   - Status icons automatically appear next to test cases in the tree
   - Based on the last test run result

2. **Manual Test Recording**:
   - Right-click on any manual test case
   - Select "Записать результат теста" (Record test result)
   - Fill in the status and comments
   - Submit to save

3. **Regression Testing**:
   - Click the "Регрессионное тестирование" button
   - Create a new regression run by:
     - Entering a name and description
     - Selecting test cases to include
     - Click "Создать регрессионный тест"
   - Monitor active regression runs in the "Активные запуски" tab
   - View history in the "История" tab

## Technical Details:

### New Models:
- `RegressionRun`: Tracks regression testing sessions
- Updated `TestRun` model with `run_type` field to distinguish manual/automated runs

### New API Endpoints:
- `/api/projects/{id}/testcases/regression-runs/` - Regression run management
- `/api/projects/{id}/testcases/manual-runs/` - Manual test run recording

### Frontend Updates:
- `test-cases.js`: Added regression modal, manual test recording, and status indicators
- New methods for managing regression runs and recording manual results

## Локализация:

All UI elements use Russian language by default. To add other languages, update the translation files in `frontend/js/i18n/translations.js`.