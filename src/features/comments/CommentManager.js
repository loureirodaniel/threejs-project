/**
 * CommentManager - Central comment management and coordination
 * Handles comment lifecycle, state management, and event coordination
 */
export class CommentManager {
    constructor(stateManager, eventBus, storage, moderation) {
        this.stateManager = stateManager;
        this.eventBus = eventBus;
        this.storage = storage;
        this.moderation = moderation;
        this.comments = new Map();
        this.eventComments = new Map();
        
        this.setupEventListeners();
    }

    /**
     * Add a new comment to an event
     * @param {string} eventId - The event ID
     * @param {Object} commentData - Comment data
     * @returns {Promise<Object>} Created comment
     */
    async addComment(eventId, commentData) {
        try {
            // Validate comment data
            const validatedData = this.validateCommentData(commentData);
            
            // Create comment object
            const comment = {
                id: this.generateCommentId(),
                eventId: eventId,
                userId: validatedData.userId || this.generateUserId(),
                userDisplayName: validatedData.userDisplayName || 'Anonymous',
                userAvatar: validatedData.userAvatar || this.getDefaultAvatar(),
                content: validatedData.content,
                timestamp: Date.now(),
                editedAt: null,
                likes: 0,
                dislikes: 0,
                replies: [],
                parentCommentId: validatedData.parentCommentId || null,
                isModerated: false,
                isVisible: true,
                isPinned: false,
                tags: validatedData.tags || [],
                metadata: {
                    ipAddress: validatedData.metadata?.ipAddress || 'unknown',
                    userAgent: validatedData.metadata?.userAgent || navigator.userAgent,
                    location: validatedData.metadata?.location || null
                }
            };

            // Check content moderation
            const moderationResult = await this.moderation.checkContent(comment.content);
            if (!moderationResult.approved) {
                comment.isModerated = true;
                comment.isVisible = false;
                comment.moderationReason = moderationResult.reason;
            }

            // Store comment
            await this.storage.saveComment(eventId, comment);
            
            // Update local state
            this.addCommentToState(eventId, comment);
            
            // Emit events
            this.eventBus.emit('commentAdded', { eventId, comment });
            this.eventBus.emit('commentStateChanged', { eventId, action: 'add', comment });
            
            console.info(`Comment added to event ${eventId}:`, comment.id);
            return comment;
            
        } catch (error) {
            console.error('Failed to add comment:', error);
            this.eventBus.emit('commentError', { eventId, error: error.message });
            throw error;
        }
    }

    /**
     * Get comments for an event
     * @param {string} eventId - The event ID
     * @param {Object} options - Query options
     * @returns {Promise<Array>} Comments array
     */
    async getComments(eventId, options = {}) {
        try {
            const { limit = 50, offset = 0, sortBy = 'timestamp', sortOrder = 'desc' } = options;
            
            // Check if comments are already loaded
            if (this.eventComments.has(eventId)) {
                return this.sortComments(this.eventComments.get(eventId), sortBy, sortOrder)
                    .slice(offset, offset + limit);
            }
            
            // Load comments from storage
            const comments = await this.storage.getComments(eventId);
            this.eventComments.set(eventId, comments);
            
            return this.sortComments(comments, sortBy, sortOrder)
                .slice(offset, offset + limit);
                
        } catch (error) {
            console.error('Failed to get comments:', error);
            this.eventBus.emit('commentError', { eventId, error: error.message });
            return [];
        }
    }

    /**
     * Update a comment
     * @param {string} commentId - Comment ID
     * @param {Object} updates - Updates to apply
     * @returns {Promise<Object>} Updated comment
     */
    async updateComment(commentId, updates) {
        try {
            const comment = this.findCommentById(commentId);
            if (!comment) {
                throw new Error(`Comment ${commentId} not found`);
            }

            // Validate updates
            const validatedUpdates = this.validateCommentUpdates(updates);
            
            // Check content moderation if content is being updated
            if (validatedUpdates.content) {
                const moderationResult = await this.moderation.checkContent(validatedUpdates.content);
                if (!moderationResult.approved) {
                    validatedUpdates.isModerated = true;
                    validatedUpdates.isVisible = false;
                    validatedUpdates.moderationReason = moderationResult.reason;
                }
            }

            // Apply updates
            const updatedComment = {
                ...comment,
                ...validatedUpdates,
                editedAt: Date.now()
            };

            // Store updated comment
            await this.storage.updateComment(comment.eventId, commentId, updatedComment);
            
            // Update local state
            this.updateCommentInState(comment.eventId, commentId, updatedComment);
            
            // Emit events
            this.eventBus.emit('commentUpdated', { commentId, updates: validatedUpdates });
            this.eventBus.emit('commentStateChanged', { 
                eventId: comment.eventId, 
                action: 'update', 
                comment: updatedComment 
            });
            
            console.info(`Comment updated: ${commentId}`);
            return updatedComment;
            
        } catch (error) {
            console.error('Failed to update comment:', error);
            this.eventBus.emit('commentError', { commentId, error: error.message });
            throw error;
        }
    }

    /**
     * Delete a comment
     * @param {string} commentId - Comment ID
     * @returns {Promise<boolean>} Success status
     */
    async deleteComment(commentId) {
        try {
            const comment = this.findCommentById(commentId);
            if (!comment) {
                throw new Error(`Comment ${commentId} not found`);
            }

            // Delete from storage
            await this.storage.deleteComment(comment.eventId, commentId);
            
            // Update local state
            this.removeCommentFromState(comment.eventId, commentId);
            
            // Emit events
            this.eventBus.emit('commentDeleted', { commentId, eventId: comment.eventId });
            this.eventBus.emit('commentStateChanged', { 
                eventId: comment.eventId, 
                action: 'delete', 
                commentId: commentId 
            });
            
            console.info(`Comment deleted: ${commentId}`);
            return true;
            
        } catch (error) {
            console.error('Failed to delete comment:', error);
            this.eventBus.emit('commentError', { commentId, error: error.message });
            throw error;
        }
    }

    /**
     * Like or unlike a comment
     * @param {string} commentId - Comment ID
     * @param {string} userId - User ID
     * @returns {Promise<Object>} Updated comment
     */
    async likeComment(commentId, userId) {
        try {
            const comment = this.findCommentById(commentId);
            if (!comment) {
                throw new Error(`Comment ${commentId} not found`);
            }

            // Check if user already liked this comment
            const hasLiked = comment.likedBy && comment.likedBy.includes(userId);
            
            const updates = {
                likes: hasLiked ? comment.likes - 1 : comment.likes + 1,
                likedBy: hasLiked 
                    ? (comment.likedBy || []).filter(id => id !== userId)
                    : [...(comment.likedBy || []), userId]
            };

            return await this.updateComment(commentId, updates);
            
        } catch (error) {
            console.error('Failed to like comment:', error);
            throw error;
        }
    }

    /**
     * Reply to a comment
     * @param {string} commentId - Parent comment ID
     * @param {Object} replyData - Reply data
     * @returns {Promise<Object>} Created reply
     */
    async replyToComment(commentId, replyData) {
        try {
            const parentComment = this.findCommentById(commentId);
            if (!parentComment) {
                throw new Error(`Parent comment ${commentId} not found`);
            }

            // Create reply with parent comment ID
            const reply = await this.addComment(parentComment.eventId, {
                ...replyData,
                parentCommentId: commentId
            });

            // Update parent comment's replies array
            await this.updateComment(commentId, {
                replies: [...(parentComment.replies || []), reply.id]
            });

            return reply;
            
        } catch (error) {
            console.error('Failed to reply to comment:', error);
            throw error;
        }
    }

    /**
     * Report a comment
     * @param {string} commentId - Comment ID
     * @param {string} reason - Report reason
     * @param {string} userId - Reporter user ID
     * @returns {Promise<boolean>} Success status
     */
    async reportComment(commentId, reason, userId) {
        try {
            const comment = this.findCommentById(commentId);
            if (!comment) {
                throw new Error(`Comment ${commentId} not found`);
            }

            // Create report
            const report = {
                id: this.generateReportId(),
                commentId: commentId,
                eventId: comment.eventId,
                reporterId: userId,
                reason: reason,
                timestamp: Date.now(),
                status: 'pending'
            };

            // Save report
            await this.storage.saveReport(report);
            
            // Emit events
            this.eventBus.emit('commentReported', { commentId, report });
            
            console.info(`Comment reported: ${commentId}, reason: ${reason}`);
            return true;
            
        } catch (error) {
            console.error('Failed to report comment:', error);
            throw error;
        }
    }

    /**
     * Moderate comments for an event
     * @param {string} eventId - Event ID
     * @returns {Promise<Array>} Moderation queue
     */
    async moderateComments(eventId) {
        try {
            const comments = await this.getComments(eventId);
            const moderationQueue = comments.filter(comment => 
                comment.isModerated || comment.reports?.length > 0
            );
            
            this.eventBus.emit('moderationQueueLoaded', { eventId, queue: moderationQueue });
            return moderationQueue;
            
        } catch (error) {
            console.error('Failed to load moderation queue:', error);
            throw error;
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        this.eventBus.on('commentStateChanged', (data) => {
            this.updateCommentUI(data);
        });
        
        this.eventBus.on('commentError', (data) => {
            this.handleCommentError(data);
        });
    }

    /**
     * Validate comment data
     * @param {Object} data - Comment data
     * @returns {Object} Validated data
     */
    validateCommentData(data) {
        if (!data.content || data.content.trim().length === 0) {
            throw new Error('Comment content is required');
        }
        
        if (data.content.length > 1000) {
            throw new Error('Comment content too long (max 1000 characters)');
        }
        
        return {
            content: data.content.trim(),
            userId: data.userId,
            userDisplayName: data.userDisplayName,
            userAvatar: data.userAvatar,
            parentCommentId: data.parentCommentId,
            tags: data.tags || [],
            metadata: data.metadata || {}
        };
    }

    /**
     * Validate comment updates
     * @param {Object} updates - Updates to validate
     * @returns {Object} Validated updates
     */
    validateCommentUpdates(updates) {
        const allowedFields = [
            'content', 'isVisible', 'isPinned', 'tags', 'likes', 'dislikes'
        ];
        
        const validated = {};
        for (const [key, value] of Object.entries(updates)) {
            if (allowedFields.includes(key)) {
                validated[key] = value;
            }
        }
        
        if (validated.content && validated.content.length > 1000) {
            throw new Error('Comment content too long (max 1000 characters)');
        }
        
        return validated;
    }

    /**
     * Generate unique comment ID
     * @returns {string} Comment ID
     */
    generateCommentId() {
        return 'comment_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Generate unique user ID
     * @returns {string} User ID
     */
    generateUserId() {
        return 'user_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Generate unique report ID
     * @returns {string} Report ID
     */
    generateReportId() {
        return 'report_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Get default avatar URL
     * @returns {string} Default avatar URL
     */
    getDefaultAvatar() {
        return '/assets/images/ui/default-avatar.png';
    }

    /**
     * Find comment by ID
     * @param {string} commentId - Comment ID
     * @returns {Object|null} Comment object or null
     */
    findCommentById(commentId) {
        for (const [eventId, comments] of this.eventComments) {
            const comment = comments.find(c => c.id === commentId);
            if (comment) return comment;
        }
        return null;
    }

    /**
     * Sort comments
     * @param {Array} comments - Comments array
     * @param {string} sortBy - Sort field
     * @param {string} sortOrder - Sort order (asc/desc)
     * @returns {Array} Sorted comments
     */
    sortComments(comments, sortBy, sortOrder) {
        return comments.sort((a, b) => {
            let aVal = a[sortBy];
            let bVal = b[sortBy];
            
            if (sortBy === 'timestamp') {
                aVal = new Date(aVal).getTime();
                bVal = new Date(bVal).getTime();
            }
            
            if (sortOrder === 'desc') {
                return bVal - aVal;
            } else {
                return aVal - bVal;
            }
        });
    }

    /**
     * Add comment to state
     * @param {string} eventId - Event ID
     * @param {Object} comment - Comment object
     */
    addCommentToState(eventId, comment) {
        if (!this.eventComments.has(eventId)) {
            this.eventComments.set(eventId, []);
        }
        this.eventComments.get(eventId).push(comment);
    }

    /**
     * Update comment in state
     * @param {string} eventId - Event ID
     * @param {string} commentId - Comment ID
     * @param {Object} updatedComment - Updated comment
     */
    updateCommentInState(eventId, commentId, updatedComment) {
        if (this.eventComments.has(eventId)) {
            const comments = this.eventComments.get(eventId);
            const index = comments.findIndex(c => c.id === commentId);
            if (index !== -1) {
                comments[index] = updatedComment;
            }
        }
    }

    /**
     * Remove comment from state
     * @param {string} eventId - Event ID
     * @param {string} commentId - Comment ID
     */
    removeCommentFromState(eventId, commentId) {
        if (this.eventComments.has(eventId)) {
            const comments = this.eventComments.get(eventId);
            const index = comments.findIndex(c => c.id === commentId);
            if (index !== -1) {
                comments.splice(index, 1);
            }
        }
    }

    /**
     * Update comment UI
     * @param {Object} data - Update data
     */
    updateCommentUI(data) {
        // This would trigger UI updates
        console.debug('Comment UI update:', data);
    }

    /**
     * Handle comment error
     * @param {Object} data - Error data
     */
    handleCommentError(data) {
        console.error('Comment error:', data);
        // This would show error messages to users
    }

    /**
     * Get comment statistics
     * @param {string} eventId - Event ID
     * @returns {Object} Statistics
     */
    async getCommentStatistics(eventId) {
        try {
            const comments = await this.getComments(eventId);
            const totalComments = comments.length;
            const totalLikes = comments.reduce((sum, c) => sum + c.likes, 0);
            const totalReplies = comments.reduce((sum, c) => sum + (c.replies?.length || 0), 0);
            const averageRating = totalComments > 0 ? totalLikes / totalComments : 0;
            
            return {
                totalComments,
                totalLikes,
                totalReplies,
                averageRating: Math.round(averageRating * 10) / 10,
                mostActiveUsers: this.getMostActiveUsers(comments)
            };
        } catch (error) {
            console.error('Failed to get comment statistics:', error);
            return null;
        }
    }

    /**
     * Get most active users
     * @param {Array} comments - Comments array
     * @returns {Array} Most active users
     */
    getMostActiveUsers(comments) {
        const userCounts = {};
        comments.forEach(comment => {
            userCounts[comment.userId] = (userCounts[comment.userId] || 0) + 1;
        });
        
        return Object.entries(userCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5)
            .map(([userId, count]) => ({ userId, count }));
    }

    /**
     * Destroy the comment manager
     */
    destroy() {
        this.comments.clear();
        this.eventComments.clear();
        this.eventBus.off('commentStateChanged');
        this.eventBus.off('commentError');
    }
}
