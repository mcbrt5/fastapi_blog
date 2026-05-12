import { getErrorMessage, showModal } from '/static/js/utils.js';

const forgotPasswordForm = document.getElementById('forgotPasswordForm');
const submitBtn = document.getElementById('submitBtn');

forgotPasswordForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  // Disable button during submission
  submitBtn.disabled = true;
  submitBtn.textContent = 'Sending...';

  const formData = new FormData(forgotPasswordForm);
  const data = Object.fromEntries(formData.entries());

  try {
    const response = await fetch('/api/users/forgot-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    // Always show success message (even if email doesn't exist - security)
    if (response.status === 202) {
      document.getElementById('successMessage').textContent =
        'If an account exists with this email, you will receive password reset instructions shortly.';
      showModal('successModal');

      // Clear form
      forgotPasswordForm.reset();
    } else {
      const error = await response.json();
      document.getElementById('errorMessage').textContent = getErrorMessage(error);
      showModal('errorModal');
    }
  } catch (error) {
    document.getElementById('errorMessage').textContent =
      'Network error. Please check your connection and try again.';
    showModal('errorModal');
  } finally {
    // Re-enable button
    submitBtn.disabled = false;
    submitBtn.textContent = 'Send Reset Link';
  }
});