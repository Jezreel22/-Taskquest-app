/* =====================================================
   APP.JS — Main Application Entry Point
   ===================================================== */

const App = (() => {
    let currentView = 'dashboard';

    function init() {
        console.log('[App] Initializing app...');
        // Always bind auth events first
        try {
            Auth.init();
            console.log('[App] Auth initialized');
        } catch (err) {
            console.error('[App] Error initializing Auth:', err);
        }

        // Gate app startup behind login
        if (!Auth.isLoggedIn()) {
            console.log('[App] User not logged in, showing auth screen');
            Auth.showAuthScreen();
            return;
        }

        // User is logged in — show the app
        console.log('[App] User logged in, booting app');
        Auth.showApp();
        bootApp();
    }

    function bootApp() {
        // Update last active timestamp
        Storage.updateLastActive();

        // Initialize theme
        initTheme();

        // Set today's date in top bar and auto-update it
        initDateAutoUpdate();

        // Initialize modules
        Notifications.init();
        Pomodoro.init();
        Mascot.init();
        Calendar.render();
        Achievements.render();

        // Bind event listeners
        bindNavigation();
        bindModals();
        bindSidebar();
        bindMiscellaneous();

        // Check if first time (onboarding)
        if (!Storage.isOnboardingComplete()) {
            showOnboarding();
        } else {
            // Check notification permission
            if (!Storage.isNotificationDismissed() && ('Notification' in window) && Notification.permission === 'default') {
                document.getElementById('notification-banner').classList.remove('hidden');
            }
        }

        // Initial render
        Tasks.renderAll();
        Dashboard.render();

        // Check streak status
        Gamification.checkStreakStatus();
        Tasks.updateSidebarStats();
    }

    function updateDateDisplay() {
        const dateEl = document.getElementById('top-bar-date');
        if (dateEl) {
            const now = new Date();
            const options = { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' };
            dateEl.textContent = now.toLocaleDateString('en-US', options);
        }
    }

    function initDateAutoUpdate() {
        // Update date display every minute to always show current date
        updateDateDisplay();
        setInterval(updateDateDisplay, 60000); // Update every 60 seconds
    }

    // ---- Theme Management ----
    function initTheme() {
        const savedTheme = localStorage.getItem('taskquest-theme') || 'dark';
        const html = document.documentElement;
        html.setAttribute('data-theme', savedTheme);
        updateThemeIcon(savedTheme);
    }

    function toggleTheme() {
        const html = document.documentElement;
        const currentTheme = html.getAttribute('data-theme') || 'dark';
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        html.setAttribute('data-theme', newTheme);
        localStorage.setItem('taskquest-theme', newTheme);
        updateThemeIcon(newTheme);
        Tasks.showToast('info', 'Theme Changed', `Switched to ${newTheme} mode.`);
    }

    function updateThemeIcon(theme) {
        const btn = document.getElementById('theme-toggle-btn');
        if (btn) {
            const icon = btn.querySelector('i');
            if (icon) {
                icon.className = theme === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
                btn.title = theme === 'dark' ? 'Switch to Light Mode (☀️)' : 'Switch to Dark Mode (🌙)';
            }
        }
    }

    // ---- Navigation ----
    function bindNavigation() {
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const view = link.dataset.view;
                switchView(view);
            });
        });
    }

    function switchView(viewName) {
        currentView = viewName;

        // Update nav active state
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.toggle('active', link.dataset.view === viewName);
        });

        // Update view visibility
        document.querySelectorAll('.view').forEach(view => {
            view.classList.toggle('active', view.id === `view-${viewName}`);
        });

        // Update title
        const titles = {
            dashboard: 'Dashboard',
            tasks: 'My Tasks',
            calendar: 'Calendar',
            completed: 'Completed',
            achievements: 'Achievements',
            recommendations: 'Suggestions',
        };
        document.getElementById('view-title').textContent = titles[viewName] || viewName;

        // Refresh data for the view
        if (viewName === 'dashboard') Dashboard.render();
        if (viewName === 'tasks') Tasks.renderTasksList();
        if (viewName === 'calendar') Calendar.render();
        if (viewName === 'completed') Tasks.renderCompletedList();
        if (viewName === 'achievements') Achievements.render();
        if (viewName === 'recommendations') Tasks.renderRecommendations();

        // Close sidebar on mobile
        closeSidebar();
    }

    // ---- Modals ----
    function bindModals() {
        // Add task button
        document.getElementById('add-task-btn').addEventListener('click', Tasks.openCreateModal);

        // Task form submit
        document.getElementById('task-form').addEventListener('submit', Tasks.handleFormSubmit);

        // Modal close buttons
        document.getElementById('modal-close-btn').addEventListener('click', Tasks.closeModal);
        document.getElementById('modal-cancel-btn').addEventListener('click', Tasks.closeModal);

        // Task modal overlay click to close
        document.getElementById('task-modal-overlay').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) Tasks.closeModal();
        });

        // Delete modal
        document.getElementById('delete-modal-close').addEventListener('click', Tasks.closeDeleteModal);
        document.getElementById('delete-cancel-btn').addEventListener('click', Tasks.closeDeleteModal);
        document.getElementById('delete-confirm-btn').addEventListener('click', Tasks.confirmDelete);
        document.getElementById('delete-modal-overlay').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) Tasks.closeDeleteModal();
        });

        // Encouragement modal
        document.getElementById('encouragement-dismiss-btn').addEventListener('click', () => {
            document.getElementById('encouragement-overlay').classList.remove('active');
            Storage.updateLastActive();
        });
        document.getElementById('encouragement-overlay').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) {
                e.currentTarget.classList.remove('active');
                Storage.updateLastActive();
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                Tasks.closeModal();
                Tasks.closeDeleteModal();
                document.getElementById('encouragement-overlay').classList.remove('active');
            }
            // Ctrl+N or Cmd+N to add task (when not in a modal)
            if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
                e.preventDefault();
                Tasks.openCreateModal();
            }
        });
    }

    // ---- Sidebar ----
    function bindSidebar() {
        const menuBtn = document.getElementById('menu-btn');
        const sidebarToggle = document.getElementById('sidebar-toggle');

        menuBtn.addEventListener('click', toggleSidebar);
        sidebarToggle.addEventListener('click', closeSidebar);

        // Category filters
        document.querySelectorAll('.category-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                Tasks.setFilter(chip.dataset.category);
            });
        });

        // Close sidebar on overlay click (mobile)
        document.addEventListener('click', (e) => {
            const sidebar = document.getElementById('sidebar');
            const menuBtn = document.getElementById('menu-btn');
            if (sidebar.classList.contains('open') && 
                !sidebar.contains(e.target) && 
                !menuBtn.contains(e.target)) {
                closeSidebar();
            }
        });
    }

    function toggleSidebar() {
        document.getElementById('sidebar').classList.toggle('open');
    }

    function closeSidebar() {
        document.getElementById('sidebar').classList.remove('open');
    }

    // ---- Miscellaneous ----
    function bindMiscellaneous() {
        // Theme toggle
        document.getElementById('theme-toggle-btn').addEventListener('click', toggleTheme);

        // Pomodoro timer
        document.getElementById('pomodoro-btn').addEventListener('click', () => {
            document.getElementById('pomodoro-overlay').classList.add('active');
        });
        
        document.getElementById('pomodoro-close-btn').addEventListener('click', () => {
            document.getElementById('pomodoro-overlay').classList.remove('active');
            Pomodoro.pause();
        });

        // Focus mode toggle
        document.getElementById('focus-mode-btn').addEventListener('click', toggleFocusMode);

        // Recurrence toggle - show/hide end date field
        document.getElementById('task-recurrence').addEventListener('change', (e) => {
            const endGroup = document.getElementById('task-recurrence-end-group');
            if (endGroup) {
                endGroup.style.display = e.target.value !== 'none' ? 'block' : 'none';
            }
        });

        // Search
        const searchInput = document.getElementById('search-input');
        let searchTimeout;
        searchInput.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                Tasks.setSearch(searchInput.value);
            }, 300);
        });

        // Sort
        document.getElementById('sort-select').addEventListener('change', (e) => {
            Tasks.setSort(e.target.value);
        });

        // Refresh recommendations
        document.getElementById('refresh-recommendations-btn').addEventListener('click', () => {
            Tasks.renderRecommendations();
            Tasks.showToast('info', 'Refreshed', 'Suggestions have been updated.');
        });

        // Notification banner
        document.getElementById('enable-notifications-btn').addEventListener('click', async () => {
            const granted = await Notifications.requestPermission();
            if (granted) {
                const settings = Storage.getSettings();
                settings.notificationsEnabled = true;
                Storage.saveSettings(settings);
                Tasks.showToast('success', 'Notifications Enabled', 'You\'ll be notified when tasks are due.');
            }
            document.getElementById('notification-banner').classList.add('hidden');
        });

        document.getElementById('dismiss-notifications-btn').addEventListener('click', () => {
            Storage.dismissNotification();
            document.getElementById('notification-banner').classList.add('hidden');
        });

        // Track user activity
        ['click', 'keydown', 'scroll'].forEach(event => {
            document.addEventListener(event, () => {
                Storage.updateLastActive();
            }, { passive: true, once: false });
        });
        // Throttle the activity updates
        let activityThrottle = null;
        document.addEventListener('mousemove', () => {
            if (!activityThrottle) {
                activityThrottle = setTimeout(() => {
                    Storage.updateLastActive();
                    activityThrottle = null;
                }, 60000); // Update at most once a minute for mousemove
            }
        }, { passive: true });
    }

    function toggleFocusMode() {
        const html = document.documentElement;
        const active = html.classList.toggle('focus-mode-active');
        const btn = document.getElementById('focus-mode-btn');
        if (btn) {
            const icon = btn.querySelector('i');
            if (icon) {
                icon.className = active ? 'fa-solid fa-bullseye' : 'fa-solid fa-eye-slash';
                btn.title = active ? 'Exit Focus Mode - Click to Disable (🎯)' : 'Enable Focus Mode - Hide Distractions (👁)';
            }
        }
        Tasks.showToast('info', active ? 'Focus Mode On 🎯' : 'Focus Mode Off', active ? 'Distraction-free mode enabled - all sidebars hidden.' : 'Safe to browse the app again.');
    }

    // ---- Onboarding ----
    function showOnboarding() {
        const overlay = document.getElementById('onboarding-overlay');
        overlay.classList.remove('hidden');

        const texts = Mascot.MESSAGES.onboarding;
        let step = 0;

        const textEl = document.getElementById('onboarding-text');
        const nextBtn = document.getElementById('onboarding-next-btn');
        const dots = document.querySelectorAll('.step-dot');

        function updateStep() {
            textEl.textContent = texts[step];
            dots.forEach((dot, i) => {
                dot.classList.toggle('active', i === step);
            });

            if (step === texts.length - 1) {
                nextBtn.innerHTML = "Let's Go! <i class='fa-solid fa-rocket'></i>";
            } else {
                nextBtn.innerHTML = 'Next <i class="fa-solid fa-arrow-right"></i>';
            }
        }

        nextBtn.addEventListener('click', () => {
            step++;
            if (step >= texts.length) {
                // Complete onboarding
                Storage.completeOnboarding();
                overlay.classList.add('hidden');

                // Ask for notification permission
                if (('Notification' in window) && Notification.permission === 'default') {
                    document.getElementById('notification-banner').classList.remove('hidden');
                }
            } else {
                updateStep();
            }
        });

        updateStep();
    }

    // Initialize on DOM ready
    document.addEventListener('DOMContentLoaded', init);

    return { switchView, bootApp };
})();
