// Theme Switcher
const themeToggle = document.getElementById('theme-toggle');
const themeIcon = document.getElementById('theme-icon');
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');

function setTheme(theme) {
    if (theme === 'auto') {
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem('theme', 'auto');
        updateThemeIcon(prefersDark.matches ? 'dark' : 'light');
    } else {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        updateThemeIcon(theme);
    }
}
function updateThemeIcon(theme) {
    themeIcon.textContent = theme === 'dark' ? '🌙' : theme === 'light' ? '☀️' : '🌓';
}
function getTheme() {
    return localStorage.getItem('theme') || 'auto';
}
function applyTheme() {
    const theme = getTheme();
    setTheme(theme);
}
if (themeToggle) {
    let mode = ['auto', 'dark', 'light'];
    themeToggle.addEventListener('click', () => {
        let current = getTheme();
        let idx = mode.indexOf(current);
        let next = mode[(idx + 1) % mode.length];
        setTheme(next);
    });
    prefersDark.addEventListener('change', () => {
        if (getTheme() === 'auto') setTheme('auto');
    });
    applyTheme();
}

// Animated Background (simple moving gradient, can be replaced with particles.js or similar)
// Already handled by CSS, but you can add more effects here if desired

// Floating Labels
function updateFloatingLabels() {
    document.querySelectorAll('.floating-label input').forEach(input => {
        if (input.value) {
            input.classList.add('has-value');
        } else {
            input.classList.remove('has-value');
        }
        input.addEventListener('input', () => {
            if (input.value) input.classList.add('has-value');
            else input.classList.remove('has-value');
        });
    });
}
updateFloatingLabels();

// Tab switching with animation
const tabs = document.querySelectorAll('.tab');
const forms = document.querySelectorAll('.form');
tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        forms.forEach(f => f.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(tab.dataset.tab + 'Form').classList.add('active');
    });
});

// Show/hide password toggle
function addPasswordToggles() {
    document.querySelectorAll('.input-group input[type="password"]').forEach(input => {
        if (input.parentNode.querySelector('.toggle-password')) return;
        const toggle = document.createElement('span');
        toggle.className = 'toggle-password';
        toggle.innerHTML = '👁️';
        toggle.title = 'Show/Hide Password';
        toggle.style.position = 'absolute';
        toggle.style.right = '16px';
        toggle.style.top = '50%';
        toggle.style.transform = 'translateY(-50%)';
        toggle.style.cursor = 'pointer';
        input.parentNode.appendChild(toggle);
        toggle.addEventListener('click', () => {
            input.type = input.type === 'password' ? 'text' : 'password';
            toggle.innerHTML = input.type === 'password' ? '👁️' : '🙈';
        });
    });
}
addPasswordToggles();

// Password Strength Meter
const passwordInput = document.getElementById('registerPassword');
const passwordStrength = document.getElementById('passwordStrength');
if (passwordInput && passwordStrength) {
    passwordInput.addEventListener('input', () => {
        const val = passwordInput.value;
        let score = 0;
        if (val.length > 7) score++;
        if (/[A-Z]/.test(val)) score++;
        if (/[0-9]/.test(val)) score++;
        if (/[^A-Za-z0-9]/.test(val)) score++;
        let msg = '';
        let color = 'var(--accent-color)';
        if (!val) { msg = ''; }
        else if (score <= 1) { msg = 'Weak'; color = '#e50914'; }
        else if (score === 2) { msg = 'Medium'; color = '#ff9800'; }
        else if (score >= 3) { msg = 'Strong'; color = '#2ecc71'; }
        passwordStrength.textContent = msg;
        passwordStrength.style.color = color;
    });
}

// Profile picture upload/preview (register)
const profilePicInput = document.getElementById('profilePic');
const profilePreview = document.getElementById('profilePreview');
if (profilePicInput && profilePreview) {
    profilePicInput.addEventListener('change', e => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = ev => {
                profilePreview.src = ev.target.result;
                profilePreview.style.display = 'block';
            };
            reader.readAsDataURL(file);
        } else {
            profilePreview.src = '';
            profilePreview.style.display = 'none';
        }
    });
}

// Toast Notifications
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'toast ' + type;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-20px)';
        setTimeout(() => toast.remove(), 500);
    }, 3000);
}

// Register form submission
const registerForm = document.getElementById('registerForm');
if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('registerUsername').value;
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;
        const btn = registerForm.querySelector('.submit-btn');
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner"></span>Signing up...';
        try {
            await register(username, email, password); // from auth.js
            showToast('Registration successful!', 'success');
            setTimeout(() => window.location.href = '/', 1200);
        } catch (error) {
            showToast('Registration failed. Try again.', 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = 'Sign Up';
        }
    });
}

// Login form submission
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        const btn = loginForm.querySelector('.submit-btn');
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner"></span>Signing in...';
        try {
            await login(email, password); // from auth.js
            showToast('Login successful!', 'success');
            setTimeout(() => window.location.href = '/', 1200);
        } catch (error) {
            showToast('Invalid email or password.', 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = 'Sign In';
        }
    });
}

// Show account info if logged in
async function checkAuth() {
    if (isLoggedIn()) {
        try {
            const profile = await getProfile();
            document.querySelector('.form-container').style.display = 'none';
            const info = document.getElementById('accountInfo');
            info.style.display = 'block';
            document.getElementById('profileUsername').textContent = profile.username;
            document.getElementById('profileEmail').textContent = profile.email;
            document.getElementById('profileInitial').textContent = profile.username[0].toUpperCase();
            if (profile.picture) {
                let img = document.getElementById('profileImage');
                img.src = profile.picture;
                img.style.display = 'block';
                info.querySelector('#profileInitial').style.display = 'none';
            }
        } catch (error) {
            logout();
        }
    } else {
        document.querySelector('.form-container').style.display = 'block';
        document.getElementById('accountInfo').style.display = 'none';
    }

    // Check if user is admin and show/hide admin panel button
    checkAdminStatus();
}
checkAuth();

// Check admin status and show/hide admin panel button
function checkAdminStatus() {
    const adminBtn = document.getElementById('adminPanelBtn');
    if (adminBtn && typeof isAdmin === 'function') {
        if (isAdmin()) {
            adminBtn.style.display = 'flex';
        } else {
            adminBtn.style.display = 'none';
        }
    }
}

// Add Netflix-style keyframes
const style = document.createElement('style');
style.innerHTML = `
@keyframes fadeOutLeft {
  from { opacity: 1; transform: translateX(0); }
  to { opacity: 0; transform: translateX(-60px); }
}
@keyframes fadeInRight {
  from { opacity: 0; transform: translateX(60px); }
  to { opacity: 1; transform: translateX(0); }
}`;
document.head.appendChild(style);

// Floating embers/particles background
function loadParticles() {
    if (window.particlesJS) {
        particlesJS('particles-js', {
            "particles": {
                "number": { "value": 200, "density": { "enable": true, "value_area": 800 } },
                "color": { "value": "#e50914" },
                "shape": { "type": "circle" },
                "opacity": {
                    "value": 0.5, "random": true,
                    "anim": { "enable": true, "speed": 1, "opacity_min": 0.1, "sync": false }
                },
                "size": { "value": 3, "random": true },
                "line_linked": { "enable": false },
                "move": {
                    "enable": true, "speed": 0.8, "direction": "none", "random": true,
                    "straight": false, "out_mode": "out", "bounce": false
                }
            },
            "interactivity": {
                "detect_on": "canvas",
                "events": {
                    "onhover": { "enable": true, "mode": "repulse" },
                    "onclick": { "enable": false },
                    "resize": true
                },
                "modes": {
                    "repulse": { "distance": 60, "duration": 0.4 }
                }
            },
            "retina_detect": true
        });
    } else {
        setTimeout(loadParticles, 200);
    }
}
document.addEventListener('DOMContentLoaded', loadParticles);

// Netflix-style form toggle logic for new layout
const loginToggleBtn = document.getElementById('show-login');
const signupToggleBtn = document.getElementById('show-signup');
const loginFormEl = document.getElementById('loginForm');
const registerFormEl = document.getElementById('registerForm');

function switchForm(showForm, hideForm, showBtn, hideBtn) {
    if (showForm.classList.contains('active')) return;
    hideForm.classList.remove('active', 'fade-in');
    hideForm.classList.add('fade-out');
    setTimeout(() => {
        hideForm.classList.remove('fade-out');
        hideForm.style.display = 'none';
        showForm.style.display = 'flex';
        showForm.classList.add('active', 'fade-in');
        setTimeout(() => showForm.classList.remove('fade-in'), 500);
    }, 400);
    showBtn.classList.add('active');
    hideBtn.classList.remove('active');
}

if (loginToggleBtn && signupToggleBtn && loginFormEl && registerFormEl) {
    loginToggleBtn.addEventListener('click', e => {
        e.preventDefault();
        switchForm(loginFormEl, registerFormEl, loginToggleBtn, signupToggleBtn);
    });
    signupToggleBtn.addEventListener('click', e => {
        e.preventDefault();
        switchForm(registerFormEl, loginFormEl, signupToggleBtn, loginToggleBtn);
    });
    // Initial state
    loginFormEl.style.display = 'flex';
    registerFormEl.style.display = 'none';
}

// Admin Panel Function
function openAdminPanel() {
    // Open admin panel in a new tab/window
    window.open('../admin_users.html', '_blank');
}