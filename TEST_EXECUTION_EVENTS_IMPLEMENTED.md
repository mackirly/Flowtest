# Test Execution Events Feature Implemented

## Overview
A comprehensive test execution event system has been implemented in FlowTest, allowing teams to organize and track test runs as events. This feature enables:

1. **Creating Test Execution Events** - Schedule test runs with specific dates and test case selections
2. **Team Participation** - Users can join events as testers, observers, or test leads
3. **Real-time Progress Tracking** - Monitor test execution progress with live updates
4. **Manual Test Result Recording** - Participants can update test case statuses during the event

## Key Features

### 1. Event Creation
- Create events with type "Test Execution" (Запуск тестов)
- Select tests by:
  - All tests in a project
  - Tests from specific folders
  - Individually selected test cases
- Set date, time, priority, and description
- Support for recurring test events

### 2. Event Participation
- **Join Event**: Users can join as participants with roles:
  - Tester (Тестировщик) - Can execute and update test results
  - Observer (Наблюдатель) - Can view progress
  - Test Lead (Руководитель тестирования) - Can manage the event
- **Leave Event**: Participants can leave at any time

### 3. Test Execution Workflow
1. Event creator initializes tests (creates test result records)
2. Participants join the event
3. Tests can be assigned to specific participants (optional)
4. Participants update test statuses:
   - Passed (Пройден)
   - Failed (Провален)
   - Skipped (Пропущен)
   - Blocked (Заблокирован)
5. Progress is tracked in real-time

### 4. Progress Tracking
- Visual progress bar showing completion percentage
- Statistics dashboard:
  - Pending tests
  - Passed tests
  - Failed tests
  - Skipped tests
  - Blocked tests
- Auto-refresh every 5 seconds during active events

## How to Use

### Creating a Test Execution Event

1. Go to the Events page (События)
2. Click "Создать событие" (Create Event)
3. Fill in basic information:
   - Title: e.g., "Прогон 07.06.2025"
   - Description: Details about the test run
   - Type: Select "Запуск тестов" (Test Execution)
   - Date and time
4. Select test cases:
   - Choose a project
   - Select test selection type:
     - All tests
     - By folders
     - Specific test cases
5. Save the event

### Participating in a Test Event

1. Open the event from the calendar
2. The test execution modal will open automatically for test events
3. Click "Присоединиться" (Join) to become a participant
4. View assigned tests or all tests
5. Click status buttons to update test results:
   - ✓ Пройден (Passed)
   - ✗ Провален (Failed)
   - ⏭ Пропущен (Skipped)
   - ⊘ Заблокирован (Blocked)
6. Add comments when updating status (optional)

### Managing Test Events (Event Creator/Test Lead)

1. Initialize tests by clicking "Инициализировать тесты"
2. Assign tests to specific participants (optional)
3. Monitor progress in real-time
4. Export results when complete

## Technical Implementation

### Backend Models

```python
# Event model enhanced with test execution support
class Event(models.Model):
    event_type = 'test-execution'
    test_selection_type = 'all'|'folder'|'specific'
    selected_folders = JSONField()  # For folder-based selection
    test_cases = ManyToManyField()  # For specific selection

# Track event participants
class EventParticipant(models.Model):
    event = ForeignKey(Event)
    user = ForeignKey(User)
    role = 'tester'|'observer'|'lead'

# Track test results within an event
class EventTestResult(models.Model):
    event = ForeignKey(Event)
    test_case = ForeignKey(TestCase)
    assigned_to = ForeignKey(User, null=True)
    executed_by = ForeignKey(User, null=True)
    status = 'pending'|'passed'|'failed'|'skipped'|'blocked'
    comment = TextField()
    executed_at = DateTimeField()
```

### API Endpoints

- `GET /api/events/{id}/execution/` - Get test execution details
- `POST /api/events/{id}/join/` - Join an event
- `POST /api/events/{id}/leave/` - Leave an event
- `POST /api/events/{id}/initialize_tests/` - Initialize test results
- `GET /api/events/{id}/test-results/` - Get test results
- `POST /api/events/{id}/test-results/{result_id}/update/` - Update test result
- `POST /api/events/{id}/assign-tests/` - Assign tests to participants

### Frontend Components

- **Event Creation Modal** - Enhanced with test selection UI
- **Test Execution Modal** - Dedicated interface for test execution events
- **Progress Tracking** - Real-time updates with auto-refresh
- **Test Result Cards** - Interactive cards for updating test status

## Database Migration

Run the following migration to apply the new models:

```bash
docker-compose exec backend python manage.py migrate events
```

## Benefits

1. **Organized Testing** - Schedule and plan test runs in advance
2. **Team Collaboration** - Multiple testers can work on the same event
3. **Progress Visibility** - Real-time tracking of test execution progress
4. **Historical Records** - All test runs are recorded with results
5. **Flexibility** - Support for different test selection strategies

## Future Enhancements

1. Test assignment automation based on tester availability
2. Integration with automated test runners
3. Test result export to various formats
4. Email notifications for event participants
5. Test execution reports generation