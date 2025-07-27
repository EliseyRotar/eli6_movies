const API_URL = 'http://localhost:3000/api';

// Check if user is logged in
function isLoggedIn() {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    console.log('Auth check - Token:', token); // Debug log
    console.log('Auth check - User:', user); // Debug log
    return !!(token && user);
}

// Get current user
function getCurrentUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
}

// Check if current user is admin
function isAdmin() {
    const user = getCurrentUser();
    return user && user.role === 'admin';
}

// Login function
async function login(email, password) {
    try {
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        if (!response.ok) {
            throw new Error('Login failed');
        }

        const data = await response.json();
        console.log('Login response:', data); // Debug log

        // Store both token and user data
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));

        // Update navigation
        updateNavigation();

        return data;
    } catch (error) {
        console.error('Login error:', error);
        throw error;
    }
}

// Register function
async function register(username, email, password) {
    try {
        const response = await fetch(`${API_URL}/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, email, password })
        });

        if (!response.ok) {
            throw new Error('Registration failed');
        }

        const data = await response.json();
        console.log('Register response:', data); // Debug log

        // Store both token and user data
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));

        // Update navigation
        updateNavigation();

        return data;
    } catch (error) {
        console.error('Registration error:', error);
        throw error;
    }
}

// Logout function
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/account.html';
}

// Get user profile
async function getProfile() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('No token found');
        }

        const response = await fetch(`${API_URL}/user/profile`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            if (response.status === 401) {
                // Token expired or invalid
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                throw new Error('Session expired. Please log in again.');
            }
            throw new Error('Failed to fetch profile');
        }

        const data = await response.json();
        console.log('Profile data:', data); // Debug log
        return data;
    } catch (error) {
        console.error('Profile error:', error);
        throw error;
    }
}

// Update navigation based on auth status
function updateNavigation() {
    const user = getCurrentUser();
    console.log('Updating navigation with user:', user); // Debug log

    const accountLink = document.querySelector('a[href="/account.html"]');
    const myListLink = document.querySelector('a[href="/mylist.html"]');

    if (user) {
        if (accountLink) {
            accountLink.textContent = user.username;
        }
        if (myListLink) {
            myListLink.style.display = 'inline-block';
        }
    } else {
        if (accountLink) {
            accountLink.textContent = 'Account';
        }
        if (myListLink) {
            myListLink.style.display = 'none';
        }
    }
}

// Initialize auth state
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initial auth state:', isLoggedIn()); // Debug log
    updateNavigation();
});

// Add to My List
window.addToMyList = async function (item) {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('Please log in to use this feature');
        }

        console.log('Adding to list with token:', token); // Debug log
        console.log('Adding item:', item); // Debug log

        const response = await fetch(`${API_URL}/user/mylist`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(item)
        });

        if (!response.ok) {
            const error = await response.json();
            if (response.status === 401) {
                // Token expired or invalid
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                throw new Error('Session expired. Please log in again.');
            }
            throw new Error(error.error || 'Failed to add to list');
        }

        return await response.json();
    } catch (error) {
        console.error('Error adding to list:', error);
        throw error;
    }
};

// Remove from My List
async function removeFromMyList(id, type) {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('Please log in to use this feature');
        }

        const response = await fetch(`${API_URL}/user/mylist/${id}/${type}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            if (response.status === 401) {
                // Token expired or invalid
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                throw new Error('Session expired. Please log in again.');
            }
            throw new Error('Failed to remove from list');
        }

        return await response.json();
    } catch (error) {
        console.error('Error removing from list:', error);
        throw error;
    }
}

// Get My List
async function getMyList() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('Please log in to use this feature');
        }

        const response = await fetch(`${API_URL}/user/profile`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            if (response.status === 401) {
                // Token expired or invalid
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                throw new Error('Session expired. Please log in again.');
            }
            throw new Error('Failed to fetch list');
        }

        const data = await response.json();
        return data.myList || [];
    } catch (error) {
        console.error('Error fetching list:', error);
        throw error;
    }
}

// Fetch watch history
async function getWatchHistory() {
    const token = localStorage.getItem('token');
    if (!token) return [];
    const response = await fetch(`${API_URL}/user/watched`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) return [];
    return await response.json();
}

// Remove item from watch history
async function removeFromWatchHistory(id, type) {
    const token = localStorage.getItem('token');
    if (!token) return;
    await fetch(`${API_URL}/user/watch-history`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, type })
    });
}

// Render watch history in account.html
async function renderWatchHistory() {
    const list = document.getElementById('watch-history-list');
    if (!list) return;
    const history = await getWatchHistory();
    list.innerHTML = '';
    if (!history.length) {
        list.innerHTML = '<p>No watch history yet.</p>';
        return;
    }
    history.forEach(item => {
        const div = document.createElement('div');
        div.className = 'watch-history-item';
        div.innerHTML = `
      <img src="https://image.tmdb.org/t/p/w92${item.poster_path}" alt="${item.title}" />
      <span>${item.title} (${item.type})</span>
      <button onclick="resumePlayback(${item.id}, '${item.type}')">Resume</button>
      <button onclick="removeFromWatchHistory(${item.id}, '${item.type}')">Remove</button>
    `;
        list.appendChild(div);
    });
}

// Resume playback (redirect to player)
function resumePlayback(id, type) {
    if (type === 'movie') {
        window.location.href = `player.php?type=movie&id=${id}`;
    } else if (type === 'tv') {
        window.location.href = `player.php?type=tv&id=${id}`;
    } else if (type === 'anime') {
        window.location.href = `player.php?type=anime&id=${id}`;
    }
} 