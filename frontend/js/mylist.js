// Shared My List logic and UI/UX for all pages

const MYLIST_API_URL = window.API_BASE_URL || '';

function _mlEscape(str) {
    return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;');
}

function _mlIsLoggedIn() {
    return !!localStorage.getItem('user');
}


function showMyListToast(message, type, undoCallback) {
    if (!undoCallback) {
        // Delegate to the shared e6-toast system
        if (typeof window.showToast === 'function') {
            window.showToast(message, type);
        }
        return;
    }

    // Undo variant — needs its own persistent element with a button
    var existing = document.querySelector('.mylist-undo-toast');
    if (existing) existing.remove();

    var toast = document.createElement('div');
    toast.className = 'mylist-undo-toast';

    var span = document.createElement('span');
    span.textContent = message;
    toast.appendChild(span);

    var undoBtn = document.createElement('button');
    undoBtn.className = 'mylist-undo-btn';
    undoBtn.textContent = 'Undo';
    undoBtn.onclick = function () {
        undoCallback();
        toast.remove();
    };
    toast.appendChild(undoBtn);

    document.body.appendChild(toast);
    requestAnimationFrame(function () { toast.classList.add('show'); });

    var hideTimer = setTimeout(function () {
        toast.classList.remove('show');
        setTimeout(function () { toast.remove(); }, 300);
    }, 3500);

    undoBtn.addEventListener('click', function () { clearTimeout(hideTimer); });
}


function myListSpinner() {
    return '<span class="mylist-spinner"></span>';
}


function _mlHandleStatus(status) {
    if (status === 401) {
        localStorage.removeItem('user');
        showMyListToast('Session expired — please sign in again', 'error');
        setTimeout(function () { window.location.href = 'account.html'; }, 1600);
        var err = new Error('Session expired');
        err.isAuthError = true;
        throw err;
    }
}

async function addToMyList(item) {
    const response = await fetch(MYLIST_API_URL + '/user/mylist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(item),
    });
    if (!response.ok) {
        _mlHandleStatus(response.status);
        const err = await response.json().catch(function () { return {}; });
        const msg = err.error || err.message || 'Failed to add to My List';
        if (msg === 'ALREADY_EXISTS') throw new Error('Already in your list');
        throw new Error(msg);
    }
    return await response.json();
}

async function removeFromMyList(id, type) {
    const response = await fetch(MYLIST_API_URL + '/user/mylist/' + id + '/' + type, {
        method: 'DELETE',
        credentials: 'include',
    });
    if (!response.ok) {
        _mlHandleStatus(response.status);
        const err = await response.json().catch(function () { return {}; });
        throw new Error(err.error || err.message || 'Failed to remove from My List');
    }
    return await response.json();
}


async function syncMyListStorage() {
    if (!_mlIsLoggedIn()) return;
    try {
        const response = await fetch(MYLIST_API_URL + '/user/profile', { credentials: 'include' });
        if (response.ok) {
            const data = await response.json();
            localStorage.setItem('myList', JSON.stringify(data.myList || []));
        }
    } catch (e) {}
}


async function toggleMyListButton(btn, item) {
    if (btn.classList.contains('mylist-processing')) return;

    if (!_mlIsLoggedIn()) {
        showMyListToast('Please sign in to use My List', 'error');
        setTimeout(function () { window.location.href = 'account.html'; }, 1600);
        return;
    }

    btn.classList.add('mylist-processing', 'mylist-anim');
    const icon = btn.querySelector('.material-icons');
    if (!btn.querySelector('.mylist-spinner')) {
        btn.insertAdjacentHTML('beforeend', myListSpinner());
    }
    const isInList = btn.classList.contains('in-list');

    try {
        if (isInList) {
            await removeFromMyList(item.id, item.type);
            btn.classList.remove('in-list');
            if (icon) icon.textContent = 'add';
            showMyListToast('Removed from My List', 'info', async function () {
                btn.classList.add('mylist-processing');
                if (!btn.querySelector('.mylist-spinner')) {
                    btn.insertAdjacentHTML('beforeend', myListSpinner());
                }
                try {
                    await addToMyList(item);
                    btn.classList.add('in-list');
                    if (icon) icon.textContent = 'check';
                    showMyListToast('Added back to My List', 'success');
                } catch (e) {
                    if (!e.isAuthError) showMyListToast(e.message || 'Failed to undo', 'error');
                } finally {
                    btn.classList.remove('mylist-processing');
                    var sp = btn.querySelector('.mylist-spinner');
                    if (sp) sp.remove();
                    syncMyListStorage();
                }
            });
        } else {
            await addToMyList(item);
            btn.classList.add('in-list');
            if (icon) icon.textContent = 'check';
            showMyListToast('Added to My List', 'success');
        }
        syncMyListStorage();
    } catch (e) {
        if (!e.isAuthError) showMyListToast(e.message || 'Failed to update My List', 'error');
    } finally {
        btn.classList.remove('mylist-processing', 'mylist-anim');
        const sp = btn.querySelector('.mylist-spinner');
        if (sp) sp.remove();
    }
}


function initMyListButtons() {
    document.querySelectorAll('.mylist-btn').forEach(function (btn) {
        if (btn.dataset.mylistInit) return;
        btn.dataset.mylistInit = '1';
        btn.addEventListener('click', async function (e) {
            e.stopPropagation();
            e.preventDefault();
            var item;
            try { item = JSON.parse(btn.dataset.mylistItem); } catch (ex) { return; }
            if (!item) return;
            await toggleMyListButton(btn, item);
        });
    });
}


function _mlBoot() {
    initMyListButtons();
    if (_mlIsLoggedIn()) {
        syncMyListStorage().catch(function () {});
    }
}
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _mlBoot);
} else {
    _mlBoot();
}


window.toggleMyList = async function (item, btn) {
    if (!_mlIsLoggedIn()) {
        showMyListToast('Please sign in to use My List', 'error');
        setTimeout(function () { window.location.href = 'account.html'; }, 1600);
        return;
    }
    const id   = parseInt(item.id || item.tmdb_id || item.mal_id);
    const type = item.kind || item.type || 'movie';
    const title      = item.title || item.name || '';
    const posterPath = item.poster_path || item.poster_url || '';
    const overview   = (item.overview || item.synopsis || item.description || '').substring(0, 500);

    if (!id || !title) {
        showMyListToast('Unable to add this item — missing data', 'error');
        return;
    }

    const myListArr = JSON.parse(localStorage.getItem('myList') || '[]');
    const alreadyIn = myListArr.some(function (i) { return i.id === id && i.type === type; });

    if (btn) btn.disabled = true;
    try {
        if (alreadyIn) {
            await removeFromMyList(id, type);
            const updated = myListArr.filter(function (i) { return !(i.id === id && i.type === type); });
            localStorage.setItem('myList', JSON.stringify(updated));
            showMyListToast('Removed from My List', 'info', async function () {
                try {
                    await addToMyList({ id: id, title: title, type: type, poster_path: posterPath, overview: overview });
                    myListArr.unshift({ id: id, title: title, type: type, poster_path: posterPath, overview: overview });
                    localStorage.setItem('myList', JSON.stringify(myListArr));
                    if (btn) { btn.textContent = '✓ My List'; btn.classList.add('btn--in-list'); btn.disabled = false; }
                    showMyListToast('Added back to My List', 'success');
                } catch (e) {
                    if (!e.isAuthError) showMyListToast(e.message || 'Failed to undo', 'error');
                }
            });
            if (btn) { btn.textContent = '+ My List'; btn.classList.remove('btn--in-list'); }
        } else {
            await addToMyList({ id: id, title: title, type: type, poster_path: posterPath, overview: overview });
            myListArr.unshift({ id: id, title: title, type: type, poster_path: posterPath, overview: overview });
            localStorage.setItem('myList', JSON.stringify(myListArr));
            showMyListToast('Added to My List', 'success');
            if (btn) { btn.textContent = '✓ My List'; btn.classList.add('btn--in-list'); }
        }
        syncMyListStorage().catch(function () {});
    } catch (e) {
        if (!e.isAuthError) showMyListToast(e.message || 'Failed to update My List', 'error');
    } finally {
        if (btn) btn.disabled = false;
    }
};


window.updateMyListBtn = function (item, btn) {
    if (!btn) return;
    const id   = parseInt(item.id || item.tmdb_id);
    const type = item.kind || item.type || 'movie';
    const myListArr = JSON.parse(localStorage.getItem('myList') || '[]');
    const inList = id && myListArr.some(function (i) { return i.id === id && i.type === type; });
    btn.textContent = inList ? '✓ My List' : '+ My List';
    btn.classList.toggle('btn--in-list', !!inList);
};


window.initMyListButtons  = initMyListButtons;
window.toggleMyListButton = toggleMyListButton;
window.addToMyList        = addToMyList;
window.removeFromMyList   = removeFromMyList;
window.showMyListToast    = showMyListToast;
window.syncMyListStorage  = syncMyListStorage;


function createCard(item) {
    const card = document.createElement('div');
    card.className = 'movie-card';

    let posterPath;
    const originalPath = item.poster_path;
    if (!originalPath) {
        posterPath = 'https://via.placeholder.com/500x750/2a2a2a/ffffff?text=No+Image';
    } else if (originalPath.startsWith('http')) {
        posterPath = originalPath;
    } else if (originalPath.startsWith('/w500/')) {
        posterPath = 'https://image.tmdb.org/t/p' + originalPath;
    } else if (originalPath.startsWith('/')) {
        posterPath = 'https://image.tmdb.org/t/p/w500' + originalPath;
    } else {
        posterPath = 'https://image.tmdb.org/t/p/' + originalPath;
    }

    const myListArr = JSON.parse(localStorage.getItem('myList') || '[]');
    const isInList  = myListArr.some(function (i) { return i.id === item.id && i.type === item.type; });
    const rating    = typeof item.rating === 'number' ? item.rating : (item.vote_average || null);
    const ratingDisplay = rating ? rating.toFixed(1) : 'N/A';
    const year      = item.year || (item.release_date ? item.release_date.split('-')[0] : item.first_air_date ? item.first_air_date.split('-')[0] : 'N/A');
    const title     = item.title || item.name;
    const overview  = item.overview ? item.overview.substring(0, 100) + (item.overview.length > 100 ? '...' : '') : '';
    const typeLabel = item.type === 'movie' ? 'Movie' : 'TV Show';
    const isWatched = (item.progress || 0) >= 90;

    card.innerHTML =
        '<img src="' + _mlEscape(posterPath) + '" alt="' + _mlEscape(title) + '" loading="lazy" onerror="this.src=\'https://via.placeholder.com/500x750/2a2a2a/ffffff?text=No+Image\'">' +
        '<div class="movie-info">' +
        '<div class="card-actions">' +
        '<button class="action-btn play-btn" title="Play"><i class="material-icons">play_arrow</i></button>' +
        '<button class="action-btn remove-btn" title="Remove from My List"><i class="material-icons">delete</i></button>' +
        '</div>' +
        '<div class="movie-title">' + _mlEscape(title) + '</div>' +
        '<div class="card-meta"><span class="rating"><i class="material-icons" style="font-size:16px">star</i> ' + _mlEscape(ratingDisplay) + '</span><span>|</span><span>' + _mlEscape(year) + '</span><span>|</span><span class="duration">N/A</span></div>' +
        '<p class="movie-overview">' + _mlEscape(overview) + '</p>' +
        (isWatched ? '<span class="watched-badge">Watched</span>' : '') +
        '</div>';

    card.querySelector('.play-btn').addEventListener('click', function (e) {
        e.stopPropagation();
        window.location.href = 'player.html?type=' + item.type + '&id=' + item.id;
    });
    card.querySelector('.remove-btn').addEventListener('click', async function (e) {
        e.stopPropagation();
        try {
            await removeFromMyList(item.id, item.type);
            card.remove();
            showMyListToast('Removed from My List', 'info');
        } catch (err) {
            if (!err.isAuthError) showMyListToast(err.message || 'Failed to remove', 'error');
        }
    });
    card.addEventListener('click', function (e) {
        if (e.target.closest('.action-btn')) return;
        window.location.href = 'player.html?type=' + item.type + '&id=' + item.id;
    });

    return card;
}
