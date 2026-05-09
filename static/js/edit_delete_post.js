import { getCurrentUser, getToken } from '/static/js/auth.js';
import { getErrorMessage, showModal, hideModal } from '/static/js/utils.js';

// EDITED: Get post and post.user ID from data attribute on the script tag (replaces Jinja2 {{ post.id }} and {{ post.user_id }})
const scriptTag = document.querySelector('script[data-post-id]');
const postId = parseInt(scriptTag.getAttribute("data-post-id"));
const postUserId = parseInt(scriptTag.getAttribute("data-post-user-id"));

// Show edit/delete buttons only if current user owns this post
async function checkOwnership() {
  const user = await getCurrentUser();
  if (user && user.id === postUserId) {
      document.getElementById('postActions').classList.remove('d-none');
  }
}

// Edit Post Form Handler
const editForm = document.getElementById('editPostForm');
editForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const token = getToken();
  if (!token) { window.location.href = '/login'; return; }

  const formData = new FormData(editForm);
  const postData = Object.fromEntries(formData.entries());
  delete postData.post_id;

  try {
      const response = await fetch(`/api/posts/${postId}`, {
          method: 'PATCH',
          headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(postData),
      });

      if (response.status === 401) { window.location.href = '/login'; return; }
      if (response.status === 403) {
          document.getElementById('errorMessage').textContent =
              'You are not authorized to edit this post.';
          hideModal('editModal');
          showModal('errorModal');
          return;
      }

      if (response.ok) {
          document.getElementById('successMessage').textContent =
              'Post updated successfully!';
          hideModal('editModal');
          showModal('successModal');

          document.getElementById('successModal').addEventListener('hidden.bs.modal', () => {
              window.location.reload();
          }, { once: true });
      } else {
          const error = await response.json();
          document.getElementById('errorMessage').textContent = getErrorMessage(error);
          hideModal('editModal');
          showModal('errorModal');
      }
  } catch (error) {
      document.getElementById('errorMessage').textContent =
          'Network error. Please check your connection and try again.';
      showModal('errorModal');
  }
});

// Delete Post Handler
const deleteButton = document.getElementById('confirmDelete');
deleteButton.addEventListener('click', async () => {
  const token = getToken();
  if (!token) { window.location.href = '/login'; return; }

  try {
      const response = await fetch(`/api/posts/${postId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.status === 401) { window.location.href = '/login'; return; }
      if (response.status === 403) {
          document.getElementById('errorMessage').textContent =
              'You are not authorized to delete this post.';
          hideModal('deleteModal');
          showModal('errorModal');
          return;
      }

      if (response.status === 204) {
          window.location.href = '/';
      } else {
          const error = await response.json();
          document.getElementById('errorMessage').textContent = getErrorMessage(error);
          hideModal('deleteModal');
          showModal('errorModal');
      }
  } catch (error) {
      document.getElementById('errorMessage').textContent =
          'Network error. Please check your connection and try again.';
      showModal('errorModal');
  }
});

checkOwnership();