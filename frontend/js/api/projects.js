/**
 * Projects API module
 * Handles all project-related API calls
 */
import { apiRequest } from './client.js';

const projects = (() => {
    /**
     * Get all projects
     * @returns {Promise} Promise that resolves to array of projects
     */
    const getAll = async () => {
        return apiRequest('/projects/');
    };
    
    /**
     * Get a specific project by ID
     * @param {number|string} id - Project ID
     * @returns {Promise} Promise that resolves to project object
     */
    const getById = async (id) => {
        return apiRequest(`/projects/${id}/`);
    };
    
    /**
     * Create a new project
     * @param {Object} projectData - Project data object
     * @returns {Promise} Promise that resolves to created project
     */
    const create = async (projectData) => {
        return apiRequest('/projects/', {
            method: 'POST',
            body: JSON.stringify(projectData)
        });
    };
    
    /**
     * Update an existing project
     * @param {number|string} id - Project ID
     * @param {Object} projectData - Updated project data
     * @returns {Promise} Promise that resolves to updated project
     */
    const update = async (id, projectData) => {
        return apiRequest(`/projects/${id}/`, {
            method: 'PUT',
            body: JSON.stringify(projectData)
        });
    };
    
    /**
     * Delete a project
     * @param {number|string} id - Project ID
     * @returns {Promise} Promise that resolves when project is deleted
     */
    const remove = async (id) => {
        return apiRequest(`/projects/${id}/`, {
            method: 'DELETE'
        });
    };
    
    /**
     * Get folders for a project
     * @param {number|string} projectId - Project ID
     * @returns {Promise} Promise that resolves to array of folders
     */
    const getFolders = async (projectId) => {
        return apiRequest(`/projects/${projectId}/folders/`);
    };
    
    /**
     * Create a folder in a project
     * @param {number|string} projectId - Project ID
     * @param {Object} folderData - Folder data
     * @returns {Promise} Promise that resolves to created folder
     */
    const createFolder = async (projectId, folderData) => {
        return apiRequest(`/projects/${projectId}/folders/`, {
            method: 'POST',
            body: JSON.stringify(folderData)
        });
    };
    
    /**
     * Update a folder in a project
     * @param {number|string} projectId - Project ID
     * @param {number|string} folderId - Folder ID
     * @param {Object} folderData - Updated folder data
     * @returns {Promise} Promise that resolves to updated folder
     */
    const updateFolder = async (projectId, folderId, folderData) => {
        return apiRequest(`/projects/${projectId}/folders/${folderId}/`, {
            method: 'PUT',
            body: JSON.stringify(folderData)
        });
    };
    
    /**
     * Delete a folder from a project
     * @param {number|string} projectId - Project ID
     * @param {number|string} folderId - Folder ID
     * @returns {Promise} Promise that resolves when folder is deleted
     */
    const deleteFolder = async (projectId, folderId) => {
        return apiRequest(`/projects/${projectId}/folders/${folderId}/`, {
            method: 'DELETE'
        });
    };
    
    /**
     * Get project statistics
     * @param {number|string} projectId - Project ID
     * @returns {Promise} Promise that resolves to project statistics
     */
    const getStatistics = async (projectId) => {
        return apiRequest(`/projects/${projectId}/statistics/`);
    };
    
    /**
     * Get project members
     * @param {number|string} projectId - Project ID
     * @returns {Promise} Promise that resolves to array of project members
     */
    const getMembers = async (projectId) => {
        return apiRequest(`/projects/${projectId}/members/`);
    };
    
    /**
     * Add a member to a project
     * @param {number|string} projectId - Project ID
     * @param {Object} memberData - Member data
     * @returns {Promise} Promise that resolves to added member
     */
    const addMember = async (projectId, memberData) => {
        return apiRequest(`/projects/${projectId}/members/`, {
            method: 'POST',
            body: JSON.stringify(memberData)
        });
    };
    
    /**
     * Remove a member from a project
     * @param {number|string} projectId - Project ID
     * @param {number|string} userId - User ID to remove
     * @returns {Promise} Promise that resolves when member is removed
     */
    const removeMember = async (projectId, userId) => {
        return apiRequest(`/projects/${projectId}/members/${userId}/`, {
            method: 'DELETE'
        });
    };
    
    // Return public API
    return {
        getAll,
        getById,
        create,
        update,
        remove,
        getFolders,
        createFolder,
        updateFolder,
        deleteFolder,
        getStatistics,
        getMembers,
        addMember,
        removeMember
    };
})();

export default projects;
export { projects };