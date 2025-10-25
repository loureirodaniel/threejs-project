/**
 * CommentStorage - Persistent storage for comments and user data
 * Handles JSON file storage, caching, and data persistence
 */
export class CommentStorage {
    constructor() {
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
        this.basePath = '/assets/data/comments';
        this.userPath = '/assets/data/users';
        this.moderationPath = '/assets/data/moderation';
    }

    /**
     * Save a comment to storage
     * @param {string} eventId - Event ID
     * @param {Object} comment - Comment object
     * @returns {Promise<boolean>} Success status
     */
    async saveComment(eventId, comment) {
        try {
            const year = this.extractYearFromEventId(eventId);
            const fileName = this.getCommentFileName(eventId);
            const filePath = `${this.basePath}/${year}/${fileName}`;
            
            // Load existing comments
            let comments = await this.loadCommentsFromFile(filePath);
            
            // Add new comment
            comments.push(comment);
            
            // Save to file
            await this.saveCommentsToFile(filePath, comments);
            
            // Update cache
            this.cache.set(filePath, {
                data: comments,
                timestamp: Date.now()
            });
            
            console.debug(`Comment saved to ${filePath}`);
            return true;
            
        } catch (error) {
            console.error('Failed to save comment:', error);
            throw error;
        }
    }

    /**
     * Get comments for an event
     * @param {string} eventId - Event ID
     * @returns {Promise<Array>} Comments array
     */
    async getComments(eventId) {
        try {
            const year = this.extractYearFromEventId(eventId);
            const fileName = this.getCommentFileName(eventId);
            const filePath = `${this.basePath}/${year}/${fileName}`;
            
            // Check cache first
            const cached = this.cache.get(filePath);
            if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
                return cached.data;
            }
            
            // Load from file
            const comments = await this.loadCommentsFromFile(filePath);
            
            // Update cache
            this.cache.set(filePath, {
                data: comments,
                timestamp: Date.now()
            });
            
            return comments;
            
        } catch (error) {
            console.error('Failed to get comments:', error);
            return [];
        }
    }

    /**
     * Update a comment
     * @param {string} eventId - Event ID
     * @param {string} commentId - Comment ID
     * @param {Object} updatedComment - Updated comment
     * @returns {Promise<boolean>} Success status
     */
    async updateComment(eventId, commentId, updatedComment) {
        try {
            const year = this.extractYearFromEventId(eventId);
            const fileName = this.getCommentFileName(eventId);
            const filePath = `${this.basePath}/${year}/${fileName}`;
            
            // Load existing comments
            let comments = await this.loadCommentsFromFile(filePath);
            
            // Find and update comment
            const index = comments.findIndex(c => c.id === commentId);
            if (index === -1) {
                throw new Error(`Comment ${commentId} not found`);
            }
            
            comments[index] = updatedComment;
            
            // Save to file
            await this.saveCommentsToFile(filePath, comments);
            
            // Update cache
            this.cache.set(filePath, {
                data: comments,
                timestamp: Date.now()
            });
            
            console.debug(`Comment updated in ${filePath}`);
            return true;
            
        } catch (error) {
            console.error('Failed to update comment:', error);
            throw error;
        }
    }

    /**
     * Delete a comment
     * @param {string} eventId - Event ID
     * @param {string} commentId - Comment ID
     * @returns {Promise<boolean>} Success status
     */
    async deleteComment(eventId, commentId) {
        try {
            const year = this.extractYearFromEventId(eventId);
            const fileName = this.getCommentFileName(eventId);
            const filePath = `${this.basePath}/${year}/${fileName}`;
            
            // Load existing comments
            let comments = await this.loadCommentsFromFile(filePath);
            
            // Remove comment
            const index = comments.findIndex(c => c.id === commentId);
            if (index === -1) {
                throw new Error(`Comment ${commentId} not found`);
            }
            
            comments.splice(index, 1);
            
            // Save to file
            await this.saveCommentsToFile(filePath, comments);
            
            // Update cache
            this.cache.set(filePath, {
                data: comments,
                timestamp: Date.now()
            });
            
            console.debug(`Comment deleted from ${filePath}`);
            return true;
            
        } catch (error) {
            console.error('Failed to delete comment:', error);
            throw error;
        }
    }

    /**
     * Save a report
     * @param {Object} report - Report object
     * @returns {Promise<boolean>} Success status
     */
    async saveReport(report) {
        try {
            const filePath = `${this.moderationPath}/reported-comments.json`;
            
            // Load existing reports
            let reports = await this.loadReportsFromFile(filePath);
            
            // Add new report
            reports.push(report);
            
            // Save to file
            await this.saveReportsToFile(filePath, reports);
            
            console.debug(`Report saved to ${filePath}`);
            return true;
            
        } catch (error) {
            console.error('Failed to save report:', error);
            throw error;
        }
    }

    /**
     * Get reports
     * @returns {Promise<Array>} Reports array
     */
    async getReports() {
        try {
            const filePath = `${this.moderationPath}/reported-comments.json`;
            return await this.loadReportsFromFile(filePath);
        } catch (error) {
            console.error('Failed to get reports:', error);
            return [];
        }
    }

    /**
     * Save user profile
     * @param {Object} profile - User profile
     * @returns {Promise<boolean>} Success status
     */
    async saveUserProfile(profile) {
        try {
            const filePath = `${this.userPath}/user-profiles.json`;
            
            // Load existing profiles
            let profiles = await this.loadUserProfilesFromFile(filePath);
            
            // Update or add profile
            const index = profiles.findIndex(p => p.userId === profile.userId);
            if (index === -1) {
                profiles.push(profile);
            } else {
                profiles[index] = profile;
            }
            
            // Save to file
            await this.saveUserProfilesToFile(filePath, profiles);
            
            console.debug(`User profile saved to ${filePath}`);
            return true;
            
        } catch (error) {
            console.error('Failed to save user profile:', error);
            throw error;
        }
    }

    /**
     * Get user profile
     * @param {string} userId - User ID
     * @returns {Promise<Object|null>} User profile or null
     */
    async getUserProfile(userId) {
        try {
            const filePath = `${this.userPath}/user-profiles.json`;
            const profiles = await this.loadUserProfilesFromFile(filePath);
            return profiles.find(p => p.userId === userId) || null;
        } catch (error) {
            console.error('Failed to get user profile:', error);
            return null;
        }
    }

    /**
     * Load comments from file
     * @param {string} filePath - File path
     * @returns {Promise<Array>} Comments array
     */
    async loadCommentsFromFile(filePath) {
        try {
            const response = await fetch(filePath);
            if (!response.ok) {
                // File doesn't exist, return empty array
                return [];
            }
            
            const data = await response.json();
            return data.comments || [];
            
        } catch (error) {
            console.warn(`Failed to load comments from ${filePath}:`, error);
            return [];
        }
    }

    /**
     * Save comments to file
     * @param {string} filePath - File path
     * @param {Array} comments - Comments array
     * @returns {Promise<boolean>} Success status
     */
    async saveCommentsToFile(filePath, comments) {
        try {
            const data = {
                eventId: this.extractEventIdFromPath(filePath),
                lastUpdated: Date.now(),
                totalComments: comments.length,
                comments: comments,
                statistics: this.calculateStatistics(comments)
            };
            
            // In a real application, this would save to a server
            // For now, we'll simulate with localStorage
            localStorage.setItem(`comments_${filePath}`, JSON.stringify(data));
            
            console.debug(`Comments saved to ${filePath}`);
            return true;
            
        } catch (error) {
            console.error('Failed to save comments to file:', error);
            throw error;
        }
    }

    /**
     * Load reports from file
     * @param {string} filePath - File path
     * @returns {Promise<Array>} Reports array
     */
    async loadReportsFromFile(filePath) {
        try {
            const response = await fetch(filePath);
            if (!response.ok) {
                return [];
            }
            
            const data = await response.json();
            return data.reports || [];
            
        } catch (error) {
            console.warn(`Failed to load reports from ${filePath}:`, error);
            return [];
        }
    }

    /**
     * Save reports to file
     * @param {string} filePath - File path
     * @param {Array} reports - Reports array
     * @returns {Promise<boolean>} Success status
     */
    async saveReportsToFile(filePath, reports) {
        try {
            const data = {
                lastUpdated: Date.now(),
                totalReports: reports.length,
                reports: reports
            };
            
            // In a real application, this would save to a server
            localStorage.setItem(`reports_${filePath}`, JSON.stringify(data));
            
            console.debug(`Reports saved to ${filePath}`);
            return true;
            
        } catch (error) {
            console.error('Failed to save reports to file:', error);
            throw error;
        }
    }

    /**
     * Load user profiles from file
     * @param {string} filePath - File path
     * @returns {Promise<Array>} User profiles array
     */
    async loadUserProfilesFromFile(filePath) {
        try {
            const response = await fetch(filePath);
            if (!response.ok) {
                return [];
            }
            
            const data = await response.json();
            return data.profiles || [];
            
        } catch (error) {
            console.warn(`Failed to load user profiles from ${filePath}:`, error);
            return [];
        }
    }

    /**
     * Save user profiles to file
     * @param {string} filePath - File path
     * @param {Array} profiles - User profiles array
     * @returns {Promise<boolean>} Success status
     */
    async saveUserProfilesToFile(filePath, profiles) {
        try {
            const data = {
                lastUpdated: Date.now(),
                totalProfiles: profiles.length,
                profiles: profiles
            };
            
            // In a real application, this would save to a server
            localStorage.setItem(`profiles_${filePath}`, JSON.stringify(data));
            
            console.debug(`User profiles saved to ${filePath}`);
            return true;
            
        } catch (error) {
            console.error('Failed to save user profiles to file:', error);
            throw error;
        }
    }

    /**
     * Extract year from event ID
     * @param {string} eventId - Event ID
     * @returns {string} Year
     */
    extractYearFromEventId(eventId) {
        const match = eventId.match(/(\d{4})/);
        return match ? match[1] : 'unknown';
    }

    /**
     * Get comment file name
     * @param {string} eventId - Event ID
     * @returns {string} File name
     */
    getCommentFileName(eventId) {
        const year = this.extractYearFromEventId(eventId);
        const eventName = eventId.replace(/^event_\d{4}_/, '').replace(/_/g, '-');
        return `${year}-${eventName}-comments.json`;
    }

    /**
     * Extract event ID from file path
     * @param {string} filePath - File path
     * @returns {string} Event ID
     */
    extractEventIdFromPath(filePath) {
        const fileName = filePath.split('/').pop();
        const eventName = fileName.replace('-comments.json', '').replace(/-/g, '_');
        return `event_${eventName}`;
    }

    /**
     * Calculate comment statistics
     * @param {Array} comments - Comments array
     * @returns {Object} Statistics
     */
    calculateStatistics(comments) {
        const totalLikes = comments.reduce((sum, c) => sum + c.likes, 0);
        const totalReplies = comments.reduce((sum, c) => sum + (c.replies?.length || 0), 0);
        const averageRating = comments.length > 0 ? totalLikes / comments.length : 0;
        
        const userCounts = {};
        comments.forEach(comment => {
            userCounts[comment.userId] = (userCounts[comment.userId] || 0) + 1;
        });
        
        const mostActiveUsers = Object.entries(userCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5)
            .map(([userId, count]) => ({ userId, count }));
        
        return {
            totalLikes,
            totalReplies,
            averageRating: Math.round(averageRating * 10) / 10,
            mostActiveUsers
        };
    }

    /**
     * Clear cache
     */
    clearCache() {
        this.cache.clear();
        console.debug('Comment storage cache cleared');
    }

    /**
     * Get cache statistics
     * @returns {Object} Cache statistics
     */
    getCacheStatistics() {
        return {
            size: this.cache.size,
            entries: Array.from(this.cache.keys()),
            memoryUsage: JSON.stringify(Array.from(this.cache.values())).length
        };
    }

    /**
     * Export comments for an event
     * @param {string} eventId - Event ID
     * @param {string} format - Export format (json, csv)
     * @returns {Promise<string>} Exported data
     */
    async exportComments(eventId, format = 'json') {
        try {
            const comments = await this.getComments(eventId);
            
            if (format === 'json') {
                return JSON.stringify(comments, null, 2);
            } else if (format === 'csv') {
                return this.convertToCSV(comments);
            } else {
                throw new Error(`Unsupported export format: ${format}`);
            }
            
        } catch (error) {
            console.error('Failed to export comments:', error);
            throw error;
        }
    }

    /**
     * Convert comments to CSV format
     * @param {Array} comments - Comments array
     * @returns {string} CSV data
     */
    convertToCSV(comments) {
        const headers = ['id', 'eventId', 'userId', 'userDisplayName', 'content', 'timestamp', 'likes', 'replies'];
        const rows = comments.map(comment => [
            comment.id,
            comment.eventId,
            comment.userId,
            comment.userDisplayName,
            `"${comment.content.replace(/"/g, '""')}"`,
            new Date(comment.timestamp).toISOString(),
            comment.likes,
            comment.replies?.length || 0
        ]);
        
        return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    }

    /**
     * Destroy the storage instance
     */
    destroy() {
        this.clearCache();
    }
}
