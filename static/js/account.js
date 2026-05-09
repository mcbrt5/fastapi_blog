import { getCurrentUser, getToken, logout, clearUserCache } from '/static/js/auth.js';
import { getErrorMessage, showModal, hideModal } from '/static/js/utils.js';

let currentUserId = null;

// Load current user data and populate form
async function loadUserData() {
  const user = await getCurrentUser();

  // Redirect to login if not authenticated
  if (!user) {
    window.location.href = '/login';
    return;
  }

  currentUserId = user.id;

  // Populate display info
  document.getElementById('displayUsername').textContent = user.username;
  document.getElementById('displayEmail').textContent = user.email;
  document.getElementById('profileImage').src = user.image_path;

  // Populate form fields
  document.getElementById('username').value = user.username;
  document.getElementById('email').value = user.email;
}

// Update Profile Form Handler
const updateForm = document.getElementById('updateProfileForm');
updateForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const token = getToken();
  if (!token) {
    window.location.href = '/login';
    return;
  }

  const formData = new FormData(updateForm);
  const userData = Object.fromEntries(formData.entries());

  try {
    const response = await fetch(`/api/users/${currentUserId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(userData),
    });

    if (response.status === 401) {
      window.location.href = '/login';
      return;
    }

    if (response.status === 403) {
      document.getElementById('errorMessage').textContent =
        'You are not authorized to update this profile.';
      showModal('errorModal');
      return;
    }

    if (response.ok) {
      const data = await response.json();

      // Clear cache so next getCurrentUser() fetches fresh data
      clearUserCache();

      // Update display
      document.getElementById('displayUsername').textContent = data.username;
      document.getElementById('displayEmail').textContent = data.email;

      document.getElementById('successMessage').textContent =
        'Profile updated successfully!';
      showModal('successModal');
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

// Logout Handler
document.getElementById('logoutBtn').addEventListener('click', logout);

// Delete Account Handler
document.getElementById('confirmDeleteAccount').addEventListener('click', async () => {
  const token = getToken();
  if (!token) {
    window.location.href = '/login';
    return;
  }

  try {
    const response = await fetch(`/api/users/${currentUserId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (response.status === 401) {
      window.location.href = '/login';
      return;
    }

    if (response.status === 403) {
      document.getElementById('errorMessage').textContent =
        'You are not authorized to delete this account.';
      hideModal('deleteAccountModal');
      showModal('errorModal');
      return;
    }

    if (response.status === 204) {
      // Account deleted successfully
      localStorage.removeItem('access_token');
      window.location.href = '/';
    } else {
      const error = await response.json();
      document.getElementById('errorMessage').textContent = getErrorMessage(error);
      hideModal('deleteAccountModal');
      showModal('errorModal');
    }
  } catch (error) {
    document.getElementById('errorMessage').textContent =
      'Network error. Please check your connection and try again.';
    showModal('errorModal');
  }
});

// Load user data on page load
loadUserData();