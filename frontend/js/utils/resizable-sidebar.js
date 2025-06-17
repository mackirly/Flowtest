// Resizable sidebar functionality
export function initResizableSidebar() {
    const sidebar = document.querySelector('aside');
    if (!sidebar) return;

    // Ensure sidebar has proper positioning
    sidebar.classList.add('fixed');
    
    // Get saved width from localStorage
    const savedWidth = localStorage.getItem('flowtest_sidebar_width');
    if (savedWidth) {
        sidebar.style.width = savedWidth + 'px';
        // Update CSS variable for main content margin
        document.documentElement.style.setProperty('--sidebar-width', savedWidth + 'px');
    } else {
        // Set default width
        sidebar.style.width = '256px';
        document.documentElement.style.setProperty('--sidebar-width', '256px');
    }

    // Create resize handle
    const resizeHandle = document.createElement('div');
    resizeHandle.className = 'sidebar-resize-handle';
    resizeHandle.innerHTML = '<div class="resize-handle-line"></div>';
    sidebar.appendChild(resizeHandle);

    let isResizing = false;
    let startX = 0;
    let startWidth = 0;
    const minWidth = 200;
    const maxWidth = 400;

    // Mouse down on resize handle
    resizeHandle.addEventListener('mousedown', (e) => {
        isResizing = true;
        startX = e.clientX;
        startWidth = sidebar.offsetWidth;
        
        // Add classes for visual feedback
        document.body.classList.add('resizing-sidebar');
        resizeHandle.classList.add('active');
        
        // Prevent text selection while resizing
        e.preventDefault();
    });

    // Mouse move
    document.addEventListener('mousemove', (e) => {
        if (!isResizing) return;

        const diff = e.clientX - startX;
        let newWidth = startWidth + diff;

        // Apply constraints
        newWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
        
        sidebar.style.width = newWidth + 'px';
        // Update CSS variable for main content margin
        document.documentElement.style.setProperty('--sidebar-width', newWidth + 'px');
    });

    // Mouse up
    document.addEventListener('mouseup', () => {
        if (!isResizing) return;
        
        isResizing = false;
        document.body.classList.remove('resizing-sidebar');
        resizeHandle.classList.remove('active');
        
        // Save width to localStorage
        const finalWidth = sidebar.offsetWidth;
        localStorage.setItem('flowtest_sidebar_width', finalWidth);
        document.documentElement.style.setProperty('--sidebar-width', finalWidth + 'px');
    });

    // Touch support for mobile
    let touchStartX = 0;
    
    resizeHandle.addEventListener('touchstart', (e) => {
        const touch = e.touches[0];
        isResizing = true;
        startX = touch.clientX;
        startWidth = sidebar.offsetWidth;
        touchStartX = touch.clientX;
        
        document.body.classList.add('resizing-sidebar');
        resizeHandle.classList.add('active');
        e.preventDefault();
    });

    document.addEventListener('touchmove', (e) => {
        if (!isResizing) return;
        
        const touch = e.touches[0];
        const diff = touch.clientX - startX;
        let newWidth = startWidth + diff;

        newWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
        sidebar.style.width = newWidth + 'px';
        document.documentElement.style.setProperty('--sidebar-width', newWidth + 'px');
    });

    document.addEventListener('touchend', () => {
        if (!isResizing) return;
        
        isResizing = false;
        document.body.classList.remove('resizing-sidebar');
        resizeHandle.classList.remove('active');
        
        const finalWidth = sidebar.offsetWidth;
        localStorage.setItem('flowtest_sidebar_width', finalWidth);
        document.documentElement.style.setProperty('--sidebar-width', finalWidth + 'px');
    });
}

// Auto-initialize on DOM load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initResizableSidebar);
} else {
    initResizableSidebar();
}