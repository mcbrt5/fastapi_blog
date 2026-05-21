async function loadSidebar() {
    try {
        const response = await fetch('/api/users?limit=20');
        const users = await response.json();

        const usersList = document.getElementById('usersList');
        usersList.innerHTML = '';

        if (users.length === 0) {
            usersList.innerHTML = '<li class="list-group-item text-body-secondary">No users yet.</li>';
            return;
        }

        users.forEach(user => {
            const li = document.createElement('li');
            li.className = 'list-group-item';
            li.innerHTML = `<a href="/users/${user.id}/posts">${user.username}</a>`;
            usersList.appendChild(li);
        });

    } catch {
        document.getElementById('usersList').innerHTML =
            '<li class="list-group-item text-body-secondary">Failed to load users.</li>';
    }
}

loadSidebar();