// Shared My List logic and UI/UX for all pages
// Usage: Call initMyListButtons() after DOM is ready

const MYLIST_API_URL = 'http://localhost:3000/api';

// Utility: Show toast notification
function showMyListToast(message, type = 'success', undoCallback = null) {
    const toast = document.createElement('div');
    toast.className = `mylist-toast ${type}`;
    toast.innerHTML = `<span>${message}</span>`;
    if (undoCallback) {
        const undoBtn = document.createElement('button');
        undoBtn.className = 'mylist-undo-btn';
        undoBtn.textContent = 'Undo';
        undoBtn.onclick = () => {
            undoCallback();
            toast.remove();
        };
        toast.appendChild(undoBtn);
    }
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('show');
    }, 50);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, undoCallback ? 3500 : 2500);
}

// Utility: Spinner HTML
function myListSpinner() {
    return '<span class="mylist-spinner"></span>';
}

// Utility: Show loading spinner
function showMyListLoading(container) {
    if (container) {
        container.innerHTML = `<div class="loading"><div class="loading-spinner"></div>Loading your list...</div>`;
    }
}

// Utility: Show empty state
function showMyListEmpty(container) {
    if (container) {
        container.innerHTML = `<div class="empty-state"><i class="material-icons">favorite_border</i><h2>Your list is empty</h2><p>Start adding movies and TV shows to your list to see them here.</p></div>`;
    }
}

// Utility: Handle API errors (token expiry, etc.)
function handleMyListApiError(error) {
    if (error && (error.error === 'Please authenticate.' || error.message === 'Please authenticate.' || error.status === 401)) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = 'account.html';
    }
}

// Add to My List
async function addToMyList(item) {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('Please log in to use this feature');
    const response = await fetch(`${MYLIST_API_URL}/user/mylist`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(item)
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to add to My List');
    }
    return await response.json();
}

// Remove from My List
async function removeFromMyList(id, type) {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('Please log in to use this feature');
    const response = await fetch(`${MYLIST_API_URL}/user/mylist/${id}/${type}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to remove from My List');
    }
    return await response.json();
}

// Remove from My List with Undo
async function removeFromMyListWithUndo(id, type, card, undoCallback) {
    try {
        await removeFromMyList(id, type);
        if (card) card.remove();
        showMyListToast('Removed from My List', 'info', async () => {
            // Undo: re-add the item
            if (undoCallback) await undoCallback();
            showMyListToast('Undo: Added back to My List', 'success');
            syncMyListStorage();
        });
        syncMyListStorage();
    } catch (e) {
        showMyListToast(e.message || 'Failed to remove from My List', 'error');
        handleMyListApiError(e);
    }
}

// Toggle My List (with UI/UX)
async function toggleMyListButton(btn, item) {
    if (btn.classList.contains('mylist-processing')) return;
    btn.classList.add('mylist-processing', 'mylist-anim');
    const icon = btn.querySelector('.material-icons');
    const origIcon = icon ? icon.textContent : '';
    // Show spinner
    if (!btn.querySelector('.mylist-spinner')) {
        btn.insertAdjacentHTML('beforeend', myListSpinner());
    }
    const isInList = btn.classList.contains('in-list');
    let undoTimeout = null;
    let lastRemoved = null;
    try {
        if (isInList) {
            // Remove
            await removeFromMyList(item.id, item.type);
            btn.classList.remove('in-list');
            if (icon) icon.textContent = 'add';
            showMyListToast('Removed from My List', 'info', async () => {
                btn.classList.add('mylist-processing');
                if (!btn.querySelector('.mylist-spinner')) {
                    btn.insertAdjacentHTML('beforeend', myListSpinner());
                }
                await addToMyList(item);
                btn.classList.add('in-list');
                if (icon) icon.textContent = 'check';
                showMyListToast('Undo: Added back to My List', 'success');
                btn.classList.remove('mylist-processing');
                const sp = btn.querySelector('.mylist-spinner');
                if (sp) sp.remove();
                syncMyListStorage();
            });
        } else {
            // Add
            await addToMyList(item);
            btn.classList.add('in-list');
            if (icon) icon.textContent = 'check';
            showMyListToast('Added to My List', 'success');
        }
        syncMyListStorage();
    } catch (e) {
        showMyListToast(e.message || 'Failed to update My List', 'error');
    } finally {
        btn.classList.remove('mylist-processing', 'mylist-anim');
        const sp = btn.querySelector('.mylist-spinner');
        if (sp) sp.remove();
    }
}

// Sync localStorage with backend
async function syncMyListStorage() {
    const token = localStorage.getItem('token');
    if (!token) return;
    const response = await fetch(`${MYLIST_API_URL}/user/profile`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (response.ok) {
        const data = await response.json();
        localStorage.setItem('myList', JSON.stringify(data.myList));
    }
}

// Initialize all My List buttons on the page
function initMyListButtons() {
    document.querySelectorAll('.mylist-btn').forEach(btn => {
        if (btn.dataset.mylistInit) return; // Prevent double init
        btn.dataset.mylistInit = '1';
        btn.addEventListener('click', async function (e) {
            e.stopPropagation();
            e.preventDefault();
            const item = JSON.parse(btn.dataset.mylistItem);
            await toggleMyListButton(btn, item);
        });
    });
}

// Auto-init on DOMContentLoaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMyListButtons);
} else {
    initMyListButtons();
}

// Expose for manual use
window.initMyListButtons = initMyListButtons;
window.toggleMyListButton = toggleMyListButton;
window.addToMyList = addToMyList;
window.removeFromMyList = removeFromMyList;
window.showMyListToast = showMyListToast;
window.syncMyListStorage = syncMyListStorage;

function createCard(item) {
    const card = document.createElement('div');
    card.className = 'movie-card';

    // Handle image path - explicit approach
    let posterPath;
    const originalPath = item.poster_path;

    if (!originalPath) {
        posterPath = 'https://via.placeholder.com/500x750/2a2a2a/ffffff?text=No+Image';
    } else if (originalPath.startsWith('http')) {
        posterPath = originalPath;
    } else if (originalPath.startsWith('/w500/')) {
        posterPath = `https://image.tmdb.org/t/p${originalPath}`;
    } else if (originalPath.startsWith('/')) {
        posterPath = `https://image.tmdb.org/t/p/w500${originalPath}`;
    } else {
        posterPath = `https://image.tmdb.org/t/p/${originalPath}`;
    }

    // Use up-to-date myList
    const myListArr = JSON.parse(localStorage.getItem('myList') || '[]');
    const isInList = myListArr.some(listItem => listItem.id === item.id && listItem.type === item.type);
    const rating = (typeof item.rating === 'number' ? item.rating : (item.vote_average ? item.vote_average : null));
    const ratingDisplay = rating ? rating.toFixed(1) : 'N/A';
    const year = item.year || (item.release_date ? item.release_date.split('-')[0] : (item.first_air_date ? item.first_air_date.split('-')[0] : 'N/A'));
    const title = item.title || item.name;
    const overview = item.overview ? item.overview.substring(0, 100) + (item.overview.length > 100 ? '...' : '') : '';
    const typeLabel = item.type === 'movie' ? 'Movie' : 'TV Show';
    let duration = 'N/A';
    if (typeof item.runtime === 'number') {
        duration = `${item.runtime} min`;
    } else if (item.type === 'tv' && item.episode_run_time && item.episode_run_time.length > 0) {
        duration = `${item.episode_run_time[0]} min`;
    }
    const isWatched = (item.progress || 0) >= 90;

    card.innerHTML = `
        <img src="${posterPath}" 
             alt="${title}" 
             loading="lazy"
             onerror="this.src='https://via.placeholder.com/500x750/2a2a2a/ffffff?text=No+Image'; this.classList.add('error');">
        <div class="movie-info">
            <div class="card-actions">
                <button class="action-btn play-btn" title="Play" aria-label="Play">
                    <i class="material-icons">play_arrow</i>
                </button>
                <button class="action-btn remove-btn" title="Remove from My List" aria-label="Remove from My List">
                    <i class="material-icons">delete</i>
                </button>
            </div>
            <div class="movie-title">${title}</div>
            <div class="card-meta">
                <span class="rating"><i class="material-icons" style="font-size: 16px;">star</i> ${ratingDisplay}</span>
                <span>|</span>
                <span>${year}</span>
                <span>|</span>
                <span class="duration">${duration}</span>
            </div>
            <p class="movie-overview">${overview}</p>
            ${isWatched ? '<span class="watched-badge">Watched</span>' : ''}
        </div>
    `;

    // Overlay button actions
    const playBtn = card.querySelector('.play-btn');
    const removeBtn = card.querySelector('.remove-btn');
    playBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        playContent(item.id, item.type);
    });
    removeBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        await removeFromMyList(item.id, item.type);
        card.remove();
        if (window.showMyListToast) window.showMyListToast('Removed from My List', 'info');
        if (window.updateStats) window.updateStats();
    });

    // Card click navigates to player (unless clicking a button)
    card.addEventListener('click', (e) => {
        if (e.target.closest('.action-btn')) return;
        playContent(item.id, item.type);
    });

    return card;
}

async function fetchAndSetMyListDuration(item, card) {
    try {
        let url = '';
        if (item.type === 'movie') {
            url = `https://api.themoviedb.org/3/movie/${item.id}?api_key=8c247ea0b4b56ed2ff7d41c9a833aa77`;
        } else if (item.type === 'tv') {
            url = `https://api.themoviedb.org/3/tv/${item.id}?api_key=8c247ea0b4b56ed2ff7d41c9a833aa77`;
        }
        const response = await fetch(url);
        if (!response.ok) return;
        const data = await response.json();
        let duration = 'N/A';
        if (item.type === 'movie' && typeof data.runtime === 'number') {
            duration = `${data.runtime} min`;
        } else if (item.type === 'tv' && data.episode_run_time && data.episode_run_time.length > 0) {
            duration = `${data.episode_run_time[0]} min`;
        }
        const durationSpan = card.querySelector('.duration');
        if (durationSpan) durationSpan.textContent = duration;
    } catch (e) { }
}

// After appending each card, call fetchAndSetMyListDuration(item, card)
// Auto-init on DOMContentLoaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMyListButtons);
} else {
    initMyListButtons();
} 