import { getCurrentUser } from '/static/js/auth.js';

async function updateAuthUI() {
    const user = await getCurrentUser();
    const loggedInNav = document.getElementById('loggedInNav');
    const loggedOutNav = document.getElementById('loggedOutNav');
    const accountBtn = document.getElementById('accountBtn');

    if (user) {
        loggedInNav.classList.remove('d-none');
        loggedInNav.classList.add('d-flex');
        loggedOutNav.classList.add('d-none');
        accountBtn.textContent = user.username;
    } else {
        loggedInNav.classList.add('d-none');
        loggedInNav.classList.remove('d-flex');
        loggedOutNav.classList.remove('d-none');
        accountBtn.textContent = 'Account';
    }
}

updateAuthUI();