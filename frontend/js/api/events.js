/**
 * Events API module
 * Handles all event-related API calls
 */
import ApiClient from './client.js';

export class EventsClient {
    constructor() {
        this.baseUrl = '/events';
    }

    async getEvents(params = {}) {
        return ApiClient.get(`${this.baseUrl}/`, params);
    }

    async getEvent(eventId) {
        return ApiClient.get(`${this.baseUrl}/${eventId}/`);
    }

    async createEvent(eventData) {
        return ApiClient.post(`${this.baseUrl}/`, eventData);
    }

    async updateEvent(eventId, eventData) {
        return ApiClient.patch(`${this.baseUrl}/${eventId}/`, eventData);
    }

    async deleteEvent(eventId) {
        return ApiClient.delete(`${this.baseUrl}/${eventId}/`);
    }

    async getUpcomingEvents(days = 30) {
        return ApiClient.get(`${this.baseUrl}/upcoming/`, { days });
    }

    async getTodayEvents() {
        return ApiClient.get(`${this.baseUrl}/today/`);
    }

    async getCalendarEvents(startDate, endDate) {
        return ApiClient.get(`${this.baseUrl}/calendar/`, {
            start_date: startDate,
            end_date: endDate
        });
    }

    async getEventStats() {
        return ApiClient.get(`${this.baseUrl}/stats/`);
    }

    async createEventInstances(eventId, startDate, endDate) {
        return ApiClient.post(`${this.baseUrl}/${eventId}/create_instances/`, {
            start_date: startDate,
            end_date: endDate
        });
    }

    async getEventsSummary() {
        return ApiClient.get(`${this.baseUrl}/summary/`);
    }

    // Test execution specific endpoints
    async getTestExecutionDetails(eventId) {
        return ApiClient.get(`${this.baseUrl}/${eventId}/execution/`);
    }

    async joinEvent(eventId, role = 'tester') {
        return ApiClient.post(`${this.baseUrl}/${eventId}/join/`, { role });
    }

    async leaveEvent(eventId) {
        return ApiClient.post(`${this.baseUrl}/${eventId}/leave/`);
    }

    async initializeTests(eventId) {
        return ApiClient.post(`${this.baseUrl}/${eventId}/initialize_tests/`);
    }

    async getTestResults(eventId, params = {}) {
        return ApiClient.get(`${this.baseUrl}/${eventId}/test-results/`, params);
    }

    async updateTestResult(eventId, resultId, data) {
        return ApiClient.post(`${this.baseUrl}/${eventId}/test-results/${resultId}/update/`, data);
    }

    async assignTests(eventId, assignments) {
        return ApiClient.post(`${this.baseUrl}/${eventId}/assign-tests/`, { assignments });
    }
}

// Convenience functions for direct imports
const eventsClient = new EventsClient();

export const getEvents = (params) => eventsClient.getEvents(params);
export const getEvent = (eventId) => eventsClient.getEvent(eventId);
export const createEvent = (eventData) => eventsClient.createEvent(eventData);
export const updateEvent = (eventId, eventData) => eventsClient.updateEvent(eventId, eventData);
export const deleteEvent = (eventId) => eventsClient.deleteEvent(eventId);
export const getUpcomingEvents = (days) => eventsClient.getUpcomingEvents(days);
export const getTodayEvents = () => eventsClient.getTodayEvents();
export const getCalendarEvents = (startDate, endDate) => eventsClient.getCalendarEvents(startDate, endDate);
export const getEventStats = () => eventsClient.getEventStats();
export const createEventInstances = (eventId, startDate, endDate) => eventsClient.createEventInstances(eventId, startDate, endDate);
export const getEventsSummary = () => eventsClient.getEventsSummary();

export default eventsClient;