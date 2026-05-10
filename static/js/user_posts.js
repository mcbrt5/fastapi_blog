async function loadMorePosts() {
    loadMoreBtn.disabled = true;
    loadMoreBtn.textContent = 'Loading...';

    let errorOccurred = false;

    try {
      const response = await fetch(`/api/users/${userId}/posts?skip=${currentOffset}&limit=${limit}`);

      if (!response.ok) {
        throw new Error('Failed to fetch posts');
      }

      const data = await response.json();

      for (const post of data.posts) {
        postsContainer.insertAdjacentHTML('beforeend', createPostHTML(post));
      }

      currentOffset += data.posts.length;
      hasMore = data.has_more;

      if (!hasMore) {
        loadMoreBtn.classList.add('d-none');
      }
    } catch (error) {
      errorOccurred = true;
      console.error('Error loading posts:', error);
      loadMoreBtn.textContent = 'Error - Click to Retry';
      loadMoreBtn.disabled = false;
    } finally {
      if (!errorOccurred && hasMore) {
        loadMoreBtn.disabled = false;
        loadMoreBtn.textContent = 'Load More Posts';
      }
    }
  }

  if (loadMoreBtn) {
    loadMoreBtn.addEventListener('click', loadMorePosts);
  }