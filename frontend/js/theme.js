// Theme Management
const themeManager = {
    init() {
        const theme = localStorage.getItem('theme') || 'dark';
        this.applyTheme(theme);
        this.setupThemeSwitch();
        this.setupStorageListener();
    },

    applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);

        // Update any theme switches on the page
        const themeSwitch = document.getElementById('themeSwitch');
        if (themeSwitch) {
            themeSwitch.classList.toggle('active', theme === 'light');
        }

        // Dispatch a custom event for other components that might need to react to theme changes
        document.dispatchEvent(new CustomEvent('themeChanged', { detail: { theme } }));
    },

    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        this.applyTheme(newTheme);
        return newTheme;
    },

    setupThemeSwitch() {
        // Only setup the switch if we're on the settings page
        const themeSwitch = document.getElementById('themeSwitch');
        if (themeSwitch) {
            const currentTheme = localStorage.getItem('theme') || 'dark';
            themeSwitch.classList.toggle('active', currentTheme === 'light');
        }
    },

    setupStorageListener() {
        // Listen for theme changes from other tabs/windows
        window.addEventListener('storage', (event) => {
            if (event.key === 'theme') {
                this.applyTheme(event.newValue);
            }
        });
    }
};

// Initialize theme on page load
document.addEventListener('DOMContentLoaded', () => {
    themeManager.init();
}); 