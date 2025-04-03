/**
 * Mock authentication service
 */
class AuthService {
    constructor() {
        this.STORAGE_KEY = 'stock_app_auth';
        this.SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours

        // Mock user database
        this.users = {
            'demo@example.com': {
                email: 'demo@example.com',
                name: 'Demo User',
                password: 'password123' // In a real app, this would be hashed
            },
            'user@example.com': {
                email: 'user@example.com',
                name: 'Regular User',
                password: 'password123'
            }
        };
    }

    /**
     * Initialize auth service
     */
    init() {
        // Check if user is already logged in
        const authData = this._getStoredAuth();
        if (authData && this._isSessionValid(authData)) {
            return true;
        }

        // Clear invalid session data
        this.logout();
        return false;
    }

    /**
     * Login with email and password
     * @param {string} email - User email
     * @param {string} password - User password
     * @returns {Object} User data on success
     */
    login(email, password) {
        // Simulate server delay
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                const user = this.users[email];

                if (!user || user.password !== password) {
                    reject(new Error('Invalid email or password'));
                    return;
                }

                // Create session
                const session = {
                    user: {
                        email: user.email,
                        name: user.name
                    },
                    expiresAt: Date.now() + this.SESSION_DURATION
                };

                localStorage.setItem(this.STORAGE_KEY, JSON.stringify(session));
                resolve(user);
            }, 800);
        });
    }

    /**
     * Register new user
     * @param {Object} userData - User registration data
     * @returns {Object} User data on success
     */
    register(userData) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                const { email, name, password } = userData;

                // Check if user already exists
                if (this.users[email]) {
                    reject(new Error('User already exists'));
                    return;
                }

                // Create new user
                this.users[email] = {
                    email,
                    name,
                    password
                };

                // Login the new user
                this.login(email, password)
                    .then(resolve)
                    .catch(reject);
            }, 800);
        });
    }

    /**
     * Logout current user
     */
    logout() {
        localStorage.removeItem(this.STORAGE_KEY);
    }

    /**
     * Get current user data
     * @returns {Object|null} Current user or null if not logged in
     */
    getCurrentUser() {
        const authData = this._getStoredAuth();

        if (authData && this._isSessionValid(authData)) {
            return authData.user;
        }

        return null;
    }

    /**
     * Check if user is logged in
     * @returns {boolean} Login status
     */
    isLoggedIn() {
        return this.getCurrentUser() !== null;
    }

    // Private helper methods
    _getStoredAuth() {
        const data = localStorage.getItem(this.STORAGE_KEY);
        return data ? JSON.parse(data) : null;
    }

    _isSessionValid(authData) {
        return authData.expiresAt > Date.now();
    }
}

export default new AuthService();