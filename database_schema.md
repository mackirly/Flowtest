# FlowTest 2.0 Database Schema

## Core Models

### User Management

#### CustomUser
- `id`: Primary key
- `username`: Username for login
- `email`: Email address
- `first_name`: First name
- `last_name`: Last name
- `middle_name`: Middle name (optional)
- `password`: Hashed password
- `is_active`: User account status
- `is_staff`: Admin site access flag
- `is_superuser`: Superuser status
- `date_joined`: Account creation date
- `last_login`: Last login timestamp
- `language`: Preferred language (choices: en, ru)
- `theme`: UI theme preference (choices: light, dark, system)
- `phone_number`: Phone number (optional)
- `avatar`: Profile image
- `role`: Foreign key to Role

#### Role
- `id`: Primary key
- `name`: Role name
- `description`: Role description
- `is_admin_role`: Admin flag
- `permissions`: Many-to-many relationship with Permission

#### Permission
- `id`: Primary key
- `name`: Permission name
- `codename`: Permission code
- `description`: Permission description
- `category`: Permission category (e.g., user_management, project_management)

### Project Management

#### Project
- `id`: Primary key
- `name`: Project name (unique)
- `description`: Project description
- `created_at`: Creation timestamp
- `updated_at`: Last update timestamp
- `status`: Project status (choices: active, archived)
- `members`: Many-to-many relationship with CustomUser

#### Folder
- `id`: Primary key
- `name`: Folder name
- `description`: Folder description
- `created_at`: Creation timestamp
- `updated_at`: Last update timestamp
- `project`: Foreign key to Project
- `parent_folder`: Self-reference to parent folder (optional)
- `status`: Folder status (default: active)
- `author`: Foreign key to CustomUser

### Test Management

#### TestCase
- `id`: Primary key
- `title`: Test case title
- `description`: Test case description
- `condition`: Preconditions
- `steps`: Test steps
- `expected_results`: Expected outcomes
- `folder`: Foreign key to Folder (optional)
- `project`: Foreign key to Project
- `created_at`: Creation timestamp
- `updated_at`: Last update timestamp
- `priority`: Priority level (choices: high, medium, low)
- `platform`: Target platform
- `test_type`: Test type (choices: manual, automated)
- `test_code`: Test code content (for automated tests)
- `author`: Foreign key to CustomUser
- `script_path`: Path to test script file
- `class_name`: Test class name
- `method_name`: Test method name
- `framework`: Test framework (e.g., pytest, unittest, robot)
- `automation_project`: Foreign key to AutomationProject
- `tags`: JSON field for test tags

#### TestRun
- `id`: Primary key
- `test_case`: Foreign key to TestCase
- `status`: Run status (e.g., pending, running, passed, failed)
- `started_at`: Run start timestamp
- `finished_at`: Run completion timestamp
- `execution_time`: Duration in seconds
- `error_message`: Error details if failed
- `output`: Test output content
- `executor`: Foreign key to CustomUser

#### TestReport
- `id`: Primary key
- `test_case`: Foreign key to TestCase
- `executor`: Foreign key to CustomUser
- `status`: Report status (choices: passed, failed, blocked, skipped, in_progress)
- `execution_date`: Execution timestamp
- `execution_time`: Execution duration
- `actual_result`: Actual test result
- `comments`: Additional comments
- `attachments`: File attachments
- `environment`: Test environment
- `version`: Software version tested

#### TestEvent
- `id`: Primary key
- `test_case`: Foreign key to TestCase
- `test_report`: Foreign key to TestReport (optional)
- `event_type`: Event type (e.g., start, step_complete, error)
- `timestamp`: Event timestamp
- `description`: Event description
- `details`: JSON field for additional details
- `created_by`: Foreign key to CustomUser
- `severity`: Event severity level
- `screenshot`: Screenshot attachment
- `log_file`: Log file attachment

### Automation

#### AutomationProject
- `id`: Primary key
- `name`: Project name
- `project`: Foreign key to Project
- `repository_url`: Repository URL
- `repository_type`: Repository type (e.g., github, gitlab)
- `branch`: Repository branch
- `framework`: Test framework
- `tests_directory`: Tests directory path
- `local_path`: Local repository path
- `detected_frameworks`: JSON field for detected frameworks
- `access_token`: Repository access token
- `username`: Repository username
- `last_sync`: Last synchronization timestamp
- `created_at`: Creation timestamp
- `updated_at`: Last update timestamp
- `sync_status`: Synchronization status

#### AutomationTest
- `id`: Primary key
- `project`: Foreign key to AutomationProject
- `name`: Test name
- `file_path`: Test file path
- `is_available`: Availability flag
- `last_run`: Last run timestamp
- `last_status`: Last run status
- `framework`: Test framework

#### TestSchedule
- `id`: Primary key
- `project`: Foreign key to AutomationProject
- `tests`: Many-to-many relationship with AutomationTest
- `schedule_time`: Scheduled time
- `is_active`: Active flag
- `last_run`: Last run timestamp
- `last_status`: Last run status
- `last_result`: Last run result
- `created_at`: Creation timestamp
- `updated_at`: Last update timestamp

### Reporting

#### SchedulerEvent
- `id`: Primary key
- `title`: Event title
- `description`: Event description
- `event_type`: Event type (e.g., run_tests, general)
- `scheduled_time`: Scheduled timestamp
- `recurrence`: Recurrence pattern (e.g., none, daily, weekly)
- `project`: Foreign key to Project
- `parent_event`: Self-reference to parent event
- `test_config`: JSON field for test configuration
- `created_at`: Creation timestamp
- `updated_at`: Last update timestamp
- `last_run`: Last run timestamp
- `status`: Event status

#### ReportTemplate
- `id`: Primary key
- `name`: Template name
- `description`: Template description
- `created_by`: Foreign key to CustomUser
- `project`: Foreign key to Project
- `created_at`: Creation timestamp
- `updated_at`: Last update timestamp
- `is_deleted`: Soft delete flag
- `configuration`: JSON field for report configuration

#### CustomChart
- `id`: Primary key
- `name`: Chart name
- `description`: Chart description
- `chart_type`: Chart type (e.g., line, bar, pie)
- `data_source`: Data source type
- `configuration`: JSON field for chart configuration
- `custom_query`: Custom SQL query
- `created_by`: Foreign key to CustomUser
- `created_at`: Creation timestamp
- `updated_at`: Last update timestamp
- `project`: Foreign key to Project

## Database Relationships

### One-to-Many Relationships
- CustomUser → Role: Each user has one role
- Project → Folder: A project has many folders
- Folder → Folder: A folder can have many subfolders (self-reference)
- Folder → TestCase: A folder contains many test cases
- Project → TestCase: A project has many test cases
- TestCase → TestRun: A test case has many test runs
- TestCase → TestReport: A test case has many test reports
- TestCase → TestEvent: A test case has many events
- TestReport → TestEvent: A test report has many events
- Project → AutomationProject: A project can have many automation projects
- AutomationProject → AutomationTest: An automation project has many automation tests
- AutomationProject → TestSchedule: An automation project has many schedules
- Project → SchedulerEvent: A project has many scheduler events
- SchedulerEvent → SchedulerEvent: An event can have many child events
- Project → ReportTemplate: A project has many report templates
- Project → CustomChart: A project has many custom charts

### Many-to-Many Relationships
- Role ↔ Permission: Roles have permissions
- Project ↔ CustomUser: Projects have members
- TestSchedule ↔ AutomationTest: Schedules have multiple tests

## Indexes
- CustomUser: username, email
- Project: name
- Folder: project_id, parent_folder_id
- TestCase: project_id, folder_id, priority, test_type
- TestRun: test_case_id, status
- TestReport: test_case_id, status, execution_date
- TestEvent: timestamp, event_type, severity
- AutomationProject: project_id, repository_url
- AutomationTest: project_id, framework
- TestSchedule: project_id, schedule_time
- SchedulerEvent: project_id, scheduled_time, status
- ReportTemplate: project_id, created_at
- CustomChart: project_id, chart_type

## Constraints
- CustomUser: username and email must be unique
- Project: name must be unique
- Role: name must be unique
- Permission: codename must be unique
- Folder: (name, project_id, parent_folder_id) must be unique
- TestCase: (title, project_id) should be unique
- AutomationProject: (name, project_id) must be unique
- ReportTemplate: (name, project_id) should be unique
- CustomChart: (name, project_id) should be unique