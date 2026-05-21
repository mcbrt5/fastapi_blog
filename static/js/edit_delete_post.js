import { getCurrentUser, getToken } from '/static/js/auth.js';
import { getErrorMessage, showModal, hideModal } from '/static/js/utils.js';

const scriptTag = document.querySelector('script[data-post-id]');
const postId = parseInt(scriptTag.getAttribute("data-post-id"));
const postUserId = parseInt(scriptTag.getAttribute("data-post-user-id"));

async function loadEditTags() {
    const [tagsResponse, postResponse] = await Promise.all([
        fetch('/api/tags'),
        fetch(`/api/posts/${postId}`),
    ]);
    const tags = await tagsResponse.json();
    const post = await postResponse.json();
    const currentTagIds = post.tags.map(t => t.id);

    const container = document.getElementById('editTagCheckboxes');
    container.innerHTML = '';
    tags.forEach(tag => {
        const label = document.createElement('label');
        label.className = 'text-decoration-none me-2 small';
        const isSelected = currentTagIds.includes(tag.id);
        label.classList.add(isSelected ? 'text-body-emphasis' : 'text-body-secondary');
        label.style.cursor = 'pointer';
        label.innerHTML = `
            <input type="checkbox" class="edit-tag-checkbox d-none" value="${tag.id}" ${isSelected ? 'checked' : ''}>
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
            enforceEditTagLimit();
        });
        container.appendChild(label);
    });

    enforceEditTagLimit();
}

function enforceEditTagLimit() {
    const checked = document.querySelectorAll('.edit-tag-checkbox:checked');
    const all = document.querySelectorAll('.edit-tag-checkbox');
    if (checked.length >= 5) {
        all.forEach(cb => { if (!cb.checked) cb.disabled = true; });
    } else {
        all.forEach(cb => cb.disabled = false);
    }
}

async function checkOwnership() {
    const user = await getCurrentUser();
    if (user && user.id === postUserId) {
        document.getElementById('postActions').classList.remove('d-none');
        loadEditTags();
    }
}

const editForm = document.getElementById('editPostForm');
editForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const token = getToken();
    if (!token) { window.location.href = '/login'; return; }

    const formData = new FormData(editForm);
    const postData = Object.fromEntries(formData.entries());
    delete postData.post_id;

    const tagIds = [...document.querySelectorAll('.edit-tag-checkbox:checked')]
        .map(cb => parseInt(cb.value));
    postData.tag_ids = tagIds;

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