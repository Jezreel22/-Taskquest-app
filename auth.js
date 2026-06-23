/* =====================================================
   AUTH MODULE — User Login & Profile Management
   ===================================================== */

const Auth = (() => {
    const AVATARS = ['🦊', '🐺', '🦁', '🐯', '🐻', '🦄', '🐉', '🦅', '🦋', '🌟'];

    function init() {
        console.log('[Auth] Initializing auth module...');
        try {
            bindEvents();
            console.log('[Auth] Events bound successfully');
        } catch (err) {
            console.error('[Auth] Error during init:', err);
        }
    }

    function isLoggedIn() {
        return !!Storage.getCurrentUser();
    }

    function getCurrentProfile() {
        const username = Storage.getCurrentUser();
        if (!username) return null;
        return Storage.getUserProfile(username);
    }

    // ---- Show/Hide Screens ----
    function showAuthScreen() {
        console.log('[Auth] showAuthScreen called');
        const authScreen = document.getElementById('auth-screen');
        const appWrapper = document.getElementById('app-wrapper');

        if (authScreen) {
            authScreen.classList.remove('hidden');
            console.log('[Auth] Auth screen shown');
        } else {
            console.error('[Auth] Auth screen element not found');
        }

        if (appWrapper) {
            appWrapper.classList.add('hidden');
            console.log('[Auth] App wrapper hidden');
        } else {
            console.error('[Auth] App wrapper element not found');
        }

        renderAuthScreen('login');
    }

    function showApp() {
        document.getElementById('auth-screen').classList.add('hidden');
        document.getElementById('app-wrapper').classList.remove('hidden');
        updateProfileUI();
    }

    function renderAuthScreen(mode) {
        console.log('[Auth] renderAuthScreen called with mode:', mode);
        const loginTab = document.getElementById('auth-tab-login');
        const registerTab = document.getElementById('auth-tab-register');
        const loginForm = document.getElementById('auth-login-form');
        const registerForm = document.getElementById('auth-register-form');

        if (mode === 'login') {
            if (loginTab) loginTab.classList.add('active');
            if (registerTab) registerTab.classList.remove('active');
            if (loginForm) loginForm.classList.remove('hidden');
            if (registerForm) registerForm.classList.add('hidden');
            console.log('[Auth] Switched to login mode');
        } else {
            if (loginTab) loginTab.classList.remove('active');
            if (registerTab) registerTab.classList.add('active');
            if (loginForm) loginForm.classList.add('hidden');
            if (registerForm) registerForm.classList.remove('hidden');
            renderAvatarPicker();
            console.log('[Auth] Switched to register mode');
        }

        // Populate existing users as quick-login chips
        renderUserChips();
        clearAuthErrors();
    }

    function renderUserChips() {
        const container = document.getElementById('user-chips');
        if (!container) return;

        const users = Storage.getUserList();
        if (users.length === 0) {
            container.innerHTML = '<p class="auth-hint">No profiles yet. Create one!</p>';
            return;
        }

        container.innerHTML = `
            <p class="auth-hint">Continue as:</p>
            <div class="user-chip-row">
                ${users.map(u => `
                    <button class="user-chip" data-username="${u.username}" type="button">
                        <span class="user-chip-avatar">${u.avatar || '🦊'}</span>
                        <span class="user-chip-name">${escapeHtml(u.displayName || u.username)}</span>
                    </button>
                `).join('')}
            </div>
        `;

        container.querySelectorAll('.user-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                document.getElementById('auth-login-username').value = chip.dataset.username;
                handleLogin();
            });
        });
    }

    function renderAvatarPicker() {
        const picker = document.getElementById('avatar-picker');
        if (!picker) return;

        picker.innerHTML = AVATARS.map((emoji, i) => `
            <button type="button" class="avatar-option ${i === 0 ? 'selected' : ''}" 
                    data-avatar="${emoji}" aria-label="${emoji}">
                ${emoji}
            </button>
        `).join('');

        picker.querySelectorAll('.avatar-option').forEach(btn => {
            btn.addEventListener('click', () => {
                picker.querySelectorAll('.avatar-option').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
            });
        });
    }

    // ---- Login ----
    function handleLogin() {
        console.log('[Auth] handleLogin called');
        const usernameRaw = document.getElementById('auth-login-username')?.value?.trim();
        console.log('[Auth] Username entered:', usernameRaw ? '***' : 'empty');
        if (!usernameRaw) {
            showAuthError('login', 'Please enter your username.');
            return;
        }

        const username = sanitiseUsername(usernameRaw);
        const users = Storage.getUserList();

        if (users.length === 0) {
            // No users exist — auto-register this one
            const registered = Storage.registerUser({
                username,
                displayName: usernameRaw,
                avatar: AVATARS[0],
                createdAt: new Date().toISOString(),
            });
            if (!registered) {
                showAuthError('login', 'Could not create profile. Please try again.');
                return;
            }
        } else {
            const profile = Storage.getUserProfile(username);
            if (!profile) {
                showAuthError('login', `No profile found for "${usernameRaw}". Please register first.`);
                return;
            }
        }

        Storage.setCurrentUser(username);
        onLoginSuccess();
    }

    // ---- Register ----
    function handleRegister() {
        console.log('[Auth] handleRegister called');
        const displayNameRaw = document.getElementById('auth-reg-displayname')?.value?.trim();
        const usernameRaw = document.getElementById('auth-reg-username')?.value?.trim();
        console.log('[Auth] Register - Display name:', displayNameRaw ? '***' : 'empty', 'Username:', usernameRaw ? '***' : 'empty');

        if (!displayNameRaw) {
            showAuthError('register', 'Please enter your display name.');
            return;
        }
        if (!usernameRaw) {
            showAuthError('register', 'Please enter a username.');
            return;
        }
        if (usernameRaw.length < 3) {
            showAuthError('register', 'Username must be at least 3 characters.');
            return;
        }

        const username = sanitiseUsername(usernameRaw);
        const avatar = document.querySelector('.avatar-option.selected')?.dataset?.avatar || AVATARS[0];

        const registered = Storage.registerUser({
            username,
            displayName: displayNameRaw,
            avatar,
            createdAt: new Date().toISOString(),
        });

        if (!registered) {
            showAuthError('register', 'That username is already taken. Please choose another.');
            return;
        }

        Storage.setCurrentUser(username);
        onLoginSuccess();
    }

    function onLoginSuccess() {
        showApp();
        // Boot the full app (binds events, init modules, renders everything)
        App.bootApp();
    }

    // ---- Logout ----
    function logout() {
        Storage.logoutUser();
        showAuthScreen();
    }

    // ---- UI helpers ----
    function updateProfileUI() {
        const profile = getCurrentProfile();
        if (!profile) return;

        const avatarEl = document.getElementById('profile-avatar');
        const nameEl = document.getElementById('profile-displayname');

        if (avatarEl) avatarEl.textContent = profile.avatar || '🦊';
        if (nameEl) nameEl.textContent = profile.displayName || profile.username;
    }

    function showAuthError(form, message) {
        const id = form === 'login' ? 'auth-login-error' : 'auth-reg-error';
        const el = document.getElementById(id);
        if (el) {
            el.textContent = message;
            el.classList.remove('hidden');
        }
    }

    function clearAuthErrors() {
        document.querySelectorAll('.auth-error').forEach(el => {
            el.textContent = '';
            el.classList.add('hidden');
        });
    }

    function sanitiseUsername(raw) {
        // Lowercase, strip spaces and special chars for the storage key
        return raw.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // ---- Event bindings ----
    function bindEvents() {
        try {
            // Tab switching
            const loginTab = document.getElementById('auth-tab-login');
            const registerTab = document.getElementById('auth-tab-register');
            const loginBtn = document.getElementById('auth-login-btn');
            const registerBtn = document.getElementById('auth-register-btn');
            const loginForm = document.getElementById('auth-login-form');
            const registerForm = document.getElementById('auth-register-form');

            if (loginTab) loginTab.addEventListener('click', () => {
                console.log('[Auth] Login tab clicked');
                alert('Login tab clicked!'); // Temporary debug
                renderAuthScreen('login');
            });
            if (registerTab) registerTab.addEventListener('click', () => {
                console.log('[Auth] Register tab clicked');
                alert('Register tab clicked!'); // Temporary debug
                renderAuthScreen('register');
            });

            // Login form
            if (loginBtn) loginBtn.addEventListener('click', handleLogin);
            if (loginForm) {
                loginForm.addEventListener('keydown', e => {
                    if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
                        e.preventDefault();
                        handleLogin();
                    }
                });
            }

            // Register form
            if (registerBtn) registerBtn.addEventListener('click', handleRegister);
            if (registerForm) {
                registerForm.addEventListener('keydown', e => {
                    if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
                        e.preventDefault();
                        handleRegister();
                    }
                });
            }

            // Logout button
            const logoutBtn = document.getElementById('logout-btn');
            if (logoutBtn) logoutBtn.addEventListener('click', logout);
        } catch (err) {
            console.error('Error binding auth events:', err);
        }
    }

    return {
        init,
        isLoggedIn,
        getCurrentProfile,
        showAuthScreen,
        showApp,
        updateProfileUI,
        logout,
    };
})();
