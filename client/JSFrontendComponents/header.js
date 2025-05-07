let header = document.getElementsByTagName("header")[0];
const currentUser = JSON.parse(localStorage.getItem('currentUser'));
let welcomeMessage = '';
if (currentUser && currentUser.username) {
    welcomeMessage = `<span style="margin-right: 15px; font-size: 0.9em;">Welcome, ${currentUser.username}!</span>`;
}

header.innerHTML = `
    <div class="container" style="display: flex; justify-content: space-between; align-items: center;">
        <h1>Stock Portfolio Visualizer</h1>
        <div>
            ${welcomeMessage}
            <button id="logout-button" class="btn" style="background-color: #6c757d;">Logout</button>
        </div>
    </div>
`;

const logoutButton = document.getElementById('logout-button');
if (logoutButton) {
    logoutButton.addEventListener('click', () => {
        localStorage.removeItem('authToken');
        localStorage.removeItem('currentUser');
        window.location.href = 'login.html';
    });
}