let loginSignup = document.querySelector('.login-signup');
loginSignup.innerHTML = `
    <h2>Login/Signup</h2>
    <input type="text" id="username" placeholder="Username" />
    <input type="password" id="password" placeholder="Password" />
    <div class="login-signup-buttons">
        <button class="login-button">Login</button>
        <button class="signup-button">Signup</button>
    </div>

`;

document.getElementsByClassName('login-button')[0].addEventListener('click', () => {
    window.location.href = 'main.html';
});

