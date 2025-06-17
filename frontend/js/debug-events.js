// Debug script for events page
console.log('[DEBUG] Starting events page debug...');

// Check if the quick test section exists
window.addEventListener('DOMContentLoaded', function() {
    console.log('[DEBUG] DOM Content Loaded');
    
    // Check for the quick test section
    const quickSection = document.querySelector('.bg-gradient-to-r.from-green-500.to-emerald-600');
    if (quickSection) {
        console.log('[DEBUG] ✓ Quick test section found in DOM');
    } else {
        console.log('[DEBUG] ✗ Quick test section NOT found');
        
        // Check if we're on the events page
        const calendarGrid = document.getElementById('calendar-grid');
        if (calendarGrid) {
            console.log('[DEBUG] Calendar grid found - we are on events page');
            console.log('[DEBUG] Checking main content area...');
            
            const mainContent = document.querySelector('main');
            if (mainContent) {
                console.log('[DEBUG] Main content innerHTML length:', mainContent.innerHTML.length);
                console.log('[DEBUG] Looking for "Создать прогон" text:', mainContent.innerHTML.includes('Создать прогон'));
            }
        }
    }
    
    // Check for the button
    const quickTestBtn = document.getElementById('quick-test-event-btn');
    if (quickTestBtn) {
        console.log('[DEBUG] ✓ Quick test button found');
        console.log('[DEBUG] Button text:', quickTestBtn.textContent);
        
        // Test click
        quickTestBtn.addEventListener('click', function() {
            console.log('[DEBUG] Quick test button clicked!');
        });
    } else {
        console.log('[DEBUG] ✗ Quick test button NOT found');
    }
    
    // Check statistics elements
    const statsElements = {
        'active-test-runs-count': 'Active runs counter',
        'today-test-runs-count': 'Today runs counter',
        'active-participants-count': 'Participants counter'
    };
    
    for (const [id, name] of Object.entries(statsElements)) {
        const elem = document.getElementById(id);
        if (elem) {
            console.log(`[DEBUG] ✓ ${name} found:`, elem.textContent);
        } else {
            console.log(`[DEBUG] ✗ ${name} NOT found`);
        }
    }
    
    // Log page structure
    console.log('[DEBUG] Page structure check:');
    console.log('- Header:', !!document.querySelector('header'));
    console.log('- Sidebar:', !!document.querySelector('aside'));
    console.log('- Main:', !!document.querySelector('main'));
    console.log('- Calendar controls:', !!document.querySelector('#create-event-btn'));
    console.log('- Event modal:', !!document.querySelector('#event-modal'));
});

// Export for use in console
window.debugEvents = {
    checkQuickSection: function() {
        const section = document.querySelector('.bg-gradient-to-r.from-green-500.to-emerald-600');
        console.log('Quick section exists:', !!section);
        if (section) {
            console.log('Section HTML:', section.outerHTML.substring(0, 200) + '...');
        }
        return section;
    },
    
    injectQuickSection: function() {
        console.log('[DEBUG] Attempting to inject quick section...');
        const calendarControls = document.querySelector('.bg-white.dark\\:bg-gray-800.rounded-xl.shadow-sm.border.border-gray-200');
        if (calendarControls && calendarControls.parentElement) {
            const quickSectionHTML = `
                <div class="mb-6">
                    <div class="bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl shadow-lg overflow-hidden">
                        <div class="p-6">
                            <div class="flex items-center justify-between">
                                <div class="flex items-center space-x-4">
                                    <div class="bg-white/20 backdrop-blur-sm rounded-lg p-3">
                                        <i class="ri-play-circle-line text-3xl text-white"></i>
                                    </div>
                                    <div>
                                        <h3 class="text-xl font-semibold text-white">Создать прогон тестов</h3>
                                        <p class="text-green-100 text-sm mt-1">Организуйте командное тестирование с отслеживанием прогресса</p>
                                    </div>
                                </div>
                                <button id="quick-test-event-btn-injected" class="px-6 py-3 bg-white text-green-600 font-medium rounded-lg hover:bg-green-50 transition-all transform hover:scale-105 shadow-lg">
                                    <i class="ri-add-circle-line mr-2"></i>
                                    Создать прогон
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            calendarControls.insertAdjacentHTML('afterend', quickSectionHTML);
            console.log('[DEBUG] ✓ Quick section injected!');
            
            // Add click handler
            const injectedBtn = document.getElementById('quick-test-event-btn-injected');
            if (injectedBtn) {
                injectedBtn.addEventListener('click', function() {
                    alert('Быстрое создание прогона тестов!');
                });
            }
        } else {
            console.log('[DEBUG] ✗ Could not find insertion point');
        }
    }
};