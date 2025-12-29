/**
 * Spatial Navigation for Android TV
 * Handles D-pad movement between focusable elements
 */

class SpatialNavigation {
    constructor() {
        this.focusableSelector = 'a, button, .movie-card, input, [tabindex="0"]';
        this.currentFocus = null;
        this.init();
    }

    init() {
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        // Set initial focus if none exists
        setTimeout(() => {
            if (!document.activeElement || document.activeElement === document.body) {
                this.focusFirst();
            }
        }, 1000);
    }

    handleKeyDown(e) {
        const key = e.key;
        if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter'].includes(key)) return;

        if (key === 'Enter') {
            if (document.activeElement) {
                document.activeElement.click();
            }
            return;
        }

        e.preventDefault();
        const direction = key.replace('Arrow', '').toLowerCase();
        this.moveFocus(direction);
    }

    getFocusableElements() {
        return Array.from(document.querySelectorAll(this.focusableSelector))
            .filter(el => {
                const rect = el.getBoundingClientRect();
                return rect.width > 0 && rect.height > 0 &&
                    window.getComputedStyle(el).display !== 'none' &&
                    window.getComputedStyle(el).visibility !== 'hidden';
            });
    }

    focusFirst() {
        const elements = this.getFocusableElements();
        if (elements.length > 0) {
            elements[0].focus();
            this.currentFocus = elements[0];
        }
    }

    moveFocus(direction) {
        const current = document.activeElement || this.currentFocus || this.getFocusableElements()[0];
        if (!current) return;

        const elements = this.getFocusableElements().filter(el => el !== current);
        const currentRect = current.getBoundingClientRect();

        let nearest = null;
        let minDistance = Infinity;

        elements.forEach(el => {
            const rect = el.getBoundingClientRect();
            const distance = this.getDistance(currentRect, rect, direction);

            if (distance < minDistance) {
                minDistance = distance;
                nearest = el;
            }
        });

        if (nearest) {
            nearest.focus();
            this.currentFocus = nearest;
            nearest.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
        }
    }

    getDistance(a, b, direction) {
        const aCenter = { x: a.left + a.width / 2, y: a.top + a.height / 2 };
        const bCenter = { x: b.left + b.width / 2, y: b.top + b.height / 2 };

        // Check if b is in the correct direction relative to a
        const isCorrectDirection = {
            up: bCenter.y < aCenter.y,
            down: bCenter.y > aCenter.y,
            left: bCenter.x < aCenter.x,
            right: bCenter.x > aCenter.x
        }[direction];

        if (!isCorrectDirection) return Infinity;

        // Euclidean distance with a heavy penalty for being off-axis
        const dx = bCenter.x - aCenter.x;
        const dy = bCenter.y - aCenter.y;

        // Weighting the primary axis higher to prefer elements directly in line
        if (direction === 'up' || direction === 'down') {
            return Math.abs(dy) + Math.abs(dx) * 2;
        } else {
            return Math.abs(dx) + Math.abs(dy) * 2;
        }
    }
}

// Initialize on load
window.addEventListener('DOMContentLoaded', () => {
    window.spatialNav = new SpatialNavigation();
});
