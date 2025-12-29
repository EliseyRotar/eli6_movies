const API_URL = 'https://streaming.ecolens.me/api';

// Retry mechanism with exponential backoff
async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await fn();
        } catch (error) {
            // Don't retry for non-rate-limit errors
            if (!error.message.includes('Too many requests')) {
                throw error;
            }

            // Don't retry on the last attempt
            if (i === maxRetries - 1) {
                throw error;
            }

            // Calculate delay with exponential backoff
            const delay = baseDelay * Math.pow(2, i);
            console.log(
                `Rate limit hit, retrying in ${delay}ms... (attempt ${i + 1}/${maxRetries})`
            );
            await new Promise((resolve) => setTimeout(resolve, delay));
        }
    }
}

// Check if user is logged in
function isLoggedIn() {
    const user = localStorage.getItem('user');
    return !!user;
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
    return await retryWithBackoff(async () => {
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({ email, password }),
        });

        if (!response.ok) {
            if (response.status === 429) {
                // Rate limit exceeded
                const retryAfter = response.headers.get('retry-after');
                const minutes = retryAfter ? Math.ceil(parseInt(retryAfter) / 60) : 15;
                throw new Error(
                    `Too many requests. Please wait ${minutes} minutes before trying again.`
                );
            } else if (response.status === 401) {
                throw new Error('Invalid email or password');
            } else if (response.status === 400) {
                // Try to get specific error message from server
                try {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Login failed');
                } catch {
                    throw new Error('Login failed');
                }
            } else {
                throw new Error('Login failed');
            }
        }

        const data = await response.json();

        // Store only user data (token is httpOnly cookie)
        localStorage.setItem('user', JSON.stringify(data.user));

        // Update navigation
        updateNavigation();

        return data;
    });
}

// Register function
async function register(username, email, password) {
    return await retryWithBackoff(async () => {
        const response = await fetch(`${API_URL}/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({ username, email, password }),
        });

        if (!response.ok) {
            if (response.status === 429) {
                // Rate limit exceeded
                const retryAfter = response.headers.get('retry-after');
                const minutes = retryAfter ? Math.ceil(parseInt(retryAfter) / 60) : 15;
                throw new Error(
                    `Too many requests. Please wait ${minutes} minutes before trying again.`
                );
            } else if (response.status === 400) {
                // Try to get specific error message from server
                try {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Registration failed');
                } catch {
                    throw new Error('Registration failed');
                }
            } else {
                throw new Error('Registration failed');
            }
        }

        const data = await response.json();

        // Store only user data (token is httpOnly cookie)
        localStorage.setItem('user', JSON.stringify(data.user));

        // Update navigation
        updateNavigation();

        return data;
    });
}

// Logout function
function logout() {
    localStorage.removeItem('user');
    window.location.href = '/account.html';
}

// Get user profile
async function getProfile() {
    try {
        const response = await fetch(`${API_URL}/user/profile`, {
            credentials: 'include',
        });

        if (!response.ok) {
            if (response.status === 401) {
                localStorage.removeItem('user');
                throw new Error('Session expired. Please log in again.');
            }
            throw new Error('Failed to fetch profile');
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Profile error:', error);
        throw error;
    }
}

// Update navigation based on auth status
function updateNavigation() {
    const user = getCurrentUser();

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
    updateNavigation();
});

// Add to My List
window.addToMyList = async function (item) {
    try {
        const response = await fetch(`${API_URL}/user/mylist`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify(item),
        });

        if (!response.ok) {
            const error = await response.json();
            if (response.status === 401) {
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
        const response = await fetch(`${API_URL}/user/mylist/${id}/${type}`, {
            method: 'DELETE',
            credentials: 'include',
        });

        if (!response.ok) {
            if (response.status === 401) {
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
        const response = await fetch(`${API_URL}/user/profile`, {
            credentials: 'include',
        });

        if (!response.ok) {
            if (response.status === 401) {
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
    const response = await fetch(`${API_URL}/user/watched`, {
        credentials: 'include',
    });
    if (!response.ok) return [];
    return await response.json();
}

// Remove item from watch history
async function removeFromWatchHistory(id, type) {
    await fetch(`${API_URL}/user/watch-history`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id, type }),
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
    history.forEach((item) => {
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
