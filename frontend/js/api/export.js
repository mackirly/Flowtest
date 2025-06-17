/**
 * Export API client
 * Handles server-side report export operations
 */

import ApiClient from './client.js';

class ExportAPI {
    /**
     * Export report to PDF or Excel via server
     * @param {string} format - 'pdf' or 'excel'
     * @param {Object} reportData - Report data including metrics
     * @returns {Promise<Blob>} - File blob
     */
    async exportReport(format, reportData) {
        try {
            const response = await ApiClient.post('/reports/export/', {
                format: format,
                report_data: reportData
            }, {
                responseType: 'blob'
            });
            
            return response;
        } catch (error) {
            console.error('Export API Error:', error);
            throw error;
        }
    }
    
    /**
     * Export report and trigger download
     * @param {string} format - 'pdf' or 'excel'
     * @param {Object} reportData - Report data
     * @param {string} filename - Desired filename
     */
    async exportAndDownload(format, reportData, filename) {
        try {
            const blob = await this.exportReport(format, reportData);
            
            // Create download link
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename || `report.${format}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            
            return true;
        } catch (error) {
            console.error('Export download error:', error);
            throw error;
        }
    }
}

const exportAPI = new ExportAPI();
export default exportAPI;