// Check if user is authenticated
const authToken = localStorage.getItem('authToken');
if (!authToken) {
    // If no auth token is found, redirect to the login page
    window.location.href = '/';
} 