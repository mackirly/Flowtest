/**
 * Events API module
 * Handles all event-related API calls
 */
import { apiRequest } from './client.js';

export class EventsClient {
    constructor() {
        this.baseUrl = '/api/events';
    }

    /**
     * Get all events
     * @param {Object} params - Query parameters (date_from, date_to, etc.)
     * @returns {Promise} Promise that resolves to array of events
     */
    async getEvents(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return apiRequest(`${this.baseUrl}/events/?${queryString}`, {
            method: 'GET'
        });
    }

    /**
     * Get a specific event by ID
     * @param {number|string} eventId - Event ID
     * @returns {Promise} Promise that resolves to event object
     */
    async getEvent(eventId) {
        return apiRequest(`${this.baseUrl}/events/${eventId}/`, {
            method: 'GET'
        });
    }

    /**
     * Create a new event
     * @param {Object} data - Event data
     * @returns {Promise} Promise that resolves to created event
     */
    async createEvent(data) {
        return apiRequest(`${this.baseUrl}/events/`, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    /**
     * Update an event
     * @param {number|string} eventId - Event ID
     * @param {Object} data - Updated event data
     * @returns {Promise} Promise that resolves to updated event
     */
    async updateEvent(eventId, data) {
        return apiRequest(`${this.baseUrl}/events/${eventId}/`, {
            method: 'PATCH',
            body: JSON.stringify(data)
        });
    }

    /**
     * Delete an event
     * @param {number|string} eventId - Event ID
     * @returns {Promise} Promise that resolves when deleted
     */
    async deleteEvent(eventId) {
        return apiRequest(`${this.baseUrl}/events/${eventId}/`, {
            method: 'DELETE'
        });
    }

    /**
     * Get events for a specific month
     * @param {number} year - Year
     * @param {number} month - Month (1-12)
     * @returns {Promise} Promise that resolves to array of events
     */
    async getMonthEvents(year, month) {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0);
        
        return this.getEvents({
            date_from: startDate.toISOString().split('T')[0],
            date_to: endDate.toISOString().split('T')[0]
        });
    }

    /**
     * Get test runs associated with an event
     * @param {number|string} eventId - Event ID
     * @returns {Promise} Promise that resolves to array of test runs
     */
    async getEventTestRuns(eventId) {
        return apiRequest(`${this.baseUrl}/events/${eventId}/test_runs/`, {
            method: 'GET'
        });
    }
}

// Create singleton instance
const eventsClient = new EventsClient();
export default eventsClient;