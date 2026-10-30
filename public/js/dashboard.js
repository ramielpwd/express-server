// Shows the visitor count from the server
async function loadStats() {
    const countBox = document.querySelector('#visitor-count');
    try {
        const response = await fetch('/api/stats');
        const data = await response.json();
        countBox.textContent = data.visitorCount;
    } catch (err) {
        countBox.textContent = 'unavailable';
    }
}

document.querySelector('#logout-button').addEventListener('click', async () => {
    try {
        await fetch('/logout', { method: 'POST' });
    } catch (err) {
        // Even if this fails, the home page shows the real state
    }
    window.location.href = '/';
});

loadStats();
