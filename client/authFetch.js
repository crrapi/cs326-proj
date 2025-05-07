const API_BASE_URL = 'http://localhost:3000/api';

export async function fetchWithAuth(endpoint, options = {}) {
    const token = localStorage.getItem('authToken');
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };
    if (token) {
        console.log("token added"+ token)
        headers['authorization'] = `Bearer ${token}`;
    } else {
        console.log("no token found, you must login")
        return
    }
    const response = await fetch(`${API_BASE_URL}${endpoint}`, { ...options, headers });
    console.log(response)
    if (response.status === 401) {
        localStorage.removeItem('authToken');
        localStorage.removeItem('currentUser');
        throw new Error('Unauthorized or token expired. Please log in again.');
    }
    return response;
}