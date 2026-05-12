import { getErrorMessage, showModal } from '/static/js/utils.js';

// Extract token from URL query parameter
const urlParams = new URLSearchParams(window.location.search);
const token = urlParams.get('token');

// If no token, show error and disable form
if (!token) {
document.getElementById('errorMessage').textContent =
    'Invalid or missing reset token. Please request a new password reset.';
showModal('errorModal');
document.getElementById('submitBtn').disabled = true;
}

const resetPasswordForm = document.getElementById('resetPasswordForm');
const submitBtn = document.getElementById('submitBtn');

resetPasswordForm.addEventListener('submit', async (event) => {
event.preventDefault();

const newPassword = document.getElementById('newPassword').value;
const confirmPassword = document.getElementById('confirmPassword').value;

// Client-side password matching validation
if (newPassword !== confirmPassword) {
    document.getElementById('errorMessage').textContent = 'Passwords do not match.';
    showModal('errorModal');
    return;
}

// Disable button during submission
submitBtn.disabled = true;
submitBtn.textContent = 'Resetting...';

try {
    const response = await fetch('/api/users/reset-password', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
    },
    body: JSON.stringify({
        token: token,
        new_password: newPassword,
    }),
    });

    if (response.ok) {
    document.getElementById('successMessage').textContent =
        'Password reset successfully! You can now log in with your new password.';
    showModal('successModal');

    // Redirect to login after modal is hidden
    document.getElementById('successModal').addEventListener('hidden.bs.modal', () => {
        window.location.href = '/login';
    }, { once: true });
    } else {
    const error = await response.json();
    document.getElementById('errorMessage').textContent = getErrorMessage(error);
    showModal('errorModal');

    // If token is invalid/expired, suggest requesting new one
    if (response.status === 400) {
        document.getElementById('errorMessage').textContent +=
        ' Please request a new password reset.';
    }
    }
} catch (error) {
    document.getElementById('errorMessage').textContent =
    'Network error. Please check your connection and try again.';
    showModal('errorModal');
} finally {
    // Re-enable button
    submitBtn.disabled = false;
    submitBtn.textContent = 'Reset Password';
}
});