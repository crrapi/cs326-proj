import { fetchWithAuth } from '../authFetch';
const loginSignupContainer = document.querySelector('.login-signup');
const authMessageElement = document.getElementById('auth-message');
const API_BASE_URL = 'http://localhost:3000/api';

if (loginSignupContainer) {
    loginSignupContainer.innerHTML = `
        <h2>Login / Signup</h2>
        <form id="auth-form">
            <div class="form-group">
                <label for="username">Username:</label>
                <input type="text" id="username" name="username" required>
            </div>
            <div class="form-group">
                <label for="password">Password:</label>
                <input type="password" id="password" name="password" required>
            </div>
            <div class="login-signup-buttons">
                <button type="button" id="login-button" class="btn">Login</button>
                <button type="button" id="signup-button" class="btn">Signup</button>
            </div>
        </form>
    `;

    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const loginButton = document.getElementById('login-button');
    const signupButton = document.getElementById('signup-button');

    const displayMessage = (message, isError = false) => {
        if (authMessageElement) {
            authMessageElement.textContent = message;
            authMessageElement.style.color = isError ? 'red' : 'green';
        }
    };

    loginButton.addEventListener('click', async () => {
        const username = usernameInput.value.trim();
        const password = passwordInput.value;

        if (!username || !password) {
            displayMessage('Username and password are required.', true);
            return;
        }
        displayMessage('Logging in...');

        try {
            const response = await fetch(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || `HTTP error! Status: ${response.status}`);
            }
            
            localStorage.setItem('authToken', data.token);
            localStorage.setItem('currentUser', JSON.stringify(data.user));
            displayMessage('Login successful! Redirecting...');
            window.location.href = 'main.html';
        } catch (error) {
            displayMessage(error.message, true);
            console.error('Login error:', error);
        }
    });

    signupButton.addEventListener('click', async () => {
        const username = usernameInput.value.trim();
        const password = passwordInput.value;

        if (!username || !password) {
            displayMessage('Username and password are required for signup.', true);
            return;
        }
        if (password.length < 6) {
            displayMessage('Password must be at least 6 characters.', true);
            return;
        }
        displayMessage('Signing up...');

        try {
            const response = await fetch(`${API_BASE_URL}/auth/signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || `HTTP error! Status: ${response.status}`);
            }

            displayMessage('Signup successful! Please log in.');
            if (data.token) {
                localStorage.setItem('authToken', data.token);
                localStorage.setItem('currentUser', JSON.stringify(data.user));
                window.location.href = 'main.html';
            } else {
                usernameInput.value = '';
                passwordInput.value = '';
            }
        } catch (error) {
            displayMessage(error.message, true);
            console.error('Signup error:', error);
        }
    });
} else {
    console.error("Login/Signup container element not found.");
}