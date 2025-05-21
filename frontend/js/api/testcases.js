/**
 * Test Cases API module
 * Handles all test case-related API calls
 */
import { apiRequest } from './client.js';

const testcases = (() => {
    /**
     * Get all test cases for a project
     * @param {number|string} projectId - Project ID
     * @returns {Promise} Promise that resolves to array of test cases
     */
    const getAll = async (projectId) => {
        return apiRequest(`/projects/${projectId}/test-cases/`);
    };
    
    /**
     * Get a specific test case by ID
     * @param {number|string} id - Test case ID
     * @returns {Promise} Promise that resolves to test case object
     */
    const getById = async (id) => {
        return apiRequest(`/test-cases/${id}/`);
    };
    
    /**
     * Create a new test case
     * @param {number|string} projectId - Project ID
     * @param {Object} testCaseData - Test case data
     * @returns {Promise} Promise that resolves to created test case
     */
    const create = async (projectId, testCaseData) => {
        return apiRequest(`/projects/${projectId}/test-cases/`, {
            method: 'POST',
            body: JSON.stringify(testCaseData)
        });
    };
    
    /**
     * Update an existing test case
     * @param {number|string} id - Test case ID
     * @param {Object} testCaseData - Updated test case data
     * @returns {Promise} Promise that resolves to updated test case
     */
    const update = async (id, testCaseData) => {
        return apiRequest(`/test-cases/${id}/`, {
            method: 'PUT',
            body: JSON.stringify(testCaseData)
        });
    };
    
    /**
     * Delete a test case
     * @param {number|string} id - Test case ID
     * @returns {Promise} Promise that resolves when test case is deleted
     */
    const remove = async (id) => {
        return apiRequest(`/test-cases/${id}/`, {
            method: 'DELETE'
        });
    };
    
    /**
     * Get test cases in a folder
     * @param {number|string} folderId - Folder ID
     * @returns {Promise} Promise that resolves to array of test cases
     */
    const getByFolder = async (folderId) => {
        return apiRequest(`/folders/${folderId}/test-cases/`);
    };
    
    /**
     * Move a test case to a different folder
     * @param {number|string} id - Test case ID
     * @param {number|string} folderId - Destination folder ID
     * @returns {Promise} Promise that resolves to moved test case
     */
    const moveToFolder = async (id, folderId) => {
        return apiRequest(`/test-cases/${id}/move/`, {
            method: 'POST',
            body: JSON.stringify({ folder_id: folderId })
        });
    };
    
    /**
     * Execute a test case
     * @param {number|string} id - Test case ID
     * @param {Object} executionData - Test execution data
     * @returns {Promise} Promise that resolves to test execution result
     */
    const execute = async (id, executionData) => {
        return apiRequest(`/test-cases/${id}/execute/`, {
            method: 'POST',
            body: JSON.stringify(executionData)
        });
    };
    
    /**
     * Get execution history for a test case
     * @param {number|string} id - Test case ID
     * @returns {Promise} Promise that resolves to array of test executions
     */
    const getExecutionHistory = async (id) => {
        return apiRequest(`/test-cases/${id}/execution-history/`);
    };
    
    /**
     * Get test case reports
     * @param {number|string} id - Test case ID
     * @returns {Promise} Promise that resolves to array of test reports
     */
    const getReports = async (id) => {
        return apiRequest(`/test-cases/${id}/reports/`);
    };
    
    /**
     * Clone a test case
     * @param {number|string} id - Test case ID to clone
     * @param {Object} options - Clone options
     * @returns {Promise} Promise that resolves to cloned test case
     */
    const clone = async (id, options = {}) => {
        return apiRequest(`/test-cases/${id}/clone/`, {
            method: 'POST',
            body: JSON.stringify(options)
        });
    };
    
    /**
     * Search test cases
     * @param {number|string} projectId - Project ID
     * @param {Object} searchParams - Search parameters
     * @returns {Promise} Promise that resolves to search results
     */
    const search = async (projectId, searchParams) => {
        const queryString = new URLSearchParams(searchParams).toString();
        return apiRequest(`/projects/${projectId}/test-cases/search/?${queryString}`);
    };
    
    // Return public API
    return {
        getAll,
        getById,
        create,
        update,
        remove,
        getByFolder,
        moveToFolder,
        execute,
        getExecutionHistory,
        getReports,
        clone,
        search
    };
})();

export default testcases;