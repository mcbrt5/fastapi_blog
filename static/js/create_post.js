import {
    getErrorMessage,
    hideModal,
    showModal,
} from "/static/js/utils.js";
import { getToken } from '/static/js/auth.js';

const createForm = document.getElementById("createPostForm");

async function loadTags() {
    const response = await fetch('/api/tags');
    const tags = await response.json();
    const container = document.getElementById('tagCheckboxes');
    container.innerHTML = '';
    tags.forEach(tag => {
        const label = document.createElement('label');
        label.className = 'text-body-secondary text-decoration-none me-2 small';
        label.style.cursor = 'pointer';
        label.innerHTML = `
            <input type="checkbox" class="tag-checkbox d-none" value="${tag.id}">
            #${tag.name}
        `;
        label.querySelector('input').addEventListener('change', (e) => {
            if (e.target.checked) {
                label.classList.remove('text-body-secondary');
                label.classList.add('text-body-emphasis');
            } else {
                label.classList.remove('text-body-emphasis');
                label.classList.add('text-body-secondary');
            }
            enforceTagLimit();
        });
        container.appendChild(label);
    });
}

function enforceTagLimit() {
    const checked = document.querySelectorAll('.tag-checkbox:checked');
    const all = document.querySelectorAll('.tag-checkbox');
    if (checked.length >= 5) {
        all.forEach(cb => {
            if (!cb.checked) cb.disabled = true;
        });
    } else {
        all.forEach(cb => cb.disabled = false);
    }
}

loadTags();

createForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const token = getToken();
    if (!token) {
        window.location.href = '/login';
        return;
    }

    const formData = new FormData(createForm);
    const postData = Object.fromEntries(formData.entries());

    const tagIds = [...document.querySelectorAll('.tag-checkbox:checked')]
        .map(cb => parseInt(cb.value));
    postData.tag_ids = tagIds;

    try {
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
            createForm.reset();

            document.querySelectorAll('.tag-checkbox').forEach(cb => {
                cb.checked = false;
                cb.disabled = false;
            });
            document.querySelectorAll('#tagCheckboxes label').forEach(label => {
                label.classList.remove('text-body-emphasis');
                label.classList.add('text-body-secondary');
            });

            document.getElementById("successModal").addEventListener(
                "hidden.bs.modal",
                () => { window.location.reload(); },
                { once: true },
            );
        } else {
            const error = await response.json();
            document.getElementById("errorMessage").textContent = getErrorMessage(error);
            hideModal("createPostModal");
            showModal("errorModal");
        }
    } catch (error) {
        document.getElementById("errorMessage").textContent =
            "Network error. Please check your connection and try again.";
        showModal("errorModal");
    }
});