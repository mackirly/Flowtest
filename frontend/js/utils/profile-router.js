/**
 * Profile page router for Flowtest 2.0
 * Handles profile page routing and authorization
 */

class ProfileRouter {
    constructor() {
        this.token = localStorage.getItem('flowtest_access_token');
        
        // Handle initial load
        if (!this.token) {
            this.redirect('/login.html');
            return;
        }
        
        // Available routes
        this.routes = {
            'personal-info': () => {
                this.showSection('personal-info');
                this.updateURL('personal-info');
            },
            'security': () => {
                this.showSection('security');
                this.updateURL('security');
            }
        };
        
        // Handle navigation
        this.setupEventListeners();
        this.handleInitialRoute();
    }
    
    setupEventListeners() {
        // Handle navigation items
        document.querySelectorAll('.profile-nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = e.currentTarget.getAttribute('href').substring(1);
                this.navigate(targetId);
            });
        });
        
        // Handle back/forward buttons
        window.addEventListener('popstate', () => this.handleRoute());
    }
    
    handleInitialRoute() {
        // Get section from URL hash or default to personal-info
        const hash = window.location.hash.substring(1) || 'personal-info';
        this.navigate(hash, true);
    }
    
    navigate(section, replace = false) {
        const route = this.routes[section];
        if (route) {
            route();
            if (!replace) {
                window.history.pushState(null, '', `#${section}`);
            }
        } else {
            // Invalid section - go to default
            this.navigate('personal-info', true);
        }
    }
    
    showSection(sectionId) {
        // Hide all sections
        document.querySelectorAll('.profile-section').forEach(section => {
            section.classList.add('hidden');
            section.classList.remove('active');
        });
        
        // Show target section
        const targetSection = document.getElementById(sectionId);
        if (targetSection) {
            targetSection.classList.remove('hidden');
            targetSection.classList.add('active');
        }
        
        // Update nav items
        document.querySelectorAll('.profile-nav-item').forEach(item => {
            const isActive = item.getAttribute('href') === `#${sectionId}`;
            item.classList.toggle('active', isActive);
        });
    }
    
    updateURL(section) {
        const url = new URL(window.location);
        url.hash = section;
        window.history.replaceState(null, '', url);
    }
    
    redirect(path) {
        window.location.href = path;
    }
}

export default ProfileRouter;