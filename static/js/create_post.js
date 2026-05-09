import {
getErrorMessage,
hideModal,
showModal,
} from "/static/js/utils.js";
import { getToken } from '/static/js/auth.js';

const createForm = document.getElementById("createPostForm");

createForm.addEventListener("submit", async (event) => {
// Stop default form submission - we'll handle it with JavaScript
event.preventDefault();

const token = getToken();
if (!token) {
    window.location.href = '/login';
    return;
}

// Gather form values into a plain object {title: "...", content: "..."}
const formData = new FormData(createForm);
const postData = Object.fromEntries(formData.entries());



try {
    // POST to our API as JSON
    const response = await fetch("/api/posts", {
    method: "POST",
    headers: {
        "Content-Type": "application/json",
        'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(postData),
    });

    if (response.status === 401) {
        window.location.href = '/login';
        return;
    }

    if (response.ok) {
    const data = await response.json();
    document.getElementById("successMessage").textContent =
        `Post "${data.title}" created successfully!`;

    hideModal("createPostModal");
    showModal("successModal");

    // Clear form
    createForm.reset();

    // Reload page after modal is hidden to show new post
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

    hideModal("createPostModal");
    showModal("errorModal");
    }
} catch (error) {
    document.getElementById("errorMessage").textContent =
    "Network error. Please check your connection and try again.";
    showModal("errorModal");
}
});