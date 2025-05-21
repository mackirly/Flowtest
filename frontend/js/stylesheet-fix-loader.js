/**
 * Early loader for stylesheet fix
 * This script is loaded as early as possible to fix CORS issues with stylesheets
 */
(() => {
    /**
     * Fix CORS issues with stylesheets
     * This allows reading cssRules from external stylesheets by cloning them locally
     */
    const StylesheetFixLoader = {
        // Store processed stylesheets
        processedStylesheets: new Map(),
        
        // Stylesheets to exclude from processing
        excludedDomains: [
            'cdn.tailwindcss.com',
            'cdn.jsdelivr.net'
        ],
        
        /**
         * Fix CORS issues with stylesheets
         * @returns {void}
         */
        initialize() {
            // Process all current stylesheets
            this.processAllStylesheets();
            
            // Set up a MutationObserver to watch for dynamically added stylesheets
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.type === 'childList') {
                        mutation.addedNodes.forEach((node) => {
                            // Check if added node is a link element with rel="stylesheet"
                            if (node.nodeName === 'LINK' && node.rel === 'stylesheet') {
                                this.processStylesheet(node);
                            }
                        });
                    }
                });
            });
            
            // Start observing the document for added stylesheets
            observer.observe(document.head, { 
                childList: true, 
                subtree: true 
            });
            
            console.log('[StylesheetFixLoader] Initialized and watching for stylesheet changes');
        },
        
        /**
         * Process all stylesheets in the document
         * @returns {void}
         */
        processAllStylesheets() {
            // Get all link elements with rel="stylesheet"
            const styleLinks = document.querySelectorAll('link[rel="stylesheet"]');
            
            // Process each stylesheet
            styleLinks.forEach((styleLink) => {
                this.processStylesheet(styleLink);
            });
        },
        
        /**
         * Process a single stylesheet
         * @param {HTMLLinkElement} linkElement - The link element of the stylesheet
         * @returns {void}
         */
        processStylesheet(linkElement) {
            // Skip if already processed or no href
            if (this.processedStylesheets.has(linkElement.href) || !linkElement.href) {
                return;
            }
            
            // Skip if from same origin (these shouldn't have CORS issues)
            if (this.isSameOrigin(linkElement.href)) {
                return;
            }
            
            // Skip excluded domains
            if (this.isExcludedDomain(linkElement.href)) {
                console.log(`[StylesheetFixLoader] Skipping excluded domain: ${linkElement.href}`);
                return;
            }
            
            console.log(`[StylesheetFixLoader] Processing external stylesheet: ${linkElement.href}`);
            this.processedStylesheets.set(linkElement.href, true);
            
            // Fetch the stylesheet content
            fetch(linkElement.href)
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`Failed to fetch stylesheet: ${response.statusText}`);
                    }
                    return response.text();
                })
                .then(cssText => {
                    // Create a new style element
                    const styleElement = document.createElement('style');
                    styleElement.textContent = cssText;
                    styleElement.dataset.source = linkElement.href;
                    
                    // Insert the style element before the link element
                    linkElement.parentNode.insertBefore(styleElement, linkElement);
                    
                    // Hide the original link element (keeping it to maintain references)
                    linkElement.disabled = true;
                    linkElement.dataset.fixed = 'true';
                    
                    console.log(`[StylesheetFixLoader] Successfully proxied stylesheet: ${linkElement.href}`);
                })
                .catch(error => {
                    console.error(`[StylesheetFixLoader] Error processing stylesheet ${linkElement.href}:`, error);
                });
        },
        
        /**
         * Check if a URL is from the same origin as the current page
         * @param {string} url - The URL to check
         * @returns {boolean} True if same origin, false otherwise
         */
        isSameOrigin(url) {
            try {
                const currentOrigin = window.location.origin;
                const urlOrigin = new URL(url, currentOrigin).origin;
                return currentOrigin === urlOrigin;
            } catch (e) {
                console.error('[StylesheetFixLoader] Error checking origin:', e);
                return false;
            }
        },
        
        /**
         * Check if a URL is from an excluded domain
         * @param {string} url - The URL to check
         * @returns {boolean} True if from an excluded domain, false otherwise
         */
        isExcludedDomain(url) {
            try {
                const urlObject = new URL(url);
                return this.excludedDomains.some(domain => urlObject.hostname.includes(domain));
            } catch (e) {
                console.error('[StylesheetFixLoader] Error checking excluded domain:', e);
                return false;
            }
        }
    };

    // Initialize immediately
    StylesheetFixLoader.initialize();
})();