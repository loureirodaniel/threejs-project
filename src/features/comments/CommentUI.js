/**
 * CommentUI - User interface for comment interactions
 * Handles 3D comment display, user interactions, and UI management
 */
import { Button } from '../../components/Button/Button.js';
import { Panel } from '../../components/Panel/Panel.js';

export class CommentUI {
    constructor(scene, camera, commentManager, eventBus) {
        this.scene = scene;
        this.camera = camera;
        this.commentManager = commentManager;
        this.eventBus = eventBus;
        
        this.commentBubbles = new Map();
        this.commentForms = new Map();
        this.commentPanels = new Map();
        this.selectedEvent = null;
        this.showComments = false;
        
        this.setupEventListeners();
        this.createCommentUI();
    }

    /**
     * Show comments for an event
     * @param {string} eventId - Event ID
     * @param {Object} eventPosition - Event 3D position
     */
    async showCommentsForEvent(eventId, eventPosition) {
        try {
            this.selectedEvent = eventId;
            this.showComments = true;
            
            // Load comments
            const comments = await this.commentManager.getComments(eventId);
            
            // Create 3D comment bubbles
            this.createCommentBubbles(eventId, comments, eventPosition);
            
            // Show comment panel
            this.showCommentPanel(eventId);
            
            // Emit event
            this.eventBus.emit('commentsShown', { eventId, commentCount: comments.length });
            
            console.info(`Showing ${comments.length} comments for event ${eventId}`);
            
        } catch (error) {
            console.error('Failed to show comments:', error);
            this.eventBus.emit('commentError', { eventId, error: error.message });
        }
    }

    /**
     * Hide comments
     */
    hideComments() {
        this.showComments = false;
        this.selectedEvent = null;
        
        // Remove all comment bubbles
        this.commentBubbles.forEach((bubble, eventId) => {
            this.removeCommentBubbles(eventId);
        });
        
        // Hide comment panels
        this.commentPanels.forEach((panel, eventId) => {
            this.hideCommentPanel(eventId);
        });
        
        // Emit event
        this.eventBus.emit('commentsHidden');
        
        console.info('Comments hidden');
    }

    /**
     * Create comment bubbles in 3D space
     * @param {string} eventId - Event ID
     * @param {Array} comments - Comments array
     * @param {Object} eventPosition - Event 3D position
     */
    createCommentBubbles(eventId, comments, eventPosition) {
        // Remove existing bubbles for this event
        this.removeCommentBubbles(eventId);
        
        const bubbles = [];
        const radius = 2; // Radius around the event
        const angleStep = (Math.PI * 2) / Math.max(comments.length, 1);
        
        comments.forEach((comment, index) => {
            const angle = index * angleStep;
            const bubblePosition = {
                x: eventPosition.x + Math.cos(angle) * radius,
                y: eventPosition.y + Math.sin(angle) * 0.5,
                z: eventPosition.z + Math.sin(angle) * radius
            };
            
            const bubble = this.createCommentBubble(comment, bubblePosition);
            bubbles.push(bubble);
        });
        
        this.commentBubbles.set(eventId, bubbles);
    }

    /**
     * Create a single comment bubble
     * @param {Object} comment - Comment object
     * @param {Object} position - 3D position
     * @returns {Object} Comment bubble object
     */
    createCommentBubble(comment, position) {
        // Create bubble geometry
        const geometry = new THREE.SphereGeometry(0.3, 16, 16);
        
        // Create bubble material
        const material = new THREE.MeshBasicMaterial({
            color: 0x00ff88,
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide
        });
        
        // Create bubble mesh
        const bubble = new THREE.Mesh(geometry, material);
        bubble.position.set(position.x, position.y, position.z);
        bubble.userData = { comment: comment, type: 'commentBubble' };
        
        // Add to scene
        this.scene.add(bubble);
        
        // Create text sprite for comment preview
        const textSprite = this.createCommentTextSprite(comment, position);
        this.scene.add(textSprite);
        
        // Add click handler
        bubble.addEventListener = (event, handler) => {
            // This would be handled by the raycasting system
            bubble.userData.clickHandler = handler;
        };
        
        return {
            bubble: bubble,
            textSprite: textSprite,
            comment: comment
        };
    }

    /**
     * Create comment text sprite
     * @param {Object} comment - Comment object
     * @param {Object} position - 3D position
     * @returns {THREE.Sprite} Text sprite
     */
    createCommentTextSprite(comment, position) {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 256;
        canvas.height = 128;
        
        // Draw comment preview
        context.fillStyle = 'rgba(0, 0, 0, 0.8)';
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        context.fillStyle = 'white';
        context.font = '14px Arial';
        context.textAlign = 'center';
        
        // Draw user name
        context.fillText(comment.userDisplayName, canvas.width / 2, 20);
        
        // Draw comment preview (truncated)
        const preview = comment.content.length > 50 
            ? comment.content.substring(0, 50) + '...'
            : comment.content;
        context.fillText(preview, canvas.width / 2, 45);
        
        // Draw likes count
        context.fillText(`❤️ ${comment.likes}`, canvas.width / 2, 70);
        
        // Create texture and sprite
        const texture = new THREE.CanvasTexture(canvas);
        const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
        const sprite = new THREE.Sprite(spriteMaterial);
        
        sprite.position.set(position.x, position.y + 0.5, position.z);
        sprite.scale.set(1, 0.5, 1);
        sprite.userData = { comment: comment, type: 'commentText' };
        
        return sprite;
    }

    /**
     * Remove comment bubbles for an event
     * @param {string} eventId - Event ID
     */
    removeCommentBubbles(eventId) {
        const bubbles = this.commentBubbles.get(eventId);
        if (bubbles) {
            bubbles.forEach(bubble => {
                this.scene.remove(bubble.bubble);
                this.scene.remove(bubble.textSprite);
            });
            this.commentBubbles.delete(eventId);
        }
    }

    /**
     * Show comment panel
     * @param {string} eventId - Event ID
     */
    showCommentPanel(eventId) {
        // Hide existing panels
        this.commentPanels.forEach((panel, id) => {
            if (id !== eventId) {
                this.hideCommentPanel(id);
            }
        });
        
        // Create or show panel for this event
        let panel = this.commentPanels.get(eventId);
        if (!panel) {
            panel = this.createCommentPanel(eventId);
            this.commentPanels.set(eventId, panel);
        }
        
        panel.style.display = 'block';
        this.loadCommentsInPanel(eventId, panel);
    }

    /**
     * Hide comment panel
     * @param {string} eventId - Event ID
     */
    hideCommentPanel(eventId) {
        const panel = this.commentPanels.get(eventId);
        if (panel) {
            panel.style.display = 'none';
        }
    }

    /**
     * Create comment panel
     * @param {string} eventId - Event ID
     * @returns {HTMLElement} Panel element
     */
    createCommentPanel(eventId) {
        const panel = document.createElement('div');
        panel.className = 'comment-panel';
        panel.style.cssText = `
            position: fixed;
            top: 50%;
            right: 20px;
            transform: translateY(-50%);
            width: 350px;
            max-height: 600px;
            background: rgba(0, 0, 0, 0.9);
            border: 1px solid #00ff88;
            border-radius: 8px;
            padding: 20px;
            color: white;
            font-family: Arial, sans-serif;
            z-index: 1000;
            overflow-y: auto;
            display: none;
        `;
        
        // Panel header
        const header = document.createElement('div');
        header.className = 'comment-panel-header';
        header.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 1px solid #333;
        `;
        
        const title = document.createElement('h3');
        title.textContent = 'Comments';
        title.style.margin = '0';
        
        const closeBtn = new Button({
            children: '×',
            variant: 'secondary',
            size: 'small',
            onClick: () => this.hideComments()
        });
        
        header.appendChild(title);
        header.appendChild(closeBtn.createElement());
        panel.appendChild(header);
        
        // Comments container
        const commentsContainer = document.createElement('div');
        commentsContainer.className = 'comments-container';
        commentsContainer.style.cssText = `
            max-height: 400px;
            overflow-y: auto;
            margin-bottom: 15px;
        `;
        panel.appendChild(commentsContainer);
        
        // Comment form
        const commentForm = this.createCommentForm(eventId);
        panel.appendChild(commentForm);
        
        document.body.appendChild(panel);
        return panel;
    }

    /**
     * Create comment form
     * @param {string} eventId - Event ID
     * @returns {HTMLElement} Form element
     */
    createCommentForm(eventId) {
        const form = document.createElement('div');
        form.className = 'comment-form';
        form.style.cssText = `
            border-top: 1px solid #333;
            padding-top: 15px;
        `;
        
        const textarea = document.createElement('textarea');
        textarea.placeholder = 'Add a comment...';
        textarea.style.cssText = `
            width: 100%;
            height: 80px;
            background: #222;
            border: 1px solid #555;
            border-radius: 4px;
            color: white;
            padding: 10px;
            font-family: Arial, sans-serif;
            resize: vertical;
            margin-bottom: 10px;
        `;
        
        const submitBtn = new Button({
            children: 'Post Comment',
            variant: 'primary',
            size: 'small',
            onClick: () => this.submitComment(eventId, textarea.value)
        });
        
        form.appendChild(textarea);
        form.appendChild(submitBtn.createElement());
        
        return form;
    }

    /**
     * Load comments in panel
     * @param {string} eventId - Event ID
     * @param {HTMLElement} panel - Panel element
     */
    async loadCommentsInPanel(eventId, panel) {
        try {
            const comments = await this.commentManager.getComments(eventId);
            const container = panel.querySelector('.comments-container');
            container.innerHTML = '';
            
            comments.forEach(comment => {
                const commentElement = this.createCommentElement(comment);
                container.appendChild(commentElement);
            });
            
        } catch (error) {
            console.error('Failed to load comments in panel:', error);
        }
    }

    /**
     * Create comment element
     * @param {Object} comment - Comment object
     * @returns {HTMLElement} Comment element
     */
    createCommentElement(comment) {
        const commentDiv = document.createElement('div');
        commentDiv.className = 'comment-item';
        commentDiv.style.cssText = `
            background: #333;
            border-radius: 6px;
            padding: 12px;
            margin-bottom: 10px;
            border-left: 3px solid #00ff88;
        `;
        
        // User info
        const userInfo = document.createElement('div');
        userInfo.style.cssText = `
            display: flex;
            align-items: center;
            margin-bottom: 8px;
        `;
        
        const avatar = document.createElement('div');
        avatar.style.cssText = `
            width: 30px;
            height: 30px;
            border-radius: 50%;
            background: #00ff88;
            margin-right: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            color: black;
        `;
        avatar.textContent = comment.userDisplayName.charAt(0).toUpperCase();
        
        const userName = document.createElement('span');
        userName.textContent = comment.userDisplayName;
        userName.style.fontWeight = 'bold';
        
        const timestamp = document.createElement('span');
        timestamp.textContent = new Date(comment.timestamp).toLocaleDateString();
        timestamp.style.cssText = `
            margin-left: auto;
            font-size: 12px;
            color: #999;
        `;
        
        userInfo.appendChild(avatar);
        userInfo.appendChild(userName);
        userInfo.appendChild(timestamp);
        
        // Comment content
        const content = document.createElement('div');
        content.textContent = comment.content;
        content.style.cssText = `
            margin-bottom: 8px;
            line-height: 1.4;
        `;
        
        // Actions
        const actions = document.createElement('div');
        actions.style.cssText = `
            display: flex;
            gap: 10px;
            font-size: 12px;
        `;
        
        const likeBtn = document.createElement('button');
        likeBtn.textContent = `❤️ ${comment.likes}`;
        likeBtn.style.cssText = `
            background: none;
            border: none;
            color: #00ff88;
            cursor: pointer;
        `;
        likeBtn.onclick = () => this.likeComment(comment.id);
        
        const replyBtn = document.createElement('button');
        replyBtn.textContent = 'Reply';
        replyBtn.style.cssText = `
            background: none;
            border: none;
            color: #00ff88;
            cursor: pointer;
        `;
        replyBtn.onclick = () => this.replyToComment(comment.id);
        
        actions.appendChild(likeBtn);
        actions.appendChild(replyBtn);
        
        commentDiv.appendChild(userInfo);
        commentDiv.appendChild(content);
        commentDiv.appendChild(actions);
        
        return commentDiv;
    }

    /**
     * Submit comment
     * @param {string} eventId - Event ID
     * @param {string} content - Comment content
     */
    async submitComment(eventId, content) {
        try {
            if (!content.trim()) {
                alert('Please enter a comment');
                return;
            }
            
            const commentData = {
                content: content.trim(),
                userDisplayName: 'User', // This would come from user session
                userId: 'user_' + Math.random().toString(36).substr(2, 9)
            };
            
            await this.commentManager.addComment(eventId, commentData);
            
            // Clear form
            const form = document.querySelector('.comment-form textarea');
            if (form) form.value = '';
            
            // Reload comments
            const panel = this.commentPanels.get(eventId);
            if (panel) {
                await this.loadCommentsInPanel(eventId, panel);
            }
            
            console.info('Comment submitted successfully');
            
        } catch (error) {
            console.error('Failed to submit comment:', error);
            alert('Failed to submit comment. Please try again.');
        }
    }

    /**
     * Like comment
     * @param {string} commentId - Comment ID
     */
    async likeComment(commentId) {
        try {
            await this.commentManager.likeComment(commentId, 'current_user');
            console.info('Comment liked');
        } catch (error) {
            console.error('Failed to like comment:', error);
        }
    }

    /**
     * Reply to comment
     * @param {string} commentId - Comment ID
     */
    replyToComment(commentId) {
        // This would open a reply form
        console.info('Reply to comment:', commentId);
    }

    /**
     * Create comment UI elements
     */
    createCommentUI() {
        // This would create any persistent UI elements
        console.debug('Comment UI created');
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        this.eventBus.on('commentAdded', (data) => {
            this.handleCommentAdded(data);
        });
        
        this.eventBus.on('commentUpdated', (data) => {
            this.handleCommentUpdated(data);
        });
        
        this.eventBus.on('commentDeleted', (data) => {
            this.handleCommentDeleted(data);
        });
    }

    /**
     * Handle comment added event
     * @param {Object} data - Event data
     */
    handleCommentAdded(data) {
        if (this.selectedEvent === data.eventId) {
            this.loadCommentsInPanel(data.eventId, this.commentPanels.get(data.eventId));
        }
    }

    /**
     * Handle comment updated event
     * @param {Object} data - Event data
     */
    handleCommentUpdated(data) {
        // Update UI if needed
        console.debug('Comment updated:', data);
    }

    /**
     * Handle comment deleted event
     * @param {Object} data - Event data
     */
    handleCommentDeleted(data) {
        if (this.selectedEvent === data.eventId) {
            this.loadCommentsInPanel(data.eventId, this.commentPanels.get(data.eventId));
        }
    }

    /**
     * Destroy the comment UI
     */
    destroy() {
        // Remove all comment bubbles
        this.commentBubbles.forEach((bubbles, eventId) => {
            this.removeCommentBubbles(eventId);
        });
        
        // Remove all panels
        this.commentPanels.forEach((panel, eventId) => {
            if (panel.parentNode) {
                panel.parentNode.removeChild(panel);
            }
        });
        
        // Clear maps
        this.commentBubbles.clear();
        this.commentPanels.clear();
        
        // Remove event listeners
        this.eventBus.off('commentAdded');
        this.eventBus.off('commentUpdated');
        this.eventBus.off('commentDeleted');
    }
}
