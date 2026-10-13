const logoutButton = document.getElementById('#logoutButton');

logoutButton.addEventListener('click', async () => {
    const response = await fetch('/logout', {
        method: 'POST',
    })
    const data = await response.json().catch(() => { success: false })
        ;
    console.log(data.success)
    if (data.success) {
        window.location.href = '/';
    }
});