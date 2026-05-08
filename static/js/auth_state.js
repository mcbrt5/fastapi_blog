import { getCurrentUser, logout } from '/static/js/auth.js';

        // Update navbar based on auth state
        async function updateAuthUI() {
            const user = await getCurrentUser();
            const loggedInNav = document.getElementById('loggedInNav');
            const loggedOutNav = document.getElementById('loggedOutNav');

            if (user) {
            loggedInNav.classList.remove('d-none');
            loggedInNav.classList.add('d-flex');
            loggedOutNav.classList.add('d-none');
            document.getElementById('usernameDisplay').textContent = user.email;
            } else {
            loggedInNav.classList.add('d-none');
            loggedInNav.classList.remove('d-flex');
            loggedOutNav.classList.remove('d-none');
            }
        }

        // Logout handler
        document.getElementById('logoutBtn').addEventListener('click', logout);

        // Update UI on page load
        updateAuthUI();