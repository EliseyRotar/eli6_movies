// Shared mobile navigation (sidenav + overlay + optional search bar)
(function () {
    document.addEventListener('DOMContentLoaded', function () {
        const openBtn = document.getElementById('openMobileSidenav');
        const closeBtn = document.getElementById('closeMobileSidenav');
        const sidenav = document.getElementById('mobileSidenav');
        const overlay = document.getElementById('mobileOverlay');
        const searchBtn = document.getElementById('mobileSearchBtn');
        const searchbar = document.getElementById('mobileSearchbar');
        const closeSearch = document.getElementById('closeMobileSearch');

        // Open sidenav
        if (openBtn && sidenav && overlay) {
            openBtn.onclick = function () {
                sidenav.classList.add('open');
                sidenav.style.display = 'flex';
                overlay.style.display = 'block';
            };
        }

        // Close sidenav
        if (closeBtn && sidenav && overlay) {
            closeBtn.onclick = function () {
                sidenav.classList.remove('open');
                setTimeout(() => {
                    sidenav.style.display = 'none';
                }, 300);
                overlay.style.display = 'none';
            };
        }

        // Close on overlay click
        if (overlay && sidenav) {
            overlay.onclick = function () {
                sidenav.classList.remove('open');
                setTimeout(() => {
                    sidenav.style.display = 'none';
                }, 300);
                overlay.style.display = 'none';
            };
        }

        // Optional inline searchbar (home only today)
        if (searchBtn && searchbar) {
            searchBtn.onclick = function () {
                searchbar.style.display = 'flex';
                const input = searchbar.querySelector('input');
                if (input) {
                    setTimeout(() => {
                        input.focus();
                    }, 100);
                }
            };
        }

        if (closeSearch && searchbar) {
            closeSearch.onclick = function () {
                searchbar.style.display = 'none';
            };
        }

        // Mobile Topbar Scroll Effect
        const mobileTopbar = document.getElementById('mobileTopbar');
        if (mobileTopbar) {
            window.addEventListener('scroll', () => {
                if (window.scrollY > 10) {
                    mobileTopbar.classList.add('scrolled');
                } else {
                    mobileTopbar.classList.remove('scrolled');
                }
            });
        }
    });
})();
