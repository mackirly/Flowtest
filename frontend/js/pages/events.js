import ToastManager from '../utils/toast.js';
import i18n from '../i18n/i18n.js';
import ApiClient from '../api/client.js';

document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const createEventBtn = document.getElementById('create-event-btn');
    const createFirstEventBtn = document.getElementById('create-first-event-btn');
    const eventModal = document.getElementById('create-event-modal');
    const cancelEventBtn = document.getElementById('cancel-event-btn');
    const eventForm = document.getElementById('event-form');
    const searchInput = document.getElementById('search-events');
    const dateFilter = document.getElementById('date-filter');
    const eventsList = document.getElementById('events-list');
    const emptyState = document.getElementById('empty-state');
    const loadingState = document.getElementById('loading-state');

    let events = [];

    // Initialize
    loadEvents();

    // Event Listeners
    createEventBtn?.addEventListener('click', showEventModal);
    createFirstEventBtn?.addEventListener('click', showEventModal);
    cancelEventBtn?.addEventListener('click', hideEventModal);
    eventForm?.addEventListener('submit', handleEventSubmit);
    searchInput?.addEventListener('input', filterEvents);
    dateFilter?.addEventListener('change', filterEvents);

    // Functions
    async function loadEvents() {
        try {
            showLoading();
            const response = await ApiClient.get('/events/');
            events = response.data;
            renderEvents();
            hideLoading();
        } catch (error) {
            console.error('Failed to load events:', error);
            ToastManager.error(i18n.t('failedToLoadEvents'));
            hideLoading();
        }
    }

    function renderEvents() {
        if (!eventsList) return;

        if (events.length === 0) {
            showEmptyState();
            return;
        }

        hideEmptyState();
        eventsList.innerHTML = events.map(event => createEventElement(event)).join('');
    }

    function createEventElement(event) {
        return `
            <div class="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <div class="grid grid-cols-12 gap-4 items-center">
                    <div class="col-span-3">
                        <h4 class="font-medium text-gray-900 dark:text-gray-100">${event.name}</h4>
                    </div>
                    <div class="col-span-2 text-gray-500 dark:text-gray-400">
                        ${formatDate(event.date)}
                    </div>
                    <div class="col-span-2">
                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getEventTypeStyles(event.type)}">
                            ${getEventTypeLabel(event.type)}
                        </span>
                    </div>
                    <div class="col-span-3">
                        <div class="flex -space-x-2 overflow-hidden">
                            ${event.participants.map(p => `
                                <div class="inline-block h-8 w-8 rounded-full ring-2 ring-white dark:ring-gray-800 bg-coral-500 flex items-center justify-center text-white text-sm font-medium">
                                    ${getInitials(p.name)}
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    <div class="col-span-2">
                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getEventStatusStyles(event.status)}">
                            ${getEventStatusLabel(event.status)}
                        </span>
                    </div>
                </div>
            </div>
        `;
    }

    function getEventTypeStyles(type) {
        const styles = {
            meeting: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
            deadline: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
            review: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
            other: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
        };
        return styles[type] || styles.other;
    }

    function getEventStatusStyles(status) {
        const styles = {
            upcoming: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
            inProgress: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
            completed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
            cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
        };
        return styles[status] || styles.upcoming;
    }

    function getEventTypeLabel(type) {
        const labels = {
            meeting: 'Встреча',
            deadline: 'Дедлайн',
            review: 'Ревью',
            other: 'Другое'
        };
        return labels[type] || 'Другое';
    }

    function getEventStatusLabel(status) {
        const labels = {
            upcoming: 'Предстоит',
            inProgress: 'В процессе',
            completed: 'Завершено',
            cancelled: 'Отменено'
        };
        return labels[status] || 'Предстоит';
    }

    function getInitials(name) {
        return name.split(' ').map(n => n[0]).join('').toUpperCase();
    }

    function formatDate(date) {
        return new Date(date).toLocaleDateString();
    }

    function showEventModal() {
        eventModal?.classList.remove('hidden');
    }

    function hideEventModal() {
        eventModal?.classList.add('hidden');
        eventForm?.reset();
    }

    async function handleEventSubmit(e) {
        e.preventDefault();

        const formData = new FormData(e.target);
        const eventData = {
            name: formData.get('name'),
            type: formData.get('type'),
            date: formData.get('date'),
            time: formData.get('time'),
            description: formData.get('description'),
            participants: Array.from(formData.getAll('participants'))
        };

        try {
            const response = await ApiClient.post('/events/', eventData);
            events.push(response.data);
            renderEvents();
            hideEventModal();
            ToastManager.success(i18n.t('eventCreated'));
        } catch (error) {
            console.error('Failed to create event:', error);
            ToastManager.error(i18n.t('failedToCreateEvent'));
        }
    }

    function filterEvents() {
        const searchTerm = searchInput?.value.toLowerCase();
        const dateFilterValue = dateFilter?.value;

        let filteredEvents = events;

        if (searchTerm) {
            filteredEvents = filteredEvents.filter(event => 
                event.name.toLowerCase().includes(searchTerm) ||
                event.description?.toLowerCase().includes(searchTerm)
            );
        }

        if (dateFilterValue && dateFilterValue !== 'all') {
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            
            filteredEvents = filteredEvents.filter(event => {
                const eventDate = new Date(event.date);
                
                switch (dateFilterValue) {
                    case 'today':
                        return eventDate.toDateString() === today.toDateString();
                    case 'week':
                        const weekStart = new Date(today);
                        weekStart.setDate(today.getDate() - today.getDay());
                        const weekEnd = new Date(weekStart);
                        weekEnd.setDate(weekStart.getDate() + 6);
                        return eventDate >= weekStart && eventDate <= weekEnd;
                    case 'month':
                        return eventDate.getMonth() === today.getMonth() &&
                               eventDate.getFullYear() === today.getFullYear();
                    default:
                        return true;
                }
            });
        }

        renderFilteredEvents(filteredEvents);
    }

    function renderFilteredEvents(filteredEvents) {
        if (!eventsList) return;

        if (filteredEvents.length === 0) {
            showEmptyState();
            return;
        }

        hideEmptyState();
        eventsList.innerHTML = filteredEvents.map(event => createEventElement(event)).join('');
    }

    function showEmptyState() {
        emptyState?.classList.remove('hidden');
        eventsList?.classList.add('hidden');
    }

    function hideEmptyState() {
        emptyState?.classList.add('hidden');
        eventsList?.classList.remove('hidden');
    }

    function showLoading() {
        loadingState?.classList.remove('hidden');
        eventsList?.classList.add('hidden');
        emptyState?.classList.add('hidden');
    }

    function hideLoading() {
        loadingState?.classList.add('hidden');
        eventsList?.classList.remove('hidden');
    }
});