/**
 * Translations for FlowTest
 */

const translations = {
    en: {
        // Events Page
        "events": "Events",
        "createEvent": "Create Event",
        "eventName": "Event Name",
        "eventType": "Event Type",
        "eventDate": "Date",
        "eventTime": "Time",
        "eventDescription": "Description",
        "participants": "Participants",
        "searchEvents": "Search events...",
        "meeting": "Meeting",
        "deadline": "Deadline",
        "review": "Review",
        "other": "Other",
        "upcoming": "Upcoming",
        "inProgress": "In Progress",
        "completed": "Completed",
        "cancelled": "Cancelled",
        "allDates": "All Dates",
        "today": "Today",
        "thisWeek": "This Week",
        "thisMonth": "This Month",
        "noEvents": "No Events",
        "noEventsDesc": "Create a new event to get started.",
        "loadingEvents": "Loading events...",
        "eventCreated": "Event created successfully",
        "failedToCreateEvent": "Failed to create event",
        "failedToLoadEvents": "Failed to load events"
    },
    
    ru: {
        // Events Page
        "events": "События",
        "createEvent": "Создать событие",
        "eventName": "Название события",
        "eventType": "Тип события",
        "eventDate": "Дата",
        "eventTime": "Время",
        "eventDescription": "Описание",
        "participants": "Участники",
        "searchEvents": "Поиск событий...",
        "meeting": "Встреча",
        "deadline": "Дедлайн",
        "review": "Ревью",
        "other": "Другое",
        "upcoming": "Предстоит",
        "inProgress": "В процессе",
        "completed": "Завершено",
        "cancelled": "Отменено",
        "allDates": "Все даты",
        "today": "Сегодня",
        "thisWeek": "Эта неделя",
        "thisMonth": "Этот месяц",
        "noEvents": "Нет событий",
        "noEventsDesc": "Создайте новое событие, чтобы начать.",
        "loadingEvents": "Загрузка событий...",
        "eventCreated": "Событие успешно создано",
        "failedToCreateEvent": "Не удалось создать событие",
        "failedToLoadEvents": "Не удалось загрузить события"
    },
    
    de: {
        // Events Page
        "events": "Ereignisse",
        "createEvent": "Ereignis erstellen",
        "eventName": "Ereignisname",
        "eventType": "Ereignistyp",
        "eventDate": "Datum",
        "eventTime": "Zeit",
        "eventDescription": "Beschreibung",
        "participants": "Teilnehmer",
        "searchEvents": "Ereignisse suchen...",
        "meeting": "Besprechung",
        "deadline": "Frist",
        "review": "Überprüfung",
        "other": "Sonstiges",
        "upcoming": "Bevorstehend",
        "inProgress": "In Bearbeitung",
        "completed": "Abgeschlossen",
        "cancelled": "Abgebrochen",
        "allDates": "Alle Daten",
        "today": "Heute",
        "thisWeek": "Diese Woche",
        "thisMonth": "Dieser Monat",
        "noEvents": "Keine Ereignisse",
        "noEventsDesc": "Erstellen Sie ein neues Ereignis, um zu beginnen.",
        "loadingEvents": "Ereignisse werden geladen...",
        "eventCreated": "Ereignis erfolgreich erstellt",
        "failedToCreateEvent": "Ereignis konnte nicht erstellt werden",
        "failedToLoadEvents": "Ereignisse konnten nicht geladen werden"
    }
};

// Password Strength Strings
const passwordStrengthTranslations = {
    en: {
        passwordVeryWeak: "Very weak password",
        passwordWeak: "Weak password",
        passwordMedium: "Medium strength password",
        passwordGood: "Good password",
        passwordStrong: "Strong password",
        passwordVeryStrong: "Very strong password"
    },
    ru: {
        passwordVeryWeak: "Очень слабый пароль",
        passwordWeak: "Слабый пароль",
        passwordMedium: "Средний пароль",
        passwordGood: "Хороший пароль",
        passwordStrong: "Сильный пароль",
        passwordVeryStrong: "Очень сильный пароль"
    },
    de: {
        passwordVeryWeak: "Sehr schwaches Passwort",
        passwordWeak: "Schwaches Passwort",
        passwordMedium: "Mittleres Passwort",
        passwordGood: "Gutes Passwort",
        passwordStrong: "Starkes Passwort",
        passwordVeryStrong: "Sehr starkes Passwort"
    }
};

// Add all existing translations from old file here...
// Copy all translations from the original file and add them here...

// Merge password strength translations into main translations
Object.keys(translations).forEach(lang => {
    if (passwordStrengthTranslations[lang]) {
        translations[lang] = {
            ...translations[lang],
            ...passwordStrengthTranslations[lang]
        };
    }
});

export default translations;