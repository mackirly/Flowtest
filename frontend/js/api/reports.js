/**
 * Reports API client
 */

import ApiClient from './client.js';

class ReportsAPI {
    /**
     * Get metrics data for a specific project and date range
     * @param {Object} params - Query parameters
     * @param {string} params.project_id - Project ID (optional)
     * @param {string} params.date_from - Start date (ISO format)
     * @param {string} params.date_to - End date (ISO format)
     * @returns {Promise<Object>} Metrics data
     */
    async getMetrics(params = {}) {
        try {
            const queryParams = new URLSearchParams();
            
            if (params.project_id) {
                queryParams.append('project_id', params.project_id);
            }
            if (params.date_from) {
                queryParams.append('date_from', params.date_from);
            }
            if (params.date_to) {
                queryParams.append('date_to', params.date_to);
            }
            
            const response = await ApiClient.get(`/reports/metrics/?${queryParams.toString()}`);
            return response;
        } catch (error) {
            console.error('Error fetching metrics:', error);
            throw error;
        }
    }
    
    /**
     * Get chart data for specific metrics
     * @param {Object} params - Query parameters
     * @param {string} params.metric_type - Type of metric (e.g., 'tests_passed', 'test_duration')
     * @param {string} params.project_id - Project ID (optional)
     * @param {string} params.date_from - Start date
     * @param {string} params.date_to - End date
     * @param {string} params.group_by - Grouping (day, week, month)
     * @returns {Promise<Object>} Chart data
     */
    async getChartData(params) {
        try {
            const queryParams = new URLSearchParams(params);
            const response = await ApiClient.get(`/reports/chart-data/?${queryParams.toString()}`);
            return response;
        } catch (error) {
            console.error('Error fetching chart data:', error);
            throw error;
        }
    }
    
    /**
     * Get test execution summary
     * @param {string} projectId - Project ID (optional)
     * @returns {Promise<Object>} Test execution summary
     */
    async getTestExecutionSummary(projectId = null) {
        try {
            const url = projectId 
                ? `/reports/test-execution-summary/?project_id=${projectId}`
                : '/reports/test-execution-summary/';
            
            const response = await ApiClient.get(url);
            return response;
        } catch (error) {
            console.error('Error fetching test execution summary:', error);
            throw error;
        }
    }
    
    /**
     * Generate a report
     * @param {Object} data - Report configuration
     * @returns {Promise<Object>} Generated report
     */
    async generateReport(data) {
        try {
            const response = await ApiClient.post('/reports/generate/', data);
            return response;
        } catch (error) {
            console.error('Error generating report:', error);
            throw error;
        }
    }
    
    /**
     * Get saved report templates
     * @returns {Promise<Array>} List of templates
     */
    async getTemplates() {
        try {
            const response = await ApiClient.get('/reports/templates/');
            return response.results || response;
        } catch (error) {
            console.error('Error fetching templates:', error);
            throw error;
        }
    }
    
    /**
     * Save a report template
     * @param {Object} template - Template data
     * @returns {Promise<Object>} Saved template
     */
    async saveTemplate(template) {
        try {
            const response = await ApiClient.post('/reports/templates/', template);
            return response;
        } catch (error) {
            console.error('Error saving template:', error);
            throw error;
        }
    }
    
    /**
     * Update a report template
     * @param {string} templateId - Template ID
     * @param {Object} template - Template data
     * @returns {Promise<Object>} Updated template
     */
    async updateTemplate(templateId, template) {
        try {
            const response = await ApiClient.put(`/reports/templates/${templateId}/`, template);
            return response;
        } catch (error) {
            console.error('Error updating template:', error);
            throw error;
        }
    }
    
    /**
     * Delete a report template
     * @param {string} templateId - Template ID
     * @returns {Promise<void>}
     */
    async deleteTemplate(templateId) {
        try {
            await ApiClient.delete(`/reports/templates/${templateId}/`);
        } catch (error) {
            console.error('Error deleting template:', error);
            throw error;
        }
    }
}

export default new ReportsAPI();