// API client for automation endpoints
import { apiRequest } from './client.js';

export const automationAPI = {
    // Get all automation projects for a project
    getAutomationProjects: (projectId) => {
        return apiRequest(`/api/projects/${projectId}/automation/`, 'GET');
    },

    // Create a new automation project
    createAutomationProject: (projectId, data) => {
        return apiRequest(`/api/projects/${projectId}/automation/`, 'POST', data);
    },

    // Update an automation project
    updateAutomationProject: (projectId, automationId, data) => {
        return apiRequest(`/api/projects/${projectId}/automation/${automationId}/`, 'PATCH', data);
    },

    // Delete an automation project
    deleteAutomationProject: (projectId, automationId) => {
        return apiRequest(`/api/projects/${projectId}/automation/${automationId}/`, 'DELETE');
    },

    // Sync repository
    syncRepository: (projectId, automationId, data = {}) => {
        return apiRequest(`/api/projects/${projectId}/automation/${automationId}/sync/`, 'POST', data);
    },

    // Get automation tests for a project
    getAutomationTests: (projectId, automationId) => {
        return apiRequest(`/api/projects/${projectId}/automation/${automationId}/tests/`, 'GET');
    },

    // Execute a test
    executeTest: (projectId, automationId, testId, data = {}) => {
        return apiRequest(`/api/projects/${projectId}/automation-tests/${automationId}/tests/${testId}/execute/`, 'POST', data);
    }
};

// Export apiRequest for backward compatibility
export { apiRequest } from './client.js';