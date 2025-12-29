// Notifications popover anchored to the account icon
(function () {
    const CHANGELOG_URL = 'changelog.json';
    const CHANGELOG_PAGE = 'changelog.html';
    const STORAGE_KEY_VERSION = 'eli6_changelog_last_seen_version';

    function ensureStyles() {
        if (document.getElementById('eli6-notifications-style')) return;
        const style = document.createElement('style');
        style.id = 'eli6-notifications-style';
        style.textContent = `
			.notif-badge { position: absolute; top: -2px; right: -2px; background: #e50914; color: #fff; border-radius: 10px; padding: 0 6px; font-size: 11px; line-height: 16px; height: 16px; min-width: 16px; display: none; align-items: center; justify-content: center; font-weight: 700; box-shadow: 0 0 0 2px rgba(0,0,0,0.6); }
			.notif-dot { position: absolute; top: 0; right: 0; width: 8px; height: 8px; background: #e50914; border-radius: 50%; box-shadow: 0 0 0 2px rgba(0,0,0,0.6); display: none; }
			.notif-anchor { position: relative; }
			#eli6-popover { position: fixed; z-index: 10000; min-width: 280px; max-width: 360px; color: #fff; background: rgba(20,20,20,0.98); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; box-shadow: 0 12px 40px rgba(0,0,0,0.6); backdrop-filter: blur(10px); display: none; }
			#eli6-popover header { padding: 12px 14px; border-bottom: 1px solid rgba(255,255,255,0.08); font-weight: 700; display: flex; align-items: center; justify-content: space-between; }
			#eli6-popover .content { max-height: 320px; overflow: auto; }
			#eli6-popover .item { padding: 10px 14px; border-bottom: 1px solid rgba(255,255,255,0.06); font-size: 13px; }
			#eli6-popover .item:last-child { border-bottom: none; }
			#eli6-popover .item .status { font-size: 11px; opacity: 0.8; }
			#eli6-popover footer { padding: 10px 14px; border-top: 1px solid rgba(255,255,255,0.08); display: flex; justify-content: flex-end; }
			#eli6-popover a.view-all { color: #e50914; text-decoration: none; font-weight: 700; }
		`;
        document.head.appendChild(style);
    }

    async function fetchChangelog() {
        try {
            const res = await fetch(CHANGELOG_URL, { cache: 'no-cache' });
            if (!res.ok) throw new Error('Failed to fetch changelog');
            return await res.json();
        } catch (e) {
            return { version: 1, items: [] };
        }
    }

    function getAccountAnchor() {
        // Desktop navbar
        let el = document.querySelector('.nav-icons a[href="account.html"]');
        if (!el) {
            // Mobile topbar
            el = document.querySelector('.mobile-topbar .mobile-account-btn');
        }
        return el || null;
    }

    function createBadge(anchor) {
        if (!anchor) return { badge: null, dot: null };
        anchor.classList.add('notif-anchor');
        const dot = document.createElement('span');
        dot.className = 'notif-dot';
        const badge = document.createElement('span');
        badge.className = 'notif-badge';
        anchor.style.position = anchor.style.position || 'relative';
        anchor.appendChild(dot);
        anchor.appendChild(badge);
        return { badge, dot };
    }

    function showPopover(anchor, changelog) {
        let pop = document.getElementById('eli6-popover');
        if (!pop) {
            pop = document.createElement('div');
            pop.id = 'eli6-popover';
            pop.innerHTML = `
				<header>
					<span>Whats New</span>
					<button id="eli6-popover-close" style="background:none;border:none;color:#fff;cursor:pointer;font-size:18px;">×</button>
				</header>
				<div class="content" id="eli6-popover-content"></div>
				<footer>
					<a class="view-all" href="${CHANGELOG_PAGE}">View all changes</a>
				</footer>
			`;
            document.body.appendChild(pop);
        }
        const rect = anchor.getBoundingClientRect();
        const top = rect.bottom + 8;
        const left = Math.min(Math.max(8, rect.right - 320), window.innerWidth - 8 - 320);
        pop.style.top = `${Math.round(top)}px`;
        pop.style.left = `${Math.round(left)}px`;
        const content = pop.querySelector('#eli6-popover-content');
        content.innerHTML = '';
        const recent = (changelog.items || []).slice(0, 6);
        recent.forEach((i) => {
            const div = document.createElement('div');
            div.className = 'item';
            div.innerHTML = `<div>${i.title || i.text}</div><div class="status">${i.status || 'done'}</div>`;
            content.appendChild(div);
        });
        pop.style.display = 'block';
        const closeBtn = document.getElementById('eli6-popover-close');
        closeBtn.onclick = () => hidePopover();
        setTimeout(() => {
            function onDocClick(ev) {
                if (!pop.contains(ev.target) && !anchor.contains(ev.target)) {
                    hidePopover();
                    document.removeEventListener('click', onDocClick);
                }
            }
            document.addEventListener('click', onDocClick);
        }, 0);
    }

    function hidePopover() {
        const pop = document.getElementById('eli6-popover');
        if (pop) pop.style.display = 'none';
    }

    function updateSeenVersion(version) {
        try {
            localStorage.setItem(STORAGE_KEY_VERSION, String(version));
        } catch (_) {}
    }

    function getSeenVersion() {
        try {
            return parseInt(localStorage.getItem(STORAGE_KEY_VERSION) || '0', 10) || 0;
        } catch (_) {
            return 0;
        }
    }

    async function init() {
        ensureStyles();
        const anchor = getAccountAnchor();
        if (!anchor) return;
        const { badge, dot } = createBadge(anchor);
        const changelog = await fetchChangelog();
        const lastSeen = getSeenVersion();
        const isNew = (changelog.version || 1) > lastSeen;
        if (isNew) {
            if (badge) {
                badge.textContent = 'NEW';
                badge.style.display = 'inline-flex';
            }
            if (dot) {
                dot.style.display = 'block';
            }
        }
        anchor.addEventListener('click', (e) => {
            e.preventDefault();
            showPopover(anchor, changelog);
            if (badge) badge.style.display = 'none';
            if (dot) dot.style.display = 'none';
            updateSeenVersion(changelog.version || 1);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
