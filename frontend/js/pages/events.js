// Events page functionality
import i18n from '../i18n/i18n.js';
import ApiClient from '../api/client.js';
import { ToastManager } from '../utils/toast.js';

document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const createEventBtn = document.getElementById('create-event-btn');
    const eventModal = document.getElementById('create-event-modal');
    const eventDetailsModal = document.getElementById('event-details-modal');
    const cancelEventBtn = document.getElementById('cancel-event-btn');
    const closeDetailsBtn = document.getElementById('close-details-btn');
    const editEventBtn = document.getElementById('edit-event-btn');
    const eventForm = document.getElementById('event-form');
    const calendarGrid = document.getElementById('calendar-grid');
    const currentMonthElement = document.getElementById('current-month');
    const prevMonthBtn = document.getElementById('prev-month');
    const nextMonthBtn = document.getElementById('next-month');
    const todayBtn = document.getElementById('today-btn');
    const eventTypeSelect = document.getElementById('event-type');
    const testCasesSection = document.getElementById('test-cases-section');
    const testCasesList = document.getElementById('test-cases-list');
    const repeatEventCheckbox = document.getElementById('repeat-event');
    const repeatOptions = document.getElementById('repeat-options');
    const repeatInterval = document.getElementById('repeat-interval');
    const repeatUnit = document.getElementById('repeat-unit');
    const repeatEndDate = document.getElementById('repeat-end-date');
    const repeatPreview = document.getElementById('repeat-preview');

    let currentDate = new Date();
    let events = [];
    let testCases = [];
    let selectedEvent = null;

    // Month names in Russian
    const monthNames = [
        'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
        'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
    ];

    // Initialize
    init();

    async function init() {
        await loadEvents();
        await loadTestCases();
        renderCalendar();
        setupEventListeners();
        setMaxRepeatEndDate();
    }

    function setupEventListeners() {
        createEventBtn?.addEventListener('click', showEventModal);
        cancelEventBtn?.addEventListener('click', hideEventModal);
        closeDetailsBtn?.addEventListener('click', hideEventDetailsModal);
        editEventBtn?.addEventListener('click', editEvent);
        eventForm?.addEventListener('submit', handleEventSubmit);
        prevMonthBtn?.addEventListener('click', () => changeMonth(-1));
        nextMonthBtn?.addEventListener('click', () => changeMonth(1));
        todayBtn?.addEventListener('click', goToToday);
        eventTypeSelect?.addEventListener('change', handleEventTypeChange);
        repeatEventCheckbox?.addEventListener('change', handleRepeatToggle);
        
        // Add event listeners for repeat settings
        [repeatInterval, repeatUnit, repeatEndDate].forEach(element => {
            element?.addEventListener('change', updateRepeatPreview);
        });

        // Close modals when clicking outside
        eventModal?.addEventListener('click', (e) => {
            if (e.target === eventModal) hideEventModal();
        });
        
        eventDetailsModal?.addEventListener('click', (e) => {
            if (e.target === eventDetailsModal) hideEventDetailsModal();
        });
    }

    async function loadEvents() {
        try {
            // For now, use mock data. Replace with actual API call
            events = [
                {
                    id: 1,
                    name: 'Регрессионное тестирование',
                    type: 'test-run',
                    date: '2025-01-15',
                    time: '10:00',
                    description: 'Еженедельное регрессионное тестирование',
                    testCases: [1, 2, 3],
                    repeat: {
                        enabled: true,
                        interval: 1,
                        unit: 'weeks',
                        endDate: '2025-12-31'
                    }
                },
                {
                    id: 2,
                    name: 'Планерка команды',
                    type: 'simple',
                    date: '2025-01-20',
                    time: '09:00',
                    description: 'Еженедельная планерка команды разработки'
                }
            ];
        } catch (error) {
            console.error('Failed to load events:', error);
            ToastManager.error('Не удалось загрузить события');
        }
    }

    async function loadTestCases() {
        try {
            // For now, use mock data. Replace with actual API call
            testCases = [
                { id: 1, name: 'Тест авторизации', folder: 'Auth' },
                { id: 2, name: 'Тест создания пользователя', folder: 'Users' },
                { id: 3, name: 'Тест API endpoints', folder: 'API' },
                { id: 4, name: 'Тест UI компонентов', folder: 'UI' },
                { id: 5, name: 'Тест производительности', folder: 'Performance' }
            ];
            renderTestCasesList();
        } catch (error) {
            console.error('Failed to load test cases:', error);
            ToastManager.error('Не удалось загрузить тест-кейсы');
        }
    }

    function renderTestCasesList() {
        if (!testCasesList) return;
        
        testCasesList.innerHTML = testCases.map(testCase => `
            <label class="flex items-center space-x-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-600 rounded">
                <input type="checkbox" name="testCases" value="${testCase.id}" class="rounded border-gray-300 dark:border-gray-600 text-coral-500 focus:ring-coral-500">
                <span class="text-sm text-gray-700 dark:text-gray-300">
                    <span class="text-gray-500 dark:text-gray-400">${testCase.folder}/</span>${testCase.name}
                </span>
            </label>
        `).join('');
    }

    function renderCalendar() {
        if (!calendarGrid || !currentMonthElement) return;

        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        
        // Update month display
        currentMonthElement.textContent = `${monthNames[month]} ${year}`;

        // Get first day of month and number of days
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        
        // Get first day of week (Monday = 0)
        let startDay = firstDay.getDay() - 1;
        if (startDay < 0) startDay = 6;

        // Get days from previous month
        const prevMonth = new Date(year, month - 1, 0);
        const daysInPrevMonth = prevMonth.getDate();

        // Clear calendar
        calendarGrid.innerHTML = '';

        // Add days from previous month
        for (let i = startDay - 1; i >= 0; i--) {
            const day = daysInPrevMonth - i;
            const dayElement = createDayElement(day, true, new Date(year, month - 1, day));
            calendarGrid.appendChild(dayElement);
        }

        // Add days of current month
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const dayElement = createDayElement(day, false, date);
            calendarGrid.appendChild(dayElement);
        }

        // Add days from next month to fill the grid
        const totalCells = calendarGrid.children.length;
        const remainingCells = 42 - totalCells; // 6 weeks * 7 days
        
        for (let day = 1; day <= remainingCells; day++) {
            const dayElement = createDayElement(day, true, new Date(year, month + 1, day));
            calendarGrid.appendChild(dayElement);
        }
    }

    function createDayElement(day, isOtherMonth, date) {
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-2';
        
        if (isOtherMonth) {
            dayElement.classList.add('other-month');
        }
        
        // Check if it's today
        const today = new Date();
        if (date.toDateString() === today.toDateString()) {
            dayElement.classList.add('today');
        }
        
        // Check if it's weekend
        const dayOfWeek = date.getDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) {
            dayElement.classList.add('weekend');
        }
        
        // Add day number
        const dayNumber = document.createElement('div');
        dayNumber.className = 'text-sm font-medium text-gray-900 dark:text-gray-100';
        dayNumber.textContent = day;
        dayElement.appendChild(dayNumber);
        
        // Add event indicators
        const dayEvents = getEventsForDate(date);
        if (dayEvents.length > 0) {
            const indicators = document.createElement('div');
            indicators.className = 'event-indicators';
            
            dayEvents.slice(0, 6).forEach(event => {
                const indicator = document.createElement('div');
                indicator.className = `event-indicator ${event.type}`;
                indicator.title = event.name;
                indicators.appendChild(indicator);
            });
            
            if (dayEvents.length > 6) {
                const moreIndicator = document.createElement('div');
                moreIndicator.className = 'text-xs text-gray-500 dark:text-gray-400 ml-1';
                moreIndicator.textContent = `+${dayEvents.length - 6}`;
                indicators.appendChild(moreIndicator);
            }
            
            dayElement.appendChild(indicators);
        }
        
        // Add click handler
        dayElement.addEventListener('click', () => {
            if (dayEvents.length > 0) {
                showDayEvents(date, dayEvents);
            } else {
                showEventModal(date);
            }
        });
        
        return dayElement;
    }

    function getEventsForDate(date) {
        const dateString = date.toISOString().split('T')[0];
        return events.filter(event => {
            if (event.date === dateString) {
                return true;
            }
            
            // Check for repeated events
            if (event.repeat && event.repeat.enabled) {
                return isRepeatedEventOnDate(event, date);
            }
            
            return false;
        });
    }

    function isRepeatedEventOnDate(event, targetDate) {
        const eventDate = new Date(event.date);
        const endDate = event.repeat.endDate ? new Date(event.repeat.endDate) : new Date(eventDate.getFullYear() + 3, eventDate.getMonth(), eventDate.getDate());
        
        if (targetDate < eventDate || targetDate > endDate) {
            return false;
        }
        
        const interval = event.repeat.interval;
        const unit = event.repeat.unit;
        
        const diffTime = targetDate.getTime() - eventDate.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        switch (unit) {
            case 'days':
                return diffDays % interval === 0;
            case 'weeks':
                return diffDays % (interval * 7) === 0;
            case 'months':
                const monthsDiff = (targetDate.getFullYear() - eventDate.getFullYear()) * 12 + (targetDate.getMonth() - eventDate.getMonth());
                return monthsDiff % interval === 0 && targetDate.getDate() === eventDate.getDate();
            case 'years':
                const yearsDiff = targetDate.getFullYear() - eventDate.getFullYear();
                return yearsDiff % interval === 0 && 
                       targetDate.getMonth() === eventDate.getMonth() && 
                       targetDate.getDate() === eventDate.getDate();
            default:
                return false;
        }
    }

    function showDayEvents(date, dayEvents) {
        const modal = eventDetailsModal;
        const title = document.getElementById('event-details-title');
        const content = document.getElementById('event-details-content');
        
        if (!modal || !title || !content) return;
        
        const dateString = date.toLocaleDateString('ru-RU', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        
        title.textContent = `События на ${dateString}`;
        
        content.innerHTML = dayEvents.map(event => `
            <div class="border border-gray-200 dark:border-gray-600 rounded-lg p-3 mb-3 last:mb-0">
                <div class="flex items-center justify-between mb-2">
                    <h4 class="font-medium text-gray-900 dark:text-gray-100">${event.name}</h4>
                    <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        event.type === 'simple' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' :
                        'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                    }">
                        ${event.type === 'simple' ? 'Простое событие' : 'Запуск тестов'}
                    </span>
                </div>
                <div class="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    <i class="ri-time-line mr-1"></i> ${event.time}
                </div>
                ${event.description ? `<p class="text-sm text-gray-700 dark:text-gray-300">${event.description}</p>` : ''}
                ${event.type === 'test-run' && event.testCases ? `
                    <div class="mt-2">
                        <span class="text-xs text-gray-500 dark:text-gray-400">Тест-кейсы: ${event.testCases.length}</span>
                    </div>
                ` : ''}
            </div>
        `).join('');
        
        modal.classList.remove('hidden');
    }

    function changeMonth(direction) {
        currentDate.setMonth(currentDate.getMonth() + direction);
        renderCalendar();
    }

    function goToToday() {
        currentDate = new Date();
        renderCalendar();
    }

    function showEventModal(selectedDate = null) {
        if (!eventModal) return;
        
        // Reset form
        eventForm?.reset();
        selectedEvent = null;
        
        // Set date if provided
        if (selectedDate) {
            const dateInput = document.getElementById('event-date');
            if (dateInput) {
                dateInput.value = selectedDate.toISOString().split('T')[0];
            }
        }
        
        // Hide test cases section initially
        if (testCasesSection) {
            testCasesSection.classList.add('hidden');
        }
        
        // Hide repeat options initially
        if (repeatOptions) {
            repeatOptions.classList.add('hidden');
        }
        
        eventModal.classList.remove('hidden');
    }

    function hideEventModal() {
        if (!eventModal) return;
        eventModal.classList.add('hidden');
    }

    function hideEventDetailsModal() {
        if (!eventDetailsModal) return;
        eventDetailsModal.classList.add('hidden');
    }

    function editEvent() {
        // Implementation for editing events
        hideEventDetailsModal();
        showEventModal();
    }

    function handleEventTypeChange() {
        if (!eventTypeSelect || !testCasesSection) return;
        
        if (eventTypeSelect.value === 'test-run') {
            testCasesSection.classList.remove('hidden');
        } else {
            testCasesSection.classList.add('hidden');
        }
    }

    function handleRepeatToggle() {
        if (!repeatEventCheckbox || !repeatOptions) return;
        
        if (repeatEventCheckbox.checked) {
            repeatOptions.classList.remove('hidden');
            updateRepeatPreview();
        } else {
            repeatOptions.classList.add('hidden');
        }
    }

    function updateRepeatPreview() {
        if (!repeatPreview || !repeatInterval || !repeatUnit) return;
        
        const interval = parseInt(repeatInterval.value) || 1;
        const unit = repeatUnit.value;
        const endDate = repeatEndDate?.value;
        
        let unitText = '';
        switch (unit) {
            case 'days':
                unitText = interval === 1 ? 'день' : interval < 5 ? 'дня' : 'дней';
                break;
            case 'weeks':
                unitText = interval === 1 ? 'неделю' : interval < 5 ? 'недели' : 'недель';
                break;
            case 'months':
                unitText = interval === 1 ? 'месяц' : interval < 5 ? 'месяца' : 'месяцев';
                break;
            case 'years':
                unitText = interval === 1 ? 'год' : interval < 5 ? 'года' : 'лет';
                break;
        }
        
        let previewText = `Повторять каждые ${interval} ${unitText}`;
        
        if (endDate) {
            const endDateObj = new Date(endDate);
            const endDateString = endDateObj.toLocaleDateString('ru-RU');
            previewText += ` до ${endDateString}`;
        }
        
        repeatPreview.textContent = previewText;
    }

    function setMaxRepeatEndDate() {
        if (!repeatEndDate) return;
        
        const maxDate = new Date();
        maxDate.setFullYear(maxDate.getFullYear() + 3);
        repeatEndDate.max = maxDate.toISOString().split('T')[0];
    }

    async function handleEventSubmit(e) {
        e.preventDefault();
        
        const formData = new FormData(eventForm);
        const eventData = {
            name: formData.get('name'),
            type: formData.get('type'),
            date: formData.get('date'),
            time: formData.get('time'),
            description: formData.get('description')
        };
        
        // Add test cases if it's a test-run event
        if (eventData.type === 'test-run') {
            const selectedTestCases = Array.from(document.querySelectorAll('input[name="testCases"]:checked'))
                .map(checkbox => parseInt(checkbox.value));
            eventData.testCases = selectedTestCases;
        }
        
        // Add repeat settings if enabled
        if (repeatEventCheckbox?.checked) {
            eventData.repeat = {
                enabled: true,
                interval: parseInt(repeatInterval?.value) || 1,
                unit: repeatUnit?.value || 'days',
                endDate: repeatEndDate?.value || null
            };
        }
        
        try {
            // For now, just add to local events array
            // Replace with actual API call
            const newEvent = {
                id: events.length + 1,
                ...eventData
            };
            
            events.push(newEvent);
            
            ToastManager.success('Событие успешно создано');
            hideEventModal();
            renderCalendar();
        } catch (error) {
            console.error('Failed to create event:', error);
            ToastManager.error('Не удалось создать событие');
        }
    }
});