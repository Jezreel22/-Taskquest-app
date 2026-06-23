/* =====================================================
   STORAGE MODULE — LocalStorage Persistence Layer
   User-namespaced keys support multi-profile login
   ===================================================== */

const Storage = (() => {
    // Global keys (not user-scoped)
    const GLOBAL_KEYS = {
        CURRENT_USER: 'tq_current_user',
        USER_LIST: 'tq_user_list',
    };

    // Per-user key builders — all data is namespaced under the username
    function userKey(key) {
        const user = getCurrentUser();
        const prefix = user ? `tq_u_${user}_` : 'tq_guest_';
        return prefix + key;
    }

    // ---- User Management ----
    function getCurrentUser() {
        try {
            return localStorage.getItem(GLOBAL_KEYS.CURRENT_USER) || null;
        } catch (e) {
            return null;
        }
    }

    function setCurrentUser(username) {
        try {
            localStorage.setItem(GLOBAL_KEYS.CURRENT_USER, username);
        } catch (e) {}
    }

    function logoutUser() {
        try {
            localStorage.removeItem(GLOBAL_KEYS.CURRENT_USER);
        } catch (e) {}
    }

    function getUserList() {
        try {
            const data = localStorage.getItem(GLOBAL_KEYS.USER_LIST);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            return [];
        }
    }

    function registerUser(profile) {
        // profile = { username, displayName, avatar, createdAt }
        const users = getUserList();
        const exists = users.find(u => u.username === profile.username);
        if (exists) return false; // username taken
        users.push(profile);
        try {
            localStorage.setItem(GLOBAL_KEYS.USER_LIST, JSON.stringify(users));
        } catch (e) {}
        return true;
    }

    function getUserProfile(username) {
        const users = getUserList();
        return users.find(u => u.username === username) || null;
    }

    function updateUserProfile(username, updates) {
        const users = getUserList();
        const idx = users.findIndex(u => u.username === username);
        if (idx !== -1) {
            users[idx] = { ...users[idx], ...updates };
            try {
                localStorage.setItem(GLOBAL_KEYS.USER_LIST, JSON.stringify(users));
            } catch (e) {}
        }
    }

    // ---- Generic get/set (user-namespaced) ----
    function get(key) {
        try {
            const data = localStorage.getItem(userKey(key));
            return data ? JSON.parse(data) : null;
        } catch (e) {
            console.error(`Storage.get error for key "${key}":`, e);
            return null;
        }
    }

    function set(key, value) {
        try {
            localStorage.setItem(userKey(key), JSON.stringify(value));
        } catch (e) {
            console.error(`Storage.set error for key "${key}":`, e);
        }
    }

    function remove(key) {
        localStorage.removeItem(userKey(key));
    }

    // ---- Tasks ----
    function getTasks() {
        return get('tasks') || [];
    }

    function saveTasks(tasks) {
        set('tasks', tasks);
    }

    function addTask(task) {
        const tasks = getTasks();
        tasks.push(task);
        saveTasks(tasks);
        return tasks;
    }

    function updateTask(id, updates) {
        const tasks = getTasks();
        const index = tasks.findIndex(t => t.id === id);
        if (index !== -1) {
            tasks[index] = { ...tasks[index], ...updates };
            saveTasks(tasks);
        }
        return tasks;
    }

    function deleteTask(id) {
        let tasks = getTasks();
        tasks = tasks.filter(t => t.id !== id);
        saveTasks(tasks);
        return tasks;
    }

    function getTaskById(id) {
        const tasks = getTasks();
        return tasks.find(t => t.id === id) || null;
    }

    // ---- Gamification ----
    function getGamification() {
        return get('gamification') || {
            totalScore: 0,
            xp: 0,
            level: 1,
            streak: 0,
            longestStreak: 0,
            lastCompletionDate: null,
            tasksCompleted: 0,
            dailyHistory: {},
            rankIndex: 0,
        };
    }

    function saveGamification(data) {
        set('gamification', data);
    }

    // ---- Settings ----
    function getSettings() {
        return get('settings') || {
            notificationsEnabled: false,
            alarmSound: 'default',
            alarmVolume: 0.7,
        };
    }

    function saveSettings(settings) {
        set('settings', settings);
    }

    // ---- Activity Tracking ----
    function getLastActive() {
        return get('last_active');
    }

    function updateLastActive() {
        set('last_active', new Date().toISOString());
    }

    // ---- Onboarding ----
    function isOnboardingComplete() {
        return get('onboarding_complete') === true;
    }

    function completeOnboarding() {
        set('onboarding_complete', true);
    }

    // ---- Notifications ----
    function isNotificationDismissed() {
        return get('notif_dismissed') === true;
    }

    function dismissNotification() {
        set('notif_dismissed', true);
    }

    // ---- Achievements ----
    function getAchievements() {
        return get('achievements') || [];
    }

    function setAchievements(list) {
        set('achievements', list);
    }

    return {
        // User management
        getCurrentUser, setCurrentUser, logoutUser,
        getUserList, registerUser, getUserProfile, updateUserProfile,
        // Data
        get, set, remove,
        getTasks, saveTasks, addTask, updateTask, deleteTask, getTaskById,
        getGamification, saveGamification,
        getSettings, saveSettings,
        getLastActive, updateLastActive,
        isOnboardingComplete, completeOnboarding,
        isNotificationDismissed, dismissNotification,
        getAchievements, setAchievements,
    };
})();
