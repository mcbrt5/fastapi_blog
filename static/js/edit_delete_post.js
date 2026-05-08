import {
  getErrorMessage,
  hideModal,
  showModal,
} from "/static/js/utils.js";

// EDITED: Get post ID from data attribute on the script tag (replaces Jinja2 {{ post.id }})
const postId = document.querySelector('script[data-post-id]').getAttribute("data-post-id");

// Edit Post Form Handler
const editForm = document.getElementById("editPostForm");
editForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(editForm);
  const postData = Object.fromEntries(formData.entries());
  delete postData.post_id;
  try {
    const response = await fetch(`/api/posts/${postId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(postData),
    });
    if (response.ok) {
      document.getElementById("successMessage").textContent =
        "Post updated successfully!";
      hideModal("editModal");
      showModal("successModal");
      document
        .getElementById("successModal")
        .addEventListener(
          "hidden.bs.modal",
          () => {
            window.location.reload();
          },
          { once: true },
        );
    } else {
      const error = await response.json();
      document.getElementById("errorMessage").textContent =
        getErrorMessage(error);
      hideModal("editModal");
      showModal("errorModal");
    }
  } catch (error) {
    document.getElementById("errorMessage").textContent =
      "Network error. Please check your connection and try again.";
    showModal("errorModal");
  }
});

// Delete Post Handler
const deleteButton = document.getElementById("confirmDelete");
deleteButton.addEventListener("click", async () => {
  try {
    const response = await fetch(`/api/posts/${postId}`, {
      method: "DELETE",
    });
    if (response.status === 204) {
      window.location.href = "/";
    } else {
      const error = await response.json();
      document.getElementById("errorMessage").textContent =
        getErrorMessage(error);
      hideModal("deleteModal");
      showModal("errorModal");
    }
  } catch (error) {
    document.getElementById("errorMessage").textContent =
      "Network error. Please check your connection and try again.";
    showModal("errorModal");
  }
});