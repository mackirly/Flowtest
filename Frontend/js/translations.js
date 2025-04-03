const translations = {
    ru: {
        // Общие
        "settings": "Настройки",
        "back": "Назад",
        "save": "Сохранить",
        "cancel": "Отмена",
        "delete": "Удалить",
        "edit": "Редактировать",
        "create": "Создать",
        "search": "Поиск",
        
        // Календарь
        "event_calendar": "Календарь событий",
        "sunday_short": "Вс",
        "monday_short": "Пн",
        "tuesday_short": "Вт",
        "wednesday_short": "Ср",
        "thursday_short": "Чт",
        "friday_short": "Пт",
        "saturday_short": "Сб",
        "add_event": "Добавить событие",
        "selected_date": "Выбранная дата:",
        "no_date_selected": "Дата не выбрана",
        "title": "Название",
        "enter_event_title": "Введите название события",
        "time": "Время",
        "reminder": "Напоминание",
        "test_run": "Запуск тестов",
        "enter_event_description": "Введите описание события",
        
        // Фильтры и сортировка
        "filters_and_sorting": "Фильтры и сортировка",
        "filters": "Фильтры",
        "sorting": "Сортировка",
        "search_folders_and_tests": "Поиск папок и тест-кейсов...",
        "search_results": "результатов найдено",
        "ascending": "По возрастанию",
        "descending": "По убыванию",
        "folder_type": "Тип папки",
        "all_folders": "Все папки",
        "root_folders": "Корневые папки",
        "subfolders": "Подпапки",
        "empty_folders": "Пустые папки",
        "with_tests": "С тестами",
        "created_by": "Создатель",
        "all_users": "Все пользователи",
        "me": "Я",
        "date_created": "Дата создания",
        "all_time": "За все время",
        "name": "Название",
        "date": "Дата",
        "name_az": "А-Я",
        "name_za": "Я-А",
        "date_oldest": "Сначала старые",
        "date_newest": "Сначала новые",
        "reset": "Сбросить",
        "apply": "Применить",
        "all_statuses": "Все статусы",
        "active": "Активный",
        "archived": "Архивный",
        "from_last_month": "за последний месяц",
        "reports": "Отчеты",
        "dashboard": "Панель управления",
        "companyLogo": "Логотип компании",
        "events": "События",
        "testRuns": "Запуски тестов",
        "allProjects": "Все проекты",
        "view_all_notifications": "Все уведомления",
        "failedTests": "Неудачные тесты",
        "executionTime": "Время выполнения",
        "categoryStatistics": "Статистика по категориям",
        "testCases": "Тест-кейсы",
        "create_root_folder": "Создать корневую папку",
        "select_test_case": "Выберите тест-кейс",
        "reportTemplates": "Шаблоны отчетов",
        "createTemplate": "Создать шаблон",
        "createReportTemplate": "Создание шаблона отчета",
        "templateName": "Название шаблона",
        "templateDescription": "Описание шаблона",
        "sections": "Разделы",
        "summarySection": "Сводка",
        "testsSection": "Тесты",
        "chartsSection": "Графики",

        // Типы тестов
        "testTypeValues": {
            "manual": "Ручной",
            "automated": "Автоматизированный",
            "api": "API",
            "performance": "Производительность"
        },
        
        // Платформы
        "platformValues": {
            "web": "Веб",
            "mobile": "Мобильный",
            "desktop": "Десктоп",
            "api": "API",
            "any": "Любая"
        },

        // Приоритеты
        "priorityValues": {
            "high": "Высокий",
            "medium": "Средний",
            "low": "Низкий"
        },
        
        // Графики и статистика
        "successRate": "Успешность",
        "passed": "Пройдено",
        "failed": "Провалено",
        "skipped": "Пропущено",
        "testsOverTime": "Тесты по времени",
        "resultsDistribution": "Распределение результатов",
        "avgExecutionTime": "Среднее время выполнения",
        "successRateOverTime": "Динамика успешности",
        "avgExecutionTimeOverTime": "Динамика времени выполнения",
        "testCaseCreation": "Создание тест-кейсов",
        "topContributors": "Топ контрибьюторов",
        "tests": "тестов",
        "secondsShort": "с",
        "testsExecutedPerDay": "Количество выполненных тестов",
        "numberOfTests": "Количество тестов",

        // Результаты графика
        "resultsPassed": "Успешные",
        "resultsFailed": "Неудачные",
        "resultsSkipped": "Пропущенные",

        // График создания тестов
        "dailyTestsCreated": "Создано тестов за день",
        "totalTests": "Всего тестов",

        // Меню
        "profile": "Профиль",
        "settings": "Настройки",
        "logout": "Выход",
        "projects": "Проекты",
        "testCases": "Тест-кейсы",
        "reports": "Отчеты",

        // Auth
        "login": "Войти",
        "username": "Имя пользователя",
        "password": "Пароль",
        "loginButton": "Войти",
        "rememberMe": "Запомнить меня",
        "username-placeholder": "Введите имя пользователя",
        "password-placeholder": "Введите пароль",

        // Добавим недостающие
        "notifications": "Уведомления",
        "view_all": "Посмотреть все",
        "no_notifications": "Нет новых уведомлений",
        "menu": {
            "profile": "Профиль",
            "settings": "Настройки",
            "logout": "Выход"
        },

        // Dashboard
        "dashboard": "Панель управления",
        "companyLogo": "Логотип компании",
        "events": "События",
        "testRuns": "Запуски тестов",
        "allProjects": "Все проекты",
        "view_all_notifications": "Все уведомления",
        "failedTests": "Неудачные тесты",
        "executionTime": "Время выполнения",
        "categoryStatistics": "Статистика по категориям",

        // Категории и статистика
        "category": "Категория",
        "totalTests": "Всего тестов",
        "failureRate": "Процент неудач",
        "avgDuration": "Среднее время",
        "functional": "Функциональные",
        "nonFunctional": "Нефункциональные",
        "integration": "Интеграционные",
        "security": "Безопасность",

        // Проекты
        "createNewProject": "Создать новый проект",
        "projectName": "Название проекта",
        "description": "Описание",
        "selectProject": "Выберите проект",
        "noProjects": "Нет доступных проектов",
        "enterProjectName": "Введите название проекта",
        "enterProjectDescription": "Введите описание проекта",
        "projectCreated": "Проект успешно создан",
        "projectCreationError": "Ошибка при создании проекта",

        // Login
        "light": "Светлая",
        "dark": "Темная",
        "system": "Системная",
        "welcome": "Добро пожаловать",
        "signin-msg": "Войдите в свой аккаунт",
        "remember": "Запомнить меня",
        "forgot": "Забыли пароль?",
        "signin-btn": "Войти",
        "no-account": "Нет аккаунта?",
        "signup": "Зарегистрироваться",

        // Repository Connect Page
        "connectRepository": "Подключить репозиторий",
        "project": "Проект",
        "loadingProjects": "Загрузка проектов...",
        "selectProject": "Выберите проект",
        "noProjects": "Нет доступных проектов",
        "name": "Название",
        "repositoryUrl": "URL репозитория",
        "repositoryType": "Тип репозитория",
        "username": "Имя пользователя",
        "accessToken": "Токен доступа",
        "branch": "Ветка",
        "framework": "Фреймворк",
        "testsDirectory": "Директория с тестами",
        "connect": "Подключить",
        "back": "Назад",
        "failedToLoadProjects": "Не удалось загрузить проекты",
        "errorLoadingProjects": "Ошибка загрузки проектов",
        "failedToConnectRepository": "Не удалось подключить репозиторий",
        "github": "GitHub",
        "gitlab": "GitLab",
        "bitbucket": "Bitbucket",
        "pytest": "PyTest",
        "unittest": "UnitTest",
        "robot": "Robot Framework",
        "playwright": "Playwright",

        // Settings Page
        "settings": "Настройки",
        "back-to-home": "Вернуться на главную",
        "themePreferences": "Настройки темы",
        "light": "Светлая",
        "dark": "Темная",
        "system": "Системная",
        "language": "Язык",
        "english": "Английский",
        "russian": "Русский",
        "german": "Немецкий",
        "manageRoles": "Управление ролями",
        "administrator": "Администратор",
        "adminDesc": "Полный доступ ко всем настройкам и функциям",
        "manager": "Менеджер",
        "managerDesc": "Может управлять командой и просматривать отчеты",
        "user": "Пользователь",
        "userDesc": "Базовый доступ к функциям платформы",
        "testAutomation": "Автоматизация тестирования",
        "testRepository": "Репозиторий тестов",
        "connectRepository": "Подключить репозиторий",
        "testRepositoryDesc": "Подключите ваш репозиторий с автоматизированными тестами",
        "automationProjects": "Проекты автоматизации",
        "automationProjectsDesc": "Просмотр и управление проектами автоматизации тестов",
        "viewProjects": "Просмотр проектов",
        "languageChangeSuccess": "Язык успешно изменен",
        "languageChangeError": "Ошибка при смене языка",
        "loadingTranslationsError": "Ошибка загрузки переводов",

        // Аналитика
        "failedToLoadAnalytics": "Не удалось загрузить данные аналитики",
        "testCasesByStatus": "Тест-кейсы по статусам",
        "userActivity": "Активность пользователей",
        "dailyTrends": "Ежедневные тренды",
        "projectStats": "Статистика проекта",
        "priorityDistribution": "Распределение по приоритетам",
        "executionTimeStats": "Статистика времени выполнения",
        "createdTests": "Созданные тесты",
        "passedTests": "Пройденные тесты",
        "failedTests": "Проваленные тесты",
        "totalTests": "Всего тестов",
        "invalidDataFormat": "Неверный формат данных от сервера",

        // Профиль
        "profile": "Профиль",
        "profileSettings": "Настройки профиля",
        "firstName": "Имя",
        "lastName": "Фамилия",
        "middleName": "Отчество",
        "nickname": "Никнейм",
        "email": "Электронная почта",
        "currentPassword": "Текущий пароль",
        "newPassword": "Новый пароль",
        "maxFileSize": "Максимальный размер файла: 5MB",
        "allowedFormats": "Разрешенные форматы: JPG, PNG",
        "enterFirstName": "Введите имя",
        "enterLastName": "Введите фамилию",
        "enterMiddleName": "Введите отчество",
        "enterNickname": "Введите никнейм",
        "enterEmail": "Введите email",
        "enterPassword": "Введите текущий пароль",
        "enterNewPassword": "Введите новый пароль",
        "saveChanges": "Сохранить изменения",
        "cancel": "Отмена",
        "back": "Назад",
        "passwordRequirements": "Требования к паролю:",
        "passwordStrength": "Сложность пароля",
        "confirmPassword": "Подтвердите пароль",
        "passwordMustContain": "Пароль должен содержать:",
        "minLength": "Минимум 8 символов",
        "upperCase": "Заглавную букву",
        "lowerCase": "Строчную букву",
        "number": "Цифру",
        "specialChar": "Специальный символ",
        "passwordWeak": "Слабый",
        "passwordMedium": "Средний",
        "passwordStrong": "Сильный",
        "passwordsDoNotMatch": "Пароли не совпадают",
        "changePassword": "Сменить пароль",
        "Profile Settings": "Настройки профиля",
        "First Name": "Имя",
        "Last Name": "Фамилия",
        "Email": "Электронная почта",
        "Bio": "О себе",
        "New Password": "Новый пароль",
        "Save Changes": "Сохранить изменения",
        "Cancel": "Отмена",
        "Allowed formats: JPG, PNG, GIF": "Допустимые форматы: JPG, PNG, GIF",
        "Error updating profile": "Ошибка при обновлении профиля",
        "Error fetching user data": "Ошибка при загрузке данных пользователя",

        // Топ контрибьюторов
        "topContributors": "Топ Контрибьюторов",
        "unknownUser": "Неизвестный пользователь",
        "noContributorsYet": "Пока нет контрибьюторов",
        "test": "тест",
        "tests": "тестов",

        // Нестабильные тесты
        "testFlakiness": "Нестабильные тесты",
        "flakinessRate": "Уровень нестабильности",
        "flakinessPercentage": "Процент нестабильности",
        "statusChanges": "Изменений статуса",
        "topFlakyTests": "Топ нестабильных тестов",

        // Шаблоны отчетов
        "reportDesigner": "Конструктор отчетов",
        "viewTemplates": "Просмотр шаблонов",
        "createNewTemplate": "Создать новый шаблон",
        "sortNewest": "Сначала новые",
        "selectProjectFirst": "Выберите проект для отображения шаблонов",
        "noTemplatesFound": "Шаблоны не найдены",
        "loadingTemplates": "Загрузка шаблонов...",

        // Админ-панель
        "ACTIONS": "Действия",
        "addRole": "Добавить роль",
        "addNewPermission": "Добавить новое разрешение",
        "addNewUser": "Добавить нового пользователя",
        "addPermission": "Добавить разрешение",
        "addUser": "Добавить пользователя",
        "adminPanel": "Админ-панель",
        "allRoles": "Все роли",
        "EMAIL": "Email",
        "editRole": "Редактировать роль",
        "editUser": "Редактировать пользователя",
        "filterByRole": "Фильтр по ролям",
        "FULLNAME": "Полное имя",
        "permissionDescription": "Описание разрешения",
        "permissionId": "ID разрешения",
        "permissionManagement": "Управление разрешениями",
        "permissionsTab": "Разрешения",
        "ROLE": "Роль",
        "roleDescription": "Описание роли",
        "roleId": "ID роли",
        "roleManagement": "Управление ролями",
        "roleName": "Название роли",
        "rolePermissions": "Разрешения роли",
        "rolesTab": "Роли",
        "searchUser": "Поиск пользователя",
        "selectedPermissions": "Выбранные разрешения",
        "STATUS": "Статус",
        "userEmail": "Email пользователя",
        "userFullName": "Полное имя пользователя",
        "userIsActive": "Активный пользователь",
        "userManagement": "Управление пользователями",
        "username": "Имя пользователя",
        "USERNAME": "Имя пользователя",
        "userPassword": "Пароль",
        "userRole": "Роль пользователя",
        "usersTab": "Пользователи",

        // Типы тестов
        "testType": {
            "manual": "Ручной",
            "automated": "Автоматизированный",
            "api": "API",
            "performance": "Производительность"
        },
        
        // Тест-кейс детали
        "test": "Тест",
        "created": "Создан",
        "updated": "Обновлен",
        "author": "Автор",
        "overview": "Обзор",
        "code": "Код",
        "steps": "Шаги",
        "runs": "Запуски",
        "description": "Описание",
        "tags": "Теги",
        "noTagsAdded": "Теги не добавлены",
        "addTag": "Добавить тег",
        "details": "Детали",
        "platform": "Платформа",
        "priority": "Приоритет",
        "estimatedTime": "Оценочное время (минуты)",
        "testType": "Тип теста",
        "runTest": "Запустить тест",
        "testSteps": "Шаги теста",
        "noStepsDefined": "Для этого тест-кейса не определены шаги",
        "testRuns": "Запуски теста",
        "noRecentRuns": "Нет недавних запусков",
        "testCode": "Код теста",
        "platformLabel": "Платформа",
        "priorityLabel": "Приоритет",
        "estimatedTimeLabel": "Оценочное время (минуты)",
        "testTypeLabel": "Тип теста",
        "detailsLabel": "Детали",
    },
    en: {
        // Common
        "settings": "Settings",
        "back": "Back",
        "save": "Save",
        "cancel": "Cancel",
        "delete": "Delete",
        "edit": "Edit",
        "create": "Create",
        "search": "Search",
        
        // Calendar
        "event_calendar": "Event Calendar",
        "sunday_short": "Sun",
        "monday_short": "Mon",
        "tuesday_short": "Tue",
        "wednesday_short": "Wed",
        "thursday_short": "Thu",
        "friday_short": "Fri",
        "saturday_short": "Sat",
        "add_event": "Add Event",
        "selected_date": "Selected Date:",
        "no_date_selected": "No date selected",
        "title": "Title",
        "enter_event_title": "Enter event title",
        "time": "Time",
        "reminder": "Reminder",
        "test_run": "Test Run",
        "enter_event_description": "Enter event description",
        
        // Filters and Sorting
        "filters_and_sorting": "Filters & Sorting",
        "filters": "Filters",
        "sorting": "Sorting",
        "search_folders_and_tests": "Search folders and test cases...",
        "search_results": "results found",
        "ascending": "Ascending",
        "descending": "Descending",
        "folder_type": "Folder Type",
        "all_folders": "All Folders",
        "root_folders": "Root Folders",
        "subfolders": "Subfolders",
        "empty_folders": "Empty Folders",
        "with_tests": "With Tests",
        "created_by": "Created By",
        "all_users": "All Users",
        "me": "Me",
        "date_created": "Date Created",
        "all_time": "All Time",
        "name": "Name",
        "date": "Date",
        "name_az": "A-Z",
        "name_za": "Z-A",
        "date_oldest": "Oldest First",
        "date_newest": "Newest First",
        "reset": "Reset",
        "apply": "Apply",
        "all_statuses": "All Statuses",
        "active": "Active",
        "archived": "Archived",
        "from_last_month": "from last month",
        "reports": "Reports",
        "dashboard": "Dashboard",
        "companyLogo": "Company Logo",
        "events": "Events",
        "testRuns": "Test Runs",
        "allProjects": "All Projects",
        "view_all_notifications": "View All Notifications",
        "failedTests": "Failed Tests",
        "executionTime": "Execution Time",
        "categoryStatistics": "Category Statistics",
        "testCases": "Test Cases",
        "create_root_folder": "Create Root Folder",
        "select_test_case": "Select Test Case",
        "reportTemplates": "Report Templates",
        "createTemplate": "Create Template",
        "createReportTemplate": "Create Report Template",
        "templateName": "Template Name",
        "templateDescription": "Template Description",
        "sections": "Sections",
        "summarySection": "Summary",
        "testsSection": "Tests",
        "chartsSection": "Charts",

        // Charts
        "successRate": "Success Rate",
        "passed": "Passed",
        "failed": "Failed",
        "skipped": "Skipped",
        "testsOverTime": "Tests Over Time",
        "resultsDistribution": "Results Distribution",
        "avgExecutionTime": "Average Execution Time",
        "successRateOverTime": "Success Rate Over Time",
        "avgExecutionTimeOverTime": "Average Execution Time Over Time",
        "testCaseCreation": "Test Case Creation",
        "topContributors": "Top Contributors",
        "tests": "tests",
        "secondsShort": "s",
        "testsExecutedPerDay": "Tests Executed Per Day",
        "numberOfTests": "Number of Tests",

        // Priorities
        "priorityValues": {
            "high": "High",
            "medium": "Medium",
            "low": "Low"
        },
        
        // Platforms
        "platformValues": {
            "web": "Web",
            "mobile": "Mobile",
            "desktop": "Desktop",
            "api": "API",
            "any": "Any"
        },

        // Results Chart
        "resultsPassed": "Passed",
        "resultsFailed": "Failed",
        "resultsSkipped": "Skipped",

        // Test Creation Chart
        "dailyTestsCreated": "Daily Tests Created",
        "totalTests": "Total Tests",

        // Menu
        "profile": "Profile",
        "settings": "Settings",
        "logout": "Logout",
        "projects": "Projects",
        "testCases": "Test Cases",
        "reports": "Reports",

        // Auth
        "login": "Login",
        "username": "Username",
        "password": "Password",
        "loginButton": "Sign In",
        "rememberMe": "Remember me",
        "username-placeholder": "Enter username",
        "password-placeholder": "Enter password",

        // Добавим недостающие
        "notifications": "Notifications",
        "view_all": "View all",
        "no_notifications": "No new notifications",
        "menu": {
            "profile": "Profile",
            "settings": "Settings",
            "logout": "Logout"
        },

        // Dashboard
        "dashboard": "Dashboard",
        "companyLogo": "Company Logo",
        "events": "Events",
        "testRuns": "Test Runs",
        "allProjects": "All Projects",
        "view_all_notifications": "View All Notifications",
        "failedTests": "Failed Tests",
        "executionTime": "Execution Time",
        "categoryStatistics": "Category Statistics",

        // Categories and Statistics
        "category": "Category",
        "totalTests": "Total Tests",
        "failureRate": "Failure Rate",
        "avgDuration": "Average Duration",
        "functional": "Functional",
        "nonFunctional": "Non-Functional",
        "integration": "Integration",
        "security": "Security",

        // Projects
        "createNewProject": "Create New Project",
        "projectName": "Project Name",
        "description": "Description",
        "selectProject": "Select Project",
        "noProjects": "No projects available",
        "enterProjectName": "Enter project name",
        "enterProjectDescription": "Enter project description",
        "projectCreated": "Project successfully created",
        "projectCreationError": "Error creating project",

        // Login
        "light": "Light",
        "dark": "Dark",
        "system": "System",
        "welcome": "Welcome back",
        "signin-msg": "Sign in to your account",
        "remember": "Remember me",
        "forgot": "Forgot password?",
        "signin-btn": "Sign in",
        "no-account": "Don't have an account?",
        "signup": "Sign up",

        // Repository Connect Page
        "connectRepository": "Connect Repository",
        "project": "Project",
        "loadingProjects": "Loading projects...",
        "selectProject": "Select Project",
        "noProjects": "No Projects Available",
        "name": "Name",
        "repositoryUrl": "Repository URL",
        "repositoryType": "Repository Type",
        "username": "Username",
        "accessToken": "Access Token",
        "branch": "Branch",
        "framework": "Framework",
        "testsDirectory": "Tests Directory",
        "connect": "Connect",
        "back": "Back",
        "failedToLoadProjects": "Failed to load projects",
        "errorLoadingProjects": "Error loading projects",
        "failedToConnectRepository": "Failed to connect repository",
        "github": "GitHub",
        "gitlab": "GitLab",
        "bitbucket": "Bitbucket",
        "pytest": "PyTest",
        "unittest": "UnitTest",
        "robot": "Robot Framework",
        "playwright": "Playwright",

        // Settings Page
        "settings": "Settings",
        "back-to-home": "Back to Home",
        "themePreferences": "Theme Preferences",
        "light": "Light",
        "dark": "Dark",
        "system": "System",
        "language": "Language",
        "english": "English",
        "russian": "Russian",
        "german": "German",
        "manageRoles": "Manage Roles",
        "administrator": "Administrator",
        "adminDesc": "Full access to all settings and features",
        "manager": "Manager",
        "managerDesc": "Can manage team and view reports",
        "user": "User",
        "userDesc": "Basic access to platform features",
        "testAutomation": "Test Automation",
        "testRepository": "Test Repository",
        "connectRepository": "Connect Repository",
        "testRepositoryDesc": "Connect your repository with automated tests",
        "automationProjects": "Automation Projects",
        "automationProjectsDesc": "View and manage your test automation projects",
        "viewProjects": "View Projects",
        "languageChangeSuccess": "Language changed successfully",
        "languageChangeError": "Error changing language",
        "loadingTranslationsError": "Error loading translations",

        // Analytics
        "failedToLoadAnalytics": "Failed to load analytics data",
        "testCasesByStatus": "Test Cases by Status",
        "userActivity": "User Activity",
        "dailyTrends": "Daily Trends",
        "projectStats": "Project Statistics",
        "priorityDistribution": "Priority Distribution",
        "executionTimeStats": "Execution Time Statistics",
        "createdTests": "Created Tests",
        "passedTests": "Passed Tests",
        "failedTests": "Failed Tests",
        "totalTests": "Total Tests",
        "invalidDataFormat": "Invalid data format received from server",

        // Profile
        "profile": "Profile",
        "profileSettings": "Profile Settings",
        "firstName": "First Name",
        "lastName": "Last Name",
        "middleName": "Middle Name",
        "nickname": "Nickname",
        "email": "Email",
        "currentPassword": "Current Password",
        "newPassword": "New Password",
        "maxFileSize": "Max file size: 5MB",
        "allowedFormats": "Allowed formats: JPG, PNG",
        "enterFirstName": "Enter first name",
        "enterLastName": "Enter last name",
        "enterMiddleName": "Enter middle name",
        "enterNickname": "Enter nickname",
        "enterEmail": "Enter email",
        "enterPassword": "Enter current password",
        "enterNewPassword": "Enter new password",
        "saveChanges": "Save Changes",
        "cancel": "Cancel",
        "back": "Back",
        "passwordRequirements": "Password requirements:",
        "passwordStrength": "Password strength",
        "confirmPassword": "Confirm password",
        "passwordMustContain": "Password must contain:",
        "minLength": "Min 8 characters",
        "upperCase": "Upper case letter",
        "lowerCase": "Lower case letter",
        "number": "Number",
        "specialChar": "Special character",
        "passwordWeak": "Weak",
        "passwordMedium": "Medium",
        "passwordStrong": "Strong",
        "passwordsDoNotMatch": "Passwords do not match",
        "changePassword": "Change password",
        "Profile Settings": "Profile Settings",
        "First Name": "First Name",
        "Last Name": "Last Name",
        "Email": "Email",
        "Bio": "Bio",
        "New Password": "New Password",
        "Save Changes": "Save Changes",
        "Cancel": "Cancel",
        "Allowed formats: JPG, PNG, GIF": "Allowed formats: JPG, PNG, GIF",
        "Error updating profile": "Error updating profile",
        "Error fetching user data": "Error fetching user data",

        // Top Contributors
        "topContributors": "Top Contributors",
        "unknownUser": "Unknown User",
        "noContributorsYet": "No contributors yet",
        "test": "test",
        "tests": "tests",

        // Flaky Tests
        "testFlakiness": "Flaky Tests",
        "flakinessRate": "Flakiness Rate",
        "flakinessPercentage": "Flakiness Percentage",
        "statusChanges": "Status Changes",
        "topFlakyTests": "Top Flaky Tests",
        
        // Report Templates
        "reportDesigner": "Report Designer",
        "viewTemplates": "View Templates",
        "createNewTemplate": "Create New Template",
        "sortNewest": "Newest First",
        "selectProjectFirst": "Select a project to display templates",
        "noTemplatesFound": "No templates found",
        "loadingTemplates": "Loading templates...",

        // Types of tests
        "testTypeValues": {
            "manual": "Manual",
            "automated": "Automated",
            "api": "API",
            "performance": "Performance"
        },
        
        // Test case details
        "test": "Test",
        "created": "Created",
        "updated": "Updated",
        "author": "Author",
        "overview": "Overview",
        "code": "Code",
        "steps": "Steps",
        "runs": "Runs",
        "description": "Description",
        "tags": "Tags",
        "noTagsAdded": "No tags added",
        "addTag": "Add tag",
        "details": "Details",
        "platform": "Platform",
        "priority": "Priority",
        "estimatedTime": "Estimated Time (minutes)",
        "testType": "Test Type",
        "runTest": "Run Test",
        "testSteps": "Test Steps",
        "noStepsDefined": "No steps defined for this test case",
        "testRuns": "Test Runs",
        "noRecentRuns": "No recent test runs",
        "testCode": "Test Code",
        "platformLabel": "Platform",
        "priorityLabel": "Priority",
        "estimatedTimeLabel": "Estimated Time (minutes)",
        "testTypeLabel": "Test Type",
        "detailsLabel": "Details",
    },
    de: {
        // Allgemein
        "settings": "Einstellungen",
        "back": "Zurück",
        "save": "Speichern",
        "cancel": "Abbrechen",
        "delete": "Löschen",
        "edit": "Bearbeiten",
        "create": "Erstellen",
        "search": "Suche",
        
        // Kalender
        "event_calendar": "Ereigniskalender",
        "sunday_short": "So",
        "monday_short": "Mo",
        "tuesday_short": "Di",
        "wednesday_short": "Mi",
        "thursday_short": "Do",
        "friday_short": "Fr",
        "saturday_short": "Sa",
        "add_event": "Ereignis hinzufügen",
        "selected_date": "Ausgewähltes Datum:",
        "no_date_selected": "Kein Datum ausgewählt",
        "title": "Titel",
        "enter_event_title": "Ereignistitel eingeben",
        "time": "Zeit",
        "reminder": "Erinnerung",
        "test_run": "Testlauf",
        "enter_event_description": "Ereignisbeschreibung eingeben",
        
        // Filter und Sortierung
        "filters_and_sorting": "Filter & Sortierung",
        "filters": "Filter",
        "sorting": "Sortierung",
        "search_folders_and_tests": "Ordner und Testfälle durchsuchen...",
        "search_results": "Ergebnisse gefunden",
        "ascending": "Aufsteigend",
        "descending": "Absteigend",
        "folder_type": "Ordnertyp",
        "all_folders": "Alle Ordner",
        "root_folders": "Stammordner",
        "subfolders": "Unterordner",
        "empty_folders": "Leere Ordner",
        "with_tests": "Mit Tests",
        "created_by": "Erstellt von",
        "all_users": "Alle Benutzer",
        "me": "Mir",
        "date_created": "Erstelldatum",
        "all_time": "Gesamter Zeitraum",
        "name": "Name",
        "date": "Datum",
        "name_az": "A-Z",
        "name_za": "Z-A",
        "date_oldest": "Älteste zuerst",
        "date_newest": "Neueste zuerst",
        "reset": "Zurücksetzen",
        "apply": "Anwenden",
        "all_statuses": "Alle Status",
        "active": "Aktiv",
        "archived": "Archiviert",
        "from_last_month": "vom letzten Monat",
        "reports": "Berichte",
        "dashboard": "Dashboard",
        "companyLogo": "Firmenlogo",
        "events": "Ereignisse",
        "testRuns": "Testläufe",
        "allProjects": "Alle Projekte",
        "view_all_notifications": "Alle Benachrichtigungen",
        "failedTests": "Fehlgeschlagene Tests",
        "executionTime": "Ausführungszeit",
        "categoryStatistics": "Kategoriestatistik",
        "testCases": "Testfälle",
        "create_root_folder": "Erstelle Root-Ordner",
        "select_test_case": "Wähle Testfall",
        "reportTemplates": "Berichtsvorlagen",
        "createTemplate": "Vorlage erstellen",
        "createReportTemplate": "Berichtsvorlage erstellen",
        "templateName": "Vorlagenname",
        "templateDescription": "Vorlagenbeschreibung",
        "sections": "Abschnitte",
        "summarySection": "Zusammenfassung",
        "testsSection": "Tests",
        "chartsSection": "Diagramme",

        // Diagramme
        "successRate": "Erfolgsrate",
        "passed": "Bestanden",
        "failed": "Fehlgeschlagen",
        "skipped": "Übersprungen",
        "testsOverTime": "Tests über Zeit",
        "resultsDistribution": "Ergebnisverteilung",
        "avgExecutionTime": "Durchschnittliche Ausführungszeit",
        "successRateOverTime": "Erfolgsrate über Zeit",
        "avgExecutionTimeOverTime": "Ausführungszeit über Zeit",
        "testCaseCreation": "Testfall-Erstellung",
        "topContributors": "Top-Mitwirkende",
        "tests": "Tests",
        "secondsShort": "s",
        "testsExecutedPerDay": "Tests pro Tag",
        "numberOfTests": "Anzahl der Tests",

        // Prioritäten
        "priorityValues": {
            "high": "Hoch",
            "medium": "Mittel",
            "low": "Niedrig"
        },
        
        // Plattformen
        "platformValues": {
            "web": "Web",
            "mobile": "Mobil",
            "desktop": "Desktop",
            "api": "API",
            "any": "Beliebig"
        },

        // Ergebnisdiagramm
        "resultsPassed": "Bestanden",
        "resultsFailed": "Fehlgeschlagen",
        "resultsSkipped": "Übersprungen",

        // Testerstellungsdiagramm
        "dailyTestsCreated": "Täglich erstellte Tests",
        "totalTests": "Gesamtanzahl Tests",

        // Menü
        "profile": "Profil",
        "settings": "Einstellungen",
        "logout": "Abmelden",
        "projects": "Projekte",
        "testCases": "Testfälle",
        "reports": "Berichte",

        // Auth
        "login": "Anmelden",
        "username": "Benutzername",
        "password": "Passwort",
        "loginButton": "Anmelden",
        "rememberMe": "Angemeldet bleiben",
        "username-placeholder": "Benutzername eingeben",
        "password-placeholder": "Passwort eingeben",

        // Добавим недостающие
        "notifications": "Benachrichtigungen",
        "view_all": "Alle anzeigen",
        "no_notifications": "Keine neuen Benachrichtigungen",
        "menu": {
            "profile": "Profil",
            "settings": "Einstellungen",
            "logout": "Abmelden"
        },

        // Dashboard
        "dashboard": "Dashboard",
        "companyLogo": "Firmenlogo",
        "events": "Ereignisse",
        "testRuns": "Testläufe",
        "allProjects": "Alle Projekte",
        "view_all_notifications": "Alle Benachrichtigungen",
        "failedTests": "Fehlgeschlagene Tests",
        "executionTime": "Ausführungszeit",
        "categoryStatistics": "Kategoriestatistik",

        // Kategorien und Statistik
        "category": "Kategorie",
        "totalTests": "Gesamtanzahl Tests",
        "failureRate": "Fehlerquote",
        "avgDuration": "Durchschnittliche Dauer",
        "functional": "Funktionale",
        "nonFunctional": "Nicht-funktionale",
        "integration": "Integrations-",
        "security": "Sicherheit",

        // Projekte
        "createNewProject": "Neues Projekt erstellen",
        "projectName": "Projektname",
        "description": "Beschreibung",
        "selectProject": "Projekt auswählen",
        "noProjects": "Keine Projekte verfügbar",
        "enterProjectName": "Projektname eingeben",
        "enterProjectDescription": "Projektbeschreibung eingeben",
        "projectCreated": "Projekt erfolgreich erstellt",
        "projectCreationError": "Fehler beim Erstellen des Projekts",

        // Login
        "light": "Hell",
        "dark": "Dunkel",
        "system": "System",
        "welcome": "Willkommen zurück",
        "signin-msg": "Melden Sie sich bei Ihrem Konto an",
        "remember": "Angemeldet bleiben",
        "forgot": "Passwort vergessen?",
        "signin-btn": "Anmelden",
        "no-account": "Noch kein Konto?",
        "signup": "Registrieren",

        // Repository Connect Page
        "connectRepository": "Repository verbinden",
        "project": "Projekt",
        "loadingProjects": "Projekte werden geladen...",
        "selectProject": "Projekt auswählen",
        "noProjects": "Keine Projekte verfügbar",
        "name": "Name",
        "repositoryUrl": "Repository-URL",
        "repositoryType": "Repository-Typ",
        "username": "Benutzername",
        "accessToken": "Zugriffstoken",
        "branch": "Branch",
        "framework": "Framework",
        "testsDirectory": "Test-Verzeichnis",
        "connect": "Verbinden",
        "back": "Zurück",
        "failedToLoadProjects": "Projekte konnten nicht geladen werden",
        "errorLoadingProjects": "Fehler beim Laden der Projekte",
        "failedToConnectRepository": "Repository konnte nicht verbunden werden",
        "github": "GitHub",
        "gitlab": "GitLab",
        "bitbucket": "Bitbucket",
        "pytest": "PyTest",
        "unittest": "UnitTest",
        "robot": "Robot Framework",
        "playwright": "Playwright",

        // Settings Page
        "settings": "Einstellungen",
        "back-to-home": "Zurück zur Startseite",
        "themePreferences": "Theme-Einstellungen",
        "light": "Hell",
        "dark": "Dunkel",
        "system": "System",
        "language": "Sprache",
        "english": "Englisch",
        "russian": "Russisch",
        "german": "Deutsch",
        "manageRoles": "Rollen verwalten",
        "administrator": "Administrator",
        "adminDesc": "Vollzugriff auf alle Einstellungen und Funktionen",
        "manager": "Manager",
        "managerDesc": "Kann Team verwalten und Berichte einsehen",
        "user": "Benutzer",
        "userDesc": "Basiszugriff auf Plattformfunktionen",
        "testAutomation": "Testautomatisierung",
        "testRepository": "Test-Repository",
        "connectRepository": "Repository verbinden",
        "testRepositoryDesc": "Verbinden Sie Ihr Repository mit automatisierten Tests",
        "automationProjects": "Automatisierungsprojekte",
        "automationProjectsDesc": "Anzeigen und Verwalten von Testautomatisierungsprojekten",
        "viewProjects": "Projekte anzeigen",
        "languageChangeSuccess": "Sprache erfolgreich geändert",
        "languageChangeError": "Fehler beim Ändern der Sprache",
        "loadingTranslationsError": "Fehler beim Laden der Übersetzungen",

        // Profilseite
        "profile": "Profil",
        "profileSettings": "Profileinstellungen",
        "firstName": "Vorname",
        "lastName": "Nachname",
        "middleName": "Zweiter Vorname",
        "nickname": "Spitzname",
        "email": "E-Mail-Adresse",
        "currentPassword": "Aktuelles Passwort",
        "newPassword": "Neues Passwort",
        "maxFileSize": "Maximale Dateigröße: 5MB",
        "allowedFormats": "Erlaubte Formate: JPG, PNG",
        "enterFirstName": "Vorname eingeben",
        "enterLastName": "Nachname eingeben",
        "enterMiddleName": "Zweiten Vornamen eingeben",
        "enterNickname": "Spitznamen eingeben",
        "enterEmail": "E-Mail-Adresse eingeben",
        "enterPassword": "Aktuelles Passwort eingeben",
        "enterNewPassword": "Neues Passwort eingeben",
        "saveChanges": "Änderungen speichern",
        "cancel": "Abbrechen",
        "back": "Zurück",

        // Passwörter und Sicherheit
        "passwordRequirements": "Passwortanforderungen:",
        "passwordStrength": "Passwortstärke",
        "confirmPassword": "Passwort bestätigen",
        "passwordMustContain": "Das Passwort muss enthalten:",
        "minLength": "Mindestens 8 Zeichen",
        "upperCase": "Einen Großbuchstaben",
        "lowerCase": "Einen Kleinbuchstaben",
        "number": "Eine Zahl",
        "specialChar": "Ein Sonderzeichen",
        "passwordWeak": "Schwach",
        "passwordMedium": "Mittel",
        "passwordStrong": "Stark",
        "passwordsDoNotMatch": "Passwörter stimmen nicht überein",
        "changePassword": "Passwort ändern",

        // Profileinstellungen
        "Profile Settings": "Profileinstellungen",
        "First Name": "First Name",
        "Last Name": "Last Name",
        "Email": "Email",
        "Bio": "Bio",
        "New Password": "New Password",
        "Save Changes": "Save Changes",
        "Cancel": "Cancel",
        "Allowed formats: JPG, PNG, GIF": "Allowed formats: JPG, PNG, GIF",
        "Error updating profile": "Error updating profile",
        "Error fetching user data": "Error fetching user data",

        // Top Contributors
        "topContributors": "Top-Mitwirkende",
        "unknownUser": "Unbekannter Benutzer",
        "noContributorsYet": "Noch keine Mitwirkenden",
        "test": "Test",
        "tests": "Tests",
        
        // Report Templates
        "reportDesigner": "Report-Designer",
        "viewTemplates": "Vorlagen anzeigen",
        "createNewTemplate": "Neue Vorlage erstellen",
        "sortNewest": "Neueste zuerst",
        "selectProjectFirst": "Wählen Sie ein Projekt aus, um Vorlagen anzuzeigen",
        "noTemplatesFound": "Keine Vorlagen gefunden",
        "loadingTemplates": "Vorlagen werden geladen...",

        // Typen von Tests
        "testTypeValues": {
            "manual": "Manuell",
            "automated": "Automatisiert",
            "api": "API",
            "performance": "Leistung"
        },
        
        // Testfall Details
        "test": "Test",
        "created": "Erstellt",
        "updated": "Aktualisiert",
        "author": "Autor",
        "overview": "Überblick",
        "code": "Code",
        "steps": "Schritte",
        "runs": "Durchläufe",
        "description": "Beschreibung",
        "tags": "Tags",
        "noTagsAdded": "Keine Tags hinzugefügt",
        "addTag": "Tag hinzufügen",
        "details": "Details",
        "platform": "Plattform",
        "priority": "Priorität",
        "estimatedTime": "Geschätzte Zeit (Minuten)",
        "testType": "Testtyp",
        "runTest": "Test starten",
        "testSteps": "Test-Schritte",
        "noStepsDefined": "Keine Schritte für diesen Testfall definiert",
        "testRuns": "Testausführungen",
        "noRecentRuns": "Keine kürzlichen Testausführungen",
        "testCode": "Test-Code",
        "platformLabel": "Plattform",
        "priorityLabel": "Priorität",
        "estimatedTimeLabel": "Geschätzte Zeit (Minuten)",
        "testTypeLabel": "Testtyp",
        "detailsLabel": "Details",
    }
};

// Текущий язык
let currentLanguage = localStorage.getItem('language') || 'en';

// Функция перевода
function t(key) {
    // Используем i18n.currentLanguage если i18n определен, иначе используем локальную переменную
    const lang = (typeof i18n !== 'undefined') ? i18n.currentLanguage : currentLanguage;
    
    // Проверяем, есть ли точка в ключе (вложенный ключ)
    if (key.includes('.')) {
        const parts = key.split('.');
        let result = translations[lang];
        
        // Переходим по вложенным ключам
        for (const part of parts) {
            if (result && typeof result === 'object' && part in result) {
                result = result[part];
            } else {
                // Если ключ не найден, возвращаем исходный ключ
                return key;
            }
        }
        return result || key;
    }
    
    // Обычный случай для простых ключей
    const translation = translations[lang]?.[key];
    return translation || key;
}

// Функция смены языка
function setLanguage(lang) {
    if (translations[lang]) {
        currentLanguage = lang;
        if (typeof i18n !== 'undefined') {
            i18n.currentLanguage = lang;
            i18n.init();
        } else {
            localStorage.setItem('language', lang);
            updateTranslations();
        }
        return true;
    }
    return false;
}

// Функция обновления всех переводов на странице
function updateTranslations() {
    const elements = document.querySelectorAll('[data-i18n]');
    elements.forEach(element => {
        const key = element.getAttribute('data-i18n');
        if (key) {
            element.textContent = t(key);
        }
    });
}

// Попытка загрузить дополнительные переводы из файлов locales/*.json
async function loadExternalTranslations() {
    try {
        console.log('Loading additional translations from locales files...');
        
        // Загружаем переводы для всех поддерживаемых языков
        const langs = ['en', 'ru', 'de'];
        
        await Promise.all(langs.map(async (lang) => {
            try {
                const response = await fetch(`/locales/${lang}.json`);
                if (response.ok) {
                    const data = await response.json();
                    
                    // Объединяем с существующими переводами
                    if (!translations[lang]) {
                        translations[lang] = {};
                    }
                    
                    Object.assign(translations[lang], data);
                    console.log(`Loaded translations for ${lang}`);
                } else {
                    console.warn(`Failed to load translations for ${lang}`);
                }
            } catch (err) {
                console.error(`Error loading translations for ${lang}:`, err);
            }
        }));
        
        // Установка флага, что переводы загружены
        window.translationsLoaded = true;
        
        // Отправляем событие о загрузке переводов
        const event = new CustomEvent('translations:loaded');
        document.dispatchEvent(event);
        
        console.log('All translations loaded');
    } catch (error) {
        console.error('Failed to load external translations:', error);
    }
}

// Make functions globally available
window.translations = translations;
window.t = t;

// Запускаем загрузку дополнительных переводов
loadExternalTranslations();
window.setLanguage = setLanguage;
window.updateTranslations = updateTranslations;

// Initialize translations when the page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('Initializing translations');
    updateTranslations();
});
