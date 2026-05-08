import { getErrorMessage, showModal } from '/static/js/utils.js';

      const registerForm = document.getElementById('registerForm');
      const passwordInput = document.getElementById('password');
      const confirmPasswordInput = document.getElementById('confirmPassword');
      const passwordError = document.getElementById('passwordError');

      // Check passwords match on input
      confirmPasswordInput.addEventListener('input', () => {
        if (passwordInput.value !== confirmPasswordInput.value) {
          passwordError.classList.remove('d-none');
          confirmPasswordInput.setCustomValidity('Passwords do not match');
        } else {
          passwordError.classList.add('d-none');
          confirmPasswordInput.setCustomValidity('');
        }
      });

      registerForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        // Check passwords match
        if (passwordInput.value !== confirmPasswordInput.value) {
          passwordError.classList.remove('d-none');
          return;
        }

        const formData = new FormData(registerForm);
        const userData = {
          username: formData.get('username'),
          email: formData.get('email'),
          password: formData.get('password'),
        };

        try {
          const response = await fetch('/api/users', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(userData),
          });

          if (response.ok) {
            // Show success modal and redirect to login
            document.getElementById('successMessage').textContent =
              'Account created successfully! Please login.';
            showModal('successModal');

            document.getElementById('successModal').addEventListener('hidden.bs.modal', () => {
              window.location.href = '/login';
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