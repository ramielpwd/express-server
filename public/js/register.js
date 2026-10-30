const registerForm = document.querySelector('#register-form');
const registerMessage = document.querySelector('#register-message');

registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    registerMessage.textContent = '';

    try {
        const response = await fetch('/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: document.querySelector('#username').value,
                password: document.querySelector('#password').value
            })
        });
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            registerMessage.textContent = data.error || 'Could not make your account. Please try again.';
            return;
        }

        // New accounts are logged in right away
        window.location.href = '/guestbook';
    } catch (err) {
        registerMessage.textContent = 'Could not reach the server. Check your connection.';
    }
});
