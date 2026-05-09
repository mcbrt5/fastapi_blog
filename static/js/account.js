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

// Image Preview Handler
const pictureInput = document.getElementById('pictureInput');
const imagePreview = document.getElementById('imagePreview');
const uploadBtn = document.getElementById('uploadPictureBtn');

pictureInput.addEventListener('change', (event) => {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      imagePreview.src = e.target.result;
      imagePreview.classList.remove('d-none');
    };
    reader.readAsDataURL(file);

    uploadBtn.disabled = false;
  } else {
    imagePreview.classList.add('d-none');
    uploadBtn.disabled = true;
  }
});

// Upload Profile Picture Handler
uploadBtn.addEventListener('click', async () => {
  const token = getToken();
  if (!token) {
    window.location.href = '/login';
    return;
  }

  const file = pictureInput.files[0];
  if (!file) {
    return;
  }

  // Use FormData for file uploads (not JSON)
  const formData = new FormData();
  formData.append('file', file);

  uploadBtn.disabled = true;
  uploadBtn.textContent = 'Uploading...';

  try {
    const response = await fetch(`/api/users/${currentUserId}/picture`, {
      method: 'PATCH',
      headers: {
        // Don't set Content-Type — browser sets multipart boundary automatically
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    if (response.status === 401) {
      window.location.href = '/login';
      return;
    }

    if (response.status === 403) {
      document.getElementById('errorMessage').textContent =
        'You are not authorized to update this profile picture.';
      showModal('errorModal');
      return;
    }

    if (response.ok) {
      const data = await response.json();

      clearUserCache();

      document.getElementById('profileImage').src = data.image_path;

      pictureInput.value = '';
      imagePreview.classList.add('d-none');

      document.getElementById('successMessage').textContent =
        'Profile picture updated successfully!';
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
  } finally {
    uploadBtn.disabled = pictureInput.files.length === 0;
    uploadBtn.textContent = 'Upload';
  }
  });