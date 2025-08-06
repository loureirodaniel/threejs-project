export class EventsPanel {
    constructor() {
        this.currentYear = 2010;
        this.isVisible = false;
        this.panel = null;
        this.eventsContainer = null;
        
        // Sample events data for each year (2010-2019)
        this.eventsData = {
            2010: [
                { title: 'First Major Event', description: 'A significant milestone that marked the beginning of a new era.', category: 'Technology' },
                { title: 'Innovation Launch', description: 'Groundbreaking technology that changed the industry landscape.', category: 'Innovation' },
                { title: 'Global Initiative', description: 'Worldwide collaboration that brought together diverse communities.', category: 'Collaboration' }
            ],
            2011: [
                { title: 'Breakthrough Discovery', description: 'Revolutionary findings that opened new possibilities.', category: 'Research' },
                { title: 'Market Expansion', description: 'Strategic growth that reached new markets and audiences.', category: 'Business' },
                { title: 'Community Building', description: 'Creating connections and fostering meaningful relationships.', category: 'Community' }
            ],
            2012: [
                { title: 'Digital Transformation', description: 'Complete overhaul of digital infrastructure and processes.', category: 'Technology' },
                { title: 'Sustainability Project', description: 'Environmental initiatives that made a lasting impact.', category: 'Environment' },
                { title: 'Creative Revolution', description: 'Artistic and creative breakthroughs that inspired millions.', category: 'Art' }
            ],
            2013: [
                { title: 'Mobile Revolution', description: 'The shift to mobile-first experiences and applications.', category: 'Technology' },
                { title: 'Data Analytics', description: 'Advanced analytics that provided unprecedented insights.', category: 'Analytics' },
                { title: 'User Experience', description: 'Redefining how users interact with digital products.', category: 'UX' }
            ],
            2014: [
                { title: 'Cloud Computing', description: 'Migration to cloud-based solutions and infrastructure.', category: 'Technology' },
                { title: 'Security Enhancement', description: 'Advanced security measures to protect user data.', category: 'Security' },
                { title: 'Performance Optimization', description: 'Significant improvements in speed and efficiency.', category: 'Performance' }
            ],
            2015: [
                { title: 'AI Integration', description: 'Introduction of artificial intelligence and machine learning.', category: 'AI' },
                { title: 'Automation Systems', description: 'Streamlining processes through intelligent automation.', category: 'Automation' },
                { title: 'Predictive Analytics', description: 'Using data to predict future trends and behaviors.', category: 'Analytics' }
            ],
            2016: [
                { title: 'Virtual Reality', description: 'Exploring immersive experiences and virtual environments.', category: 'VR' },
                { title: 'Blockchain Technology', description: 'Implementing decentralized and secure systems.', category: 'Blockchain' },
                { title: 'IoT Development', description: 'Connecting devices and creating smart ecosystems.', category: 'IoT' }
            ],
            2017: [
                { title: 'Machine Learning', description: 'Advanced algorithms that learn and adapt over time.', category: 'ML' },
                { title: 'Natural Language Processing', description: 'Understanding and processing human language.', category: 'NLP' },
                { title: 'Computer Vision', description: 'Teaching machines to see and interpret visual data.', category: 'Vision' }
            ],
            2018: [
                { title: 'Edge Computing', description: 'Processing data closer to the source for faster results.', category: 'Edge' },
                { title: '5G Networks', description: 'Next-generation connectivity and communication.', category: '5G' },
                { title: 'Quantum Computing', description: 'Exploring the future of computational power.', category: 'Quantum' }
            ],
            2019: [
                { title: 'Future Vision', description: 'Setting the stage for the next decade of innovation.', category: 'Future' },
                { title: 'Global Impact', description: 'Creating positive change on a worldwide scale.', category: 'Impact' },
                { title: 'Legacy Building', description: 'Establishing foundations for future generations.', category: 'Legacy' }
            ]
        };
        
        this.init();
    }
    
    init() {
        this.createPanel();
        this.setupEventListeners();
    }
    
    createPanel() {
        // Create main panel container
        this.panel = document.createElement('div');
        this.panel.id = 'events-panel';
        this.panel.style.cssText = `
            position: fixed;
            top: 0;
            right: -400px;
            width: 400px;
            height: 100vh;
            background: linear-gradient(135deg, rgba(0, 0, 0, 0.95) 0%, rgba(20, 20, 20, 0.95) 100%);
            backdrop-filter: blur(10px);
            border-left: 1px solid rgba(255, 255, 255, 0.1);
            z-index: 1000;
            transition: right 0.5s cubic-bezier(0.4, 0, 0.2, 1);
            overflow-y: auto;
            overflow-x: hidden;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        `;
        
        // Create header
        const header = document.createElement('div');
        header.style.cssText = `
            padding: 30px 30px 20px 30px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            position: sticky;
            top: 0;
            background: inherit;
            z-index: 10;
        `;
        
        const title = document.createElement('h2');
        title.textContent = 'Timeline Events';
        title.style.cssText = `
            margin: 0 0 10px 0;
            font-size: 28px;
            font-weight: 700;
            color: #ffffff;
            letter-spacing: -0.5px;
        `;
        
        const yearDisplay = document.createElement('div');
        yearDisplay.id = 'current-year-display';
        yearDisplay.textContent = '2010';
        yearDisplay.style.cssText = `
            font-size: 18px;
            color: #64b5f6;
            font-weight: 600;
            margin-bottom: 15px;
        `;
        
        const subtitle = document.createElement('p');
        subtitle.textContent = 'Explore the key events and milestones for each year';
        subtitle.style.cssText = `
            margin: 0;
            font-size: 14px;
            color: rgba(255, 255, 255, 0.7);
            line-height: 1.5;
        `;
        
        header.appendChild(title);
        header.appendChild(yearDisplay);
        header.appendChild(subtitle);
        
        // Create events container
        this.eventsContainer = document.createElement('div');
        this.eventsContainer.id = 'events-container';
        this.eventsContainer.style.cssText = `
            padding: 20px 30px 30px 30px;
        `;
        
        // Create toggle button
        this.toggleButton = document.createElement('div');
        this.toggleButton.id = 'events-panel-toggle';
        this.toggleButton.innerHTML = '📅';
        this.toggleButton.style.cssText = `
            position: fixed;
            top: 50%;
            right: 20px;
            transform: translateY(-50%);
            width: 50px;
            height: 50px;
            background: rgba(0, 0, 0, 0.8);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            z-index: 1001;
            font-size: 20px;
            transition: all 0.3s ease;
            backdrop-filter: blur(10px);
        `;
        
        // Add hover effects
        this.toggleButton.addEventListener('mouseenter', () => {
            this.toggleButton.style.background = 'rgba(100, 181, 246, 0.9)';
            this.toggleButton.style.transform = 'translateY(-50%) scale(1.1)';
        });
        
        this.toggleButton.addEventListener('mouseleave', () => {
            this.toggleButton.style.background = 'rgba(0, 0, 0, 0.8)';
            this.toggleButton.style.transform = 'translateY(-50%) scale(1)';
        });
        
        // Assemble panel
        this.panel.appendChild(header);
        this.panel.appendChild(this.eventsContainer);
        
        // Add to DOM
        document.body.appendChild(this.panel);
        document.body.appendChild(this.toggleButton);
        
        // Initially populate with 2010 events
        this.updateEvents(2010);
    }
    
    setupEventListeners() {
        // Toggle button click
        this.toggleButton.addEventListener('click', () => {
            this.toggle();
        });
        
        // Listen for timeline year changes
        window.addEventListener('timelineYearChange', (event) => {
            this.updateEvents(event.detail.year);
        });
        
        // Listen for scene changes to show/hide panel
        window.addEventListener('sceneChange', (event) => {
            if (event.detail.sceneName === 'timeline') {
                // Show the toggle button but keep panel hidden initially
                this.toggleButton.style.display = 'flex';
            } else {
                this.hide();
                this.toggleButton.style.display = 'none';
            }
        });
        
        // Initially hide the toggle button until we're in timeline scene
        this.toggleButton.style.display = 'none';
        
        // Check if we're already in timeline scene on initialization
        setTimeout(() => {
            // Dispatch a custom event to check current scene
            const checkSceneEvent = new CustomEvent('checkCurrentScene');
            window.dispatchEvent(checkSceneEvent);
        }, 100);
        
        // Close panel when clicking outside (optional)
        document.addEventListener('click', (event) => {
            if (this.isVisible && 
                !this.panel.contains(event.target) && 
                !this.toggleButton.contains(event.target)) {
                this.hide();
            }
        });
    }
    
    updateEvents(year) {
        this.currentYear = year;
        
        // Update year display
        const yearDisplay = document.getElementById('current-year-display');
        if (yearDisplay) {
            yearDisplay.textContent = year.toString();
        }
        
        // Clear existing events
        this.eventsContainer.innerHTML = '';
        
        // Get events for current year
        const events = this.eventsData[year] || [];
        
        if (events.length === 0) {
            // Show no events message
            const noEvents = document.createElement('div');
            noEvents.style.cssText = `
                text-align: center;
                padding: 40px 20px;
                color: rgba(255, 255, 255, 0.5);
                font-style: italic;
            `;
            noEvents.textContent = 'No events recorded for this year';
            this.eventsContainer.appendChild(noEvents);
            return;
        }
        
        // Create event cards
        events.forEach((event, index) => {
            const eventCard = this.createEventCard(event, index);
            this.eventsContainer.appendChild(eventCard);
        });
    }
    
    createEventCard(event, index) {
        const card = document.createElement('div');
        card.style.cssText = `
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 16px;
            transition: all 0.3s ease;
            cursor: pointer;
            position: relative;
            overflow: hidden;
        `;
        
        // Add hover effects
        card.addEventListener('mouseenter', () => {
            card.style.background = 'rgba(255, 255, 255, 0.08)';
            card.style.transform = 'translateY(-2px)';
            card.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.3)';
        });
        
        card.addEventListener('mouseleave', () => {
            card.style.background = 'rgba(255, 255, 255, 0.05)';
            card.style.transform = 'translateY(0)';
            card.style.boxShadow = 'none';
        });
        
        // Category badge
        const categoryBadge = document.createElement('div');
        categoryBadge.textContent = event.category;
        categoryBadge.style.cssText = `
            display: inline-block;
            background: linear-gradient(135deg, #64b5f6, #1976d2);
            color: white;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 12px;
        `;
        
        // Event title
        const title = document.createElement('h3');
        title.textContent = event.title;
        title.style.cssText = `
            margin: 0 0 8px 0;
            font-size: 18px;
            font-weight: 600;
            color: #ffffff;
            line-height: 1.3;
        `;
        
        // Event description
        const description = document.createElement('p');
        description.textContent = event.description;
        description.style.cssText = `
            margin: 0;
            font-size: 14px;
            color: rgba(255, 255, 255, 0.7);
            line-height: 1.5;
        `;
        
        // Add animation delay for staggered appearance
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            card.style.transition = 'all 0.4s ease';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, index * 100);
        
        // Assemble card
        card.appendChild(categoryBadge);
        card.appendChild(title);
        card.appendChild(description);
        
        return card;
    }
    
    show() {
        if (!this.isVisible) {
            this.panel.style.right = '0';
            this.isVisible = true;
            this.toggleButton.innerHTML = '✕';
            this.toggleButton.style.right = '420px';
        }
    }
    
    hide() {
        if (this.isVisible) {
            this.panel.style.right = '-400px';
            this.isVisible = false;
            this.toggleButton.innerHTML = '📅';
            this.toggleButton.style.right = '20px';
        }
    }
    
    toggle() {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }
    
    isPanelVisible() {
        return this.isVisible;
    }
    
    getCurrentYear() {
        return this.currentYear;
    }
    
    // Method to add custom events (can be called externally)
    addEvent(year, event) {
        if (!this.eventsData[year]) {
            this.eventsData[year] = [];
        }
        this.eventsData[year].push(event);
        
        // Update display if this is the current year
        if (year === this.currentYear) {
            this.updateEvents(year);
        }
    }
    
    // Method to remove events
    removeEvent(year, eventTitle) {
        if (this.eventsData[year]) {
            this.eventsData[year] = this.eventsData[year].filter(event => event.title !== eventTitle);
            
            // Update display if this is the current year
            if (year === this.currentYear) {
                this.updateEvents(year);
            }
        }
    }
    
    // Method to clear all events for a year
    clearEvents(year) {
        this.eventsData[year] = [];
        
        // Update display if this is the current year
        if (year === this.currentYear) {
            this.updateEvents(year);
        }
    }
} 