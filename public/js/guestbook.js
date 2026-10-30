const list = document.querySelector('#guestbook-list');
const listError = document.querySelector('#list-error');

// Who is logged in. Filled in by loadCurrentUser().
let currentUser = null;

// Asks the server who we are, so we know which entries we can change
async function loadCurrentUser() {
    try {
        const response = await fetch('/api/whoami');
        const data = await response.json();
        if (data.loggedIn) {
            currentUser = data;
            document.querySelector('#current-user').textContent = data.username;
        }
    } catch (err) {
        // If this fails, we just won't show Edit and Delete buttons
    }
}

// True if this user wrote the entry, or is an admin.
// This only decides which buttons to SHOW. The server checks again.
function canEdit(entry) {
    if (!currentUser) return false;
    return entry.authorId === currentUser.userId || currentUser.role === 'admin';
}

// Gets every entry from the server and draws the list, newest first
async function loadMessages() {
    listError.textContent = '';

    try {
        const response = await fetch('/api/guestbook');
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            listError.textContent = data.error || 'Could not load messages.';
            return;
        }

        list.innerHTML = ''; // clearing with an empty string is safe

        // Newest first: copy the array, then reverse the copy
        [...data].reverse().forEach(entry => {
            list.append(makeEntry(entry));
        });
    } catch (err) {
        listError.textContent = 'Could not reach the server. Check your connection.';
    }
}

// Builds one <li> for an entry. All text goes in with textContent.
function makeEntry(entry) {
    const li = document.createElement('li');

    const name = document.createElement('strong');
    name.textContent = entry.name;

    const date = document.createElement('small');
    date.textContent = new Date(entry.createdAt).toLocaleString();
    if (entry.updatedAt) date.textContent += ' (edited)';

    const msg = document.createElement('p');
    msg.textContent = entry.msg;

    li.append(name, ' ', date, msg);

    if (canEdit(entry)) {
        const editButton = document.createElement('button');
        editButton.type = 'button';
        editButton.textContent = 'Edit';
        editButton.addEventListener('click', () => startEditing(li, entry));

        const deleteButton = document.createElement('button');
        deleteButton.type = 'button';
        deleteButton.textContent = 'Delete';
        deleteButton.addEventListener('click', () => deleteEntry(entry));

        li.append(editButton, ' ', deleteButton);
    }

    return li;
}

// Swaps an entry for a small edit form
function startEditing(li, entry) {
    li.innerHTML = '';

    const textarea = document.createElement('textarea');
    textarea.maxLength = 280;
    textarea.value = entry.msg;

    const saveButton = document.createElement('button');
    saveButton.type = 'button';
    saveButton.textContent = 'Save';

    const cancelButton = document.createElement('button');
    cancelButton.type = 'button';
    cancelButton.textContent = 'Cancel';

    const error = document.createElement('p');
    error.setAttribute('role', 'alert');

    saveButton.addEventListener('click', () => saveEdit(entry, textarea.value, error));
    cancelButton.addEventListener('click', () => li.replaceWith(makeEntry(entry)));

    li.append(textarea, saveButton, ' ', cancelButton, error);
    textarea.focus();
}

// UPDATE: sends the new message with PUT
async function saveEdit(entry, newMsg, errorBox) {
    errorBox.textContent = '';

    try {
        const response = await fetch(`/api/guestbook/${entry.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ msg: newMsg })
        });

        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            errorBox.textContent = data.error || 'Could not save. Please try again.';
            return;
        }

        loadMessages();
    } catch (err) {
        errorBox.textContent = 'Could not reach the server. Check your connection.';
    }
}

// DELETE: asks first, then removes the entry
async function deleteEntry(entry) {
    if (!confirm('Delete this message?')) return;
    listError.textContent = '';

    try {
        const response = await fetch(`/api/guestbook/${entry.id}`, { method: 'DELETE' });

        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            listError.textContent = data.error || 'Could not delete. Please try again.';
            return;
        }

        loadMessages();
    } catch (err) {
        listError.textContent = 'Could not reach the server. Check your connection.';
    }
}

// CREATE: sends a new entry, then redraws the list
document.querySelector('#guestbook-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorBox = document.querySelector('#form-error');
    errorBox.textContent = '';

    try {
        const response = await fetch('/api/guestbook', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                msg: document.querySelector('#msg').value,
                website: document.querySelector('#website').value
            })
        });

        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            errorBox.textContent = data.error || 'Something went wrong. Please try again.';
            return; // keep what the user typed
        }
    } catch (err) {
        errorBox.textContent = 'Could not reach the server. Check your connection.';
        return;
    }

    e.target.reset();
    loadMessages();
});

// Find out who we are first, so the right buttons show up
loadCurrentUser().then(loadMessages);
