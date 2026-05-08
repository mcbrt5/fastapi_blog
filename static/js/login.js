import { getErrorMessage, showModal } from '/static/js/utils.js';

      const loginForm = document.getElementById('loginForm');

      loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const formData = new FormData(loginForm);

        try {
          // OAuth2PasswordRequestForm expects form data, not JSON
          const response = await fetch('/api/users/token', {
            method: 'POST',
            body: formData,
          });

          if (response.ok) {
            const data = await response.json();

            // Store token in localStorage
            localStorage.setItem('access_token', data.access_token);

            // Show success modal and redirect to home
            document.getElementById('successMessage').textContent =
              'Login successful!';
            showModal('successModal');

            document.getElementById('successModal').addEventListener('hidden.bs.modal', () => {
              window.location.href = '/';
            }, { once: true });
          } else {
            const error = await response.json();
            document.getElementById('errorMessage').textContent = getErrorMessage(error);
            showModal('errorModal');
          }
        } catch (error) {
          document.getElementById('errorMessage').textContent =
            'Network error. Please check your connection and try again.';
          showModal('errorModal');
        }
      });