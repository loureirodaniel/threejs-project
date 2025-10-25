/**
 * CommentModeration - Content moderation and safety features
 * Handles content filtering, user reporting, and moderation tools
 */
export class CommentModeration {
    constructor() {
        this.bannedWords = [
            'spam', 'scam', 'fake', 'hate', 'abuse', 'harassment',
            'offensive', 'inappropriate', 'illegal', 'violence'
        ];
        
        this.suspiciousPatterns = [
            /https?:\/\/[^\s]+/g, // URLs
            /@\w+/g, // Mentions
            /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, // Credit card numbers
            /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g // Email addresses
        ];
        
        this.reportReasons = [
            'spam',
            'harassment',
            'hate_speech',
            'inappropriate_content',
            'fake_information',
            'off_topic',
            'other'
        ];
        
        this.moderationQueue = [];
        this.autoModerationEnabled = true;
        this.moderatorUsers = new Set();
    }

    /**
     * Check content for moderation
     * @param {string} content - Content to check
     * @returns {Promise<Object>} Moderation result
     */
    async checkContent(content) {
        try {
            const result = {
                approved: true,
                reason: null,
                confidence: 0,
                flags: [],
                suggestions: []
            };

            // Check for banned words
            const bannedWordCheck = this.checkBannedWords(content);
            if (!bannedWordCheck.approved) {
                result.approved = false;
                result.reason = 'Contains banned words';
                result.flags.push('banned_words');
                result.confidence = 0.9;
                return result;
            }

            // Check for suspicious patterns
            const patternCheck = this.checkSuspiciousPatterns(content);
            if (patternCheck.flags.length > 0) {
                result.flags.push(...patternCheck.flags);
                result.confidence += patternCheck.confidence;
                
                if (patternCheck.confidence > 0.7) {
                    result.approved = false;
                    result.reason = 'Contains suspicious patterns';
                }
            }

            // Check content length and quality
            const qualityCheck = this.checkContentQuality(content);
            if (qualityCheck.flags.length > 0) {
                result.flags.push(...qualityCheck.flags);
                result.confidence += qualityCheck.confidence;
                
                if (qualityCheck.confidence > 0.8) {
                    result.approved = false;
                    result.reason = 'Low quality content';
                }
            }

            // Check for spam patterns
            const spamCheck = this.checkSpamPatterns(content);
            if (spamCheck.isSpam) {
                result.approved = false;
                result.reason = 'Detected as spam';
                result.flags.push('spam');
                result.confidence = 0.95;
            }

            // Generate suggestions
            result.suggestions = this.generateSuggestions(content, result.flags);

            return result;

        } catch (error) {
            console.error('Content moderation check failed:', error);
            return {
                approved: true,
                reason: 'Moderation check failed',
                confidence: 0,
                flags: [],
                suggestions: []
            };
        }
    }

    /**
     * Check for banned words
     * @param {string} content - Content to check
     * @returns {Object} Check result
     */
    checkBannedWords(content) {
        const lowerContent = content.toLowerCase();
        const foundWords = this.bannedWords.filter(word => 
            lowerContent.includes(word.toLowerCase())
        );

        return {
            approved: foundWords.length === 0,
            foundWords: foundWords,
            confidence: foundWords.length > 0 ? 0.9 : 0
        };
    }

    /**
     * Check for suspicious patterns
     * @param {string} content - Content to check
     * @returns {Object} Check result
     */
    checkSuspiciousPatterns(content) {
        const flags = [];
        let confidence = 0;

        this.suspiciousPatterns.forEach((pattern, index) => {
            const matches = content.match(pattern);
            if (matches && matches.length > 0) {
                switch (index) {
                    case 0: // URLs
                        flags.push('contains_urls');
                        confidence += 0.3;
                        break;
                    case 1: // Mentions
                        flags.push('contains_mentions');
                        confidence += 0.2;
                        break;
                    case 2: // Credit card numbers
                        flags.push('contains_credit_card');
                        confidence += 0.8;
                        break;
                    case 3: // Email addresses
                        flags.push('contains_email');
                        confidence += 0.4;
                        break;
                }
            }
        });

        return {
            flags: flags,
            confidence: Math.min(confidence, 1.0)
        };
    }

    /**
     * Check content quality
     * @param {string} content - Content to check
     * @returns {Object} Check result
     */
    checkContentQuality(content) {
        const flags = [];
        let confidence = 0;

        // Check for excessive repetition
        const words = content.toLowerCase().split(/\s+/);
        const wordCounts = {};
        words.forEach(word => {
            wordCounts[word] = (wordCounts[word] || 0) + 1;
        });

        const maxRepetition = Math.max(...Object.values(wordCounts));
        if (maxRepetition > words.length * 0.3) {
            flags.push('excessive_repetition');
            confidence += 0.6;
        }

        // Check for all caps
        const capsRatio = (content.match(/[A-Z]/g) || []).length / content.length;
        if (capsRatio > 0.7) {
            flags.push('excessive_caps');
            confidence += 0.4;
        }

        // Check for very short content
        if (content.trim().length < 3) {
            flags.push('too_short');
            confidence += 0.8;
        }

        // Check for very long content
        if (content.length > 1000) {
            flags.push('too_long');
            confidence += 0.3;
        }

        return {
            flags: flags,
            confidence: Math.min(confidence, 1.0)
        };
    }

    /**
     * Check for spam patterns
     * @param {string} content - Content to check
     * @returns {Object} Check result
     */
    checkSpamPatterns(content) {
        const spamIndicators = [
            /buy now/i,
            /click here/i,
            /free money/i,
            /guaranteed/i,
            /limited time/i,
            /act now/i,
            /don't miss/i,
            /exclusive offer/i
        ];

        let spamScore = 0;
        spamIndicators.forEach(pattern => {
            if (pattern.test(content)) {
                spamScore += 0.2;
            }
        });

        // Check for excessive punctuation
        const punctuationRatio = (content.match(/[!]{2,}|[?]{2,}|[.]{2,}/g) || []).length / content.length;
        if (punctuationRatio > 0.1) {
            spamScore += 0.3;
        }

        return {
            isSpam: spamScore > 0.5,
            score: spamScore,
            confidence: Math.min(spamScore, 1.0)
        };
    }

    /**
     * Generate content suggestions
     * @param {string} content - Original content
     * @param {Array} flags - Moderation flags
     * @returns {Array} Suggestions
     */
    generateSuggestions(content, flags) {
        const suggestions = [];

        if (flags.includes('banned_words')) {
            suggestions.push('Please avoid using inappropriate language');
        }

        if (flags.includes('contains_urls')) {
            suggestions.push('Please avoid sharing links in comments');
        }

        if (flags.includes('excessive_caps')) {
            suggestions.push('Please avoid using all capital letters');
        }

        if (flags.includes('too_short')) {
            suggestions.push('Please provide more meaningful content');
        }

        if (flags.includes('too_long')) {
            suggestions.push('Please keep comments concise (max 1000 characters)');
        }

        if (flags.includes('excessive_repetition')) {
            suggestions.push('Please avoid repeating the same words or phrases');
        }

        return suggestions;
    }

    /**
     * Process a comment report
     * @param {Object} report - Report object
     * @returns {Promise<Object>} Processing result
     */
    async processReport(report) {
        try {
            const result = {
                action: 'none',
                reason: null,
                confidence: 0,
                moderatorId: null,
                timestamp: Date.now()
            };

            // Check if report is valid
            if (!this.isValidReport(report)) {
                result.action = 'dismiss';
                result.reason = 'Invalid report';
                return result;
            }

            // Get the reported comment
            const comment = await this.getCommentById(report.commentId);
            if (!comment) {
                result.action = 'dismiss';
                result.reason = 'Comment not found';
                return result;
            }

            // Re-evaluate content with current moderation rules
            const moderationResult = await this.checkContent(comment.content);
            
            // Determine action based on report reason and content analysis
            switch (report.reason) {
                case 'spam':
                    if (moderationResult.flags.includes('spam')) {
                        result.action = 'delete';
                        result.reason = 'Confirmed spam';
                        result.confidence = 0.9;
                    } else {
                        result.action = 'dismiss';
                        result.reason = 'Not spam';
                    }
                    break;
                    
                case 'harassment':
                case 'hate_speech':
                    if (moderationResult.flags.includes('banned_words')) {
                        result.action = 'delete';
                        result.reason = 'Confirmed harassment/hate speech';
                        result.confidence = 0.8;
                    } else {
                        result.action = 'review';
                        result.reason = 'Requires manual review';
                    }
                    break;
                    
                case 'inappropriate_content':
                    if (moderationResult.confidence > 0.7) {
                        result.action = 'hide';
                        result.reason = 'Inappropriate content';
                        result.confidence = moderationResult.confidence;
                    } else {
                        result.action = 'review';
                        result.reason = 'Requires manual review';
                    }
                    break;
                    
                default:
                    result.action = 'review';
                    result.reason = 'Requires manual review';
            }

            return result;

        } catch (error) {
            console.error('Failed to process report:', error);
            return {
                action: 'error',
                reason: 'Processing failed',
                confidence: 0,
                error: error.message
            };
        }
    }

    /**
     * Validate a report
     * @param {Object} report - Report object
     * @returns {boolean} Is valid
     */
    isValidReport(report) {
        return report &&
               report.commentId &&
               report.reason &&
               this.reportReasons.includes(report.reason) &&
               report.reporterId &&
               report.timestamp;
    }

    /**
     * Get comment by ID (placeholder - would need to integrate with CommentManager)
     * @param {string} commentId - Comment ID
     * @returns {Promise<Object|null>} Comment object or null
     */
    async getCommentById(commentId) {
        // This would integrate with the CommentManager
        // For now, return null as placeholder
        return null;
    }

    /**
     * Add moderator user
     * @param {string} userId - User ID
     */
    addModerator(userId) {
        this.moderatorUsers.add(userId);
        console.info(`User ${userId} added as moderator`);
    }

    /**
     * Remove moderator user
     * @param {string} userId - User ID
     */
    removeModerator(userId) {
        this.moderatorUsers.delete(userId);
        console.info(`User ${userId} removed as moderator`);
    }

    /**
     * Check if user is moderator
     * @param {string} userId - User ID
     * @returns {boolean} Is moderator
     */
    isModerator(userId) {
        return this.moderatorUsers.has(userId);
    }

    /**
     * Get moderation queue
     * @returns {Array} Moderation queue
     */
    getModerationQueue() {
        return [...this.moderationQueue];
    }

    /**
     * Add to moderation queue
     * @param {Object} item - Queue item
     */
    addToModerationQueue(item) {
        this.moderationQueue.push({
            ...item,
            queuedAt: Date.now(),
            status: 'pending'
        });
    }

    /**
     * Process moderation queue item
     * @param {string} queueId - Queue item ID
     * @param {string} action - Action to take
     * @param {string} moderatorId - Moderator user ID
     * @returns {Promise<boolean>} Success status
     */
    async processModerationQueueItem(queueId, action, moderatorId) {
        try {
            const item = this.moderationQueue.find(i => i.id === queueId);
            if (!item) {
                throw new Error('Queue item not found');
            }

            if (!this.isModerator(moderatorId)) {
                throw new Error('User is not authorized to moderate');
            }

            // Update item status
            item.status = 'processed';
            item.processedAt = Date.now();
            item.processedBy = moderatorId;
            item.action = action;

            // Remove from queue
            this.moderationQueue = this.moderationQueue.filter(i => i.id !== queueId);

            console.info(`Moderation queue item ${queueId} processed by ${moderatorId}`);
            return true;

        } catch (error) {
            console.error('Failed to process moderation queue item:', error);
            throw error;
        }
    }

    /**
     * Get moderation statistics
     * @returns {Object} Statistics
     */
    getModerationStatistics() {
        const totalReports = this.moderationQueue.length;
        const pendingReports = this.moderationQueue.filter(i => i.status === 'pending').length;
        const processedReports = this.moderationQueue.filter(i => i.status === 'processed').length;

        return {
            totalReports,
            pendingReports,
            processedReports,
            autoModerationEnabled: this.autoModerationEnabled,
            moderatorCount: this.moderatorUsers.size
        };
    }

    /**
     * Enable/disable auto moderation
     * @param {boolean} enabled - Enable status
     */
    setAutoModeration(enabled) {
        this.autoModerationEnabled = enabled;
        console.info(`Auto moderation ${enabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * Add banned word
     * @param {string} word - Word to ban
     */
    addBannedWord(word) {
        if (!this.bannedWords.includes(word.toLowerCase())) {
            this.bannedWords.push(word.toLowerCase());
            console.info(`Banned word added: ${word}`);
        }
    }

    /**
     * Remove banned word
     * @param {string} word - Word to remove
     */
    removeBannedWord(word) {
        const index = this.bannedWords.indexOf(word.toLowerCase());
        if (index !== -1) {
            this.bannedWords.splice(index, 1);
            console.info(`Banned word removed: ${word}`);
        }
    }

    /**
     * Get banned words list
     * @returns {Array} Banned words
     */
    getBannedWords() {
        return [...this.bannedWords];
    }

    /**
     * Destroy the moderation instance
     */
    destroy() {
        this.moderationQueue = [];
        this.moderatorUsers.clear();
    }
}
