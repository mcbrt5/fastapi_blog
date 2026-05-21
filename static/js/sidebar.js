async function loadSidebar() {
    try {
        const [usersResponse, tagsResponse] = await Promise.all([
            fetch('/api/users?limit=20'),
            fetch('/api/tags'),
        ]);

        const users = await usersResponse.json();
        const tags = await tagsResponse.json();


        // Users
        const usersList = document.getElementById('usersList');
        usersList.innerHTML = '';

        if (users.length === 0) {
            usersList.innerHTML = '<li class="list-group-item text-body-secondary">No users yet.</li>';
        } else {
            users.forEach(user => {
                const li = document.createElement('li');
                li.className = 'list-group-item';
                li.innerHTML = `<a href="/users/${user.id}/posts">${user.username}</a>`;
                usersList.appendChild(li);
            });
        }

        // Tags
        const tagsList = document.getElementById('tagsList');
        tagsList.innerHTML = '';

        if (tags.length === 0) {
            tagsList.innerHTML = '<span class="text-body-secondary small">No tags yet.</span>';
        } else {
            tags.forEach(tag => {
                const a = document.createElement('a');
                a.href = `/tags/${tag.name}`;
                a.className = 'text-body-secondary text-decoration-none me-2 small';
                a.textContent = `#${tag.name}`;
                tagsList.appendChild(a);
            });
        }

    } catch {
        document.getElementById('usersList').innerHTML =
            '<li class="list-group-item text-body-secondary">Failed to load.</li>';
    }
}

loadSidebar();