// ==========================================
// 1. INITIALISATION
// ==========================================
if (typeof hljs !== 'undefined') hljs.highlightAll();
if (typeof lucide !== 'undefined') lucide.createIcons();

const menuBtn = document.getElementById('menu-btn');
const sidebar = document.getElementById('sidebar');
const sidebarNav = document.querySelector('.sidebar-nav');

if (menuBtn && sidebar) {
    menuBtn.addEventListener('click', () => sidebar.classList.toggle('open'));
}

const slugify = (text) => String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'section';

const buildAutoSectionsAndNav = () => {
    const allSections = Array.from(document.querySelectorAll('.main-content .section-spy'));
    const sectionEntries = allSections
        .map((section) => ({ section, titleEl: section.querySelector('.section-header h3') }))
        .filter((entry) => entry.titleEl);

    if (!sectionEntries.length) return;

    const usedIds = new Set();

    sectionEntries.forEach((entry, index) => {
        const { section, titleEl } = entry;
        const rawTitle = (titleEl.dataset.baseTitle || titleEl.textContent || '').trim();
        const baseTitle = rawTitle.replace(/^\s*\d+\s*[.)-]\s*/, '').trim();
        titleEl.dataset.baseTitle = baseTitle;

        const number = index + 1;
        titleEl.textContent = baseTitle;

        let stepNumber = section.querySelector('.section-header .step-number');
        if (!stepNumber) {
            stepNumber = document.createElement('span');
            stepNumber.className = 'step-number';
            const header = section.querySelector('.section-header');
            if (header) header.prepend(stepNumber);
        }
        if (stepNumber) stepNumber.textContent = String(number);

        const preferredId = section.dataset.sectionId || slugify(baseTitle);
        let finalId = preferredId;
        let suffix = 2;
        while (usedIds.has(finalId)) {
            finalId = `${preferredId}-${suffix}`;
            suffix += 1;
        }
        usedIds.add(finalId);
        section.id = finalId;
        section.dataset.navLabel = section.dataset.navLabel || baseTitle;
    });

    if (!sidebarNav) return;

    const existingLinks = Array.from(sidebarNav.querySelectorAll('a.nav-link'));
    const staticLinks = existingLinks.filter((link) => !(link.getAttribute('href') || '').startsWith('#'));
    sidebarNav.innerHTML = '';

    staticLinks.forEach((link) => {
        link.classList.remove('active');
        sidebarNav.appendChild(link);
    });

    sectionEntries.forEach((entry, index) => {
        const { section } = entry;
        const label = section.dataset.navLabel || section.querySelector('.section-header h3')?.dataset.baseTitle || `Section ${index + 1}`;
        const navLink = document.createElement('a');
        navLink.className = 'nav-link';
        navLink.href = `#${section.id}`;
        navLink.textContent = `${index + 1}. ${label}`;
        sidebarNav.appendChild(navLink);
    });
};

const initScrollSpy = () => {
    const links = Array.from(document.querySelectorAll('.sidebar-nav .nav-link[href^="#"]'));
    const sections = Array.from(document.querySelectorAll('.main-content .section-spy[id]'))
        .filter((section) => section.querySelector('.section-header h3'));

    if (!links.length || !sections.length) return;

    const updateActive = () => {
        let currentId = sections[0].id;
        sections.forEach((section) => {
            if (window.scrollY >= section.offsetTop - 220) currentId = section.id;
        });

        links.forEach((link) => {
            const target = (link.getAttribute('href') || '').slice(1);
            link.classList.toggle('active', target === currentId);
        });
    };

    updateActive();
    window.addEventListener('scroll', updateActive, { passive: true });
};

const initImageLightbox = () => {
    const images = Array.from(document.querySelectorAll('.main-content img'))
        .filter((img) => img.dataset.noLightbox !== 'true');

    if (!images.length) return;

    let overlay = document.getElementById('image-lightbox');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'image-lightbox';
        overlay.className = 'image-lightbox';
        overlay.innerHTML = `
            <div class="image-lightbox__panel" role="dialog" aria-modal="true" aria-label="Visualiseur d'image">
                <div class="image-lightbox__toolbar">
                    <button type="button" class="image-lightbox__btn" data-action="zoom-out" aria-label="Zoom arrière">-</button>
                    <button type="button" class="image-lightbox__btn" data-action="zoom-in" aria-label="Zoom avant">+</button>
                    <button type="button" class="image-lightbox__btn" data-action="reset" aria-label="Réinitialiser le zoom">Reset</button>
                    <button type="button" class="image-lightbox__btn" data-action="close" aria-label="Fermer">X</button>
                </div>
                <div class="image-lightbox__stage">
                    <img class="image-lightbox__img" alt="">
                </div>
                <p class="image-lightbox__caption"></p>
            </div>
        `;
        document.body.appendChild(overlay);
    }

    const panel = overlay.querySelector('.image-lightbox__panel');
    const stage = overlay.querySelector('.image-lightbox__stage');
    const lightboxImg = overlay.querySelector('.image-lightbox__img');
    const caption = overlay.querySelector('.image-lightbox__caption');

    if (!panel || !stage || !lightboxImg || !caption) return;

    let zoom = 1;
    let panX = 0;
    let panY = 0;
    let panPointerId = null;
    let panStartX = 0;
    let panStartY = 0;
    let panStartPanX = 0;
    let panStartPanY = 0;
    const activePointers = new Map();
    let pinchStartDistance = 0;
    let pinchStartZoom = 1;
    let pinchStartPanX = 0;
    let pinchStartPanY = 0;
    let pinchStartCenter = { x: 0, y: 0 };

    const clampZoom = (value) => Math.max(1, Math.min(4, value));
    const getBaseImageSize = () => {
        if (!lightboxImg.naturalWidth || !lightboxImg.naturalHeight) {
            return { width: 0, height: 0 };
        }
        const stageRect = stage.getBoundingClientRect();
        if (!stageRect.width || !stageRect.height) {
            return { width: 0, height: 0 };
        }
        const fitScale = Math.min(
            stageRect.width / lightboxImg.naturalWidth,
            stageRect.height / lightboxImg.naturalHeight,
            1
        );
        return {
            width: lightboxImg.naturalWidth * fitScale,
            height: lightboxImg.naturalHeight * fitScale
        };
    };
    const clampPan = () => {
        if (zoom <= 1) {
            panX = 0;
            panY = 0;
            return;
        }
        const stageRect = stage.getBoundingClientRect();
        const base = getBaseImageSize();
        const scaledWidth = base.width * zoom;
        const scaledHeight = base.height * zoom;
        const maxX = Math.max(0, (scaledWidth - stageRect.width) / 2);
        const maxY = Math.max(0, (scaledHeight - stageRect.height) / 2);
        panX = Math.max(-maxX, Math.min(maxX, panX));
        panY = Math.max(-maxY, Math.min(maxY, panY));
    };
    const applyTransform = () => {
        clampPan();
        lightboxImg.style.transform = `translate(${panX}px, ${panY}px) scale(${zoom})`;
        lightboxImg.classList.toggle('is-pannable', zoom > 1);
        stage.classList.toggle('is-pannable', zoom > 1);
    };
    const setZoomAtPoint = (nextZoom, clientX, clientY) => {
        const clamped = clampZoom(nextZoom);
        if (clamped === zoom) return;

        const stageRect = stage.getBoundingClientRect();
        const anchorX = clientX - stageRect.left - stageRect.width / 2;
        const anchorY = clientY - stageRect.top - stageRect.height / 2;
        const ratio = clamped / zoom;

        panX = (panX - anchorX) * ratio + anchorX;
        panY = (panY - anchorY) * ratio + anchorY;
        zoom = clamped;
        applyTransform();
    };

    const close = () => {
        overlay.classList.remove('open');
        document.body.classList.remove('lightbox-open');
        lightboxImg.src = '';
        lightboxImg.alt = '';
        caption.textContent = '';
        zoom = 1;
        panX = 0;
        panY = 0;
        activePointers.clear();
        panPointerId = null;
        pinchStartDistance = 0;
        applyTransform();
    };

    const open = (img) => {
        const source = img.dataset.lightboxSrc || img.currentSrc || img.src;
        if (!source) return;

        lightboxImg.src = source;
        lightboxImg.alt = img.alt || 'Image agrandie';
        caption.textContent = img.dataset.lightboxCaption || img.alt || '';
        zoom = 1;
        panX = 0;
        panY = 0;
        activePointers.clear();
        panPointerId = null;
        pinchStartDistance = 0;
        applyTransform();
        lightboxImg.onload = () => applyTransform();
        overlay.classList.add('open');
        document.body.classList.add('lightbox-open');
    };

    images.forEach((img) => {
        img.classList.add('zoomable-image');
        img.setAttribute('role', 'button');
        if (!img.hasAttribute('tabindex')) img.tabIndex = 0;

        img.addEventListener('click', () => open(img));
        img.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                open(img);
            }
        });
    });

    overlay.addEventListener('click', (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) return;

        if (target === overlay) {
            close();
            return;
        }

        const action = target.dataset.action;
        if (!action) return;

        if (action === 'close') close();
        if (action === 'reset') {
            zoom = 1;
            panX = 0;
            panY = 0;
            applyTransform();
        }
        if (action === 'zoom-in') {
            const rect = stage.getBoundingClientRect();
            setZoomAtPoint(zoom + 0.25, rect.left + rect.width / 2, rect.top + rect.height / 2);
        }
        if (action === 'zoom-out') {
            const rect = stage.getBoundingClientRect();
            setZoomAtPoint(zoom - 0.25, rect.left + rect.width / 2, rect.top + rect.height / 2);
        }
    });

    lightboxImg.addEventListener('dblclick', (event) => {
        const nextZoom = zoom === 1 ? 2 : 1;
        setZoomAtPoint(nextZoom, event.clientX, event.clientY);
    });

    lightboxImg.addEventListener('wheel', (event) => {
        event.preventDefault();
        const delta = event.deltaY < 0 ? 0.12 : -0.12;
        setZoomAtPoint(zoom + delta, event.clientX, event.clientY);
    }, { passive: false });

    stage.addEventListener('pointerdown', (event) => {
        if (event.button !== 0) return;
        if (!overlay.classList.contains('open')) return;

        activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

        if (activePointers.size === 2) {
            const points = Array.from(activePointers.values());
            pinchStartDistance = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
            pinchStartZoom = zoom;
            pinchStartPanX = panX;
            pinchStartPanY = panY;
            pinchStartCenter = {
                x: (points[0].x + points[1].x) / 2,
                y: (points[0].y + points[1].y) / 2
            };
            panPointerId = null;
            lightboxImg.classList.add('is-panning');
        } else if (zoom > 1) {
            panPointerId = event.pointerId;
            panStartX = event.clientX;
            panStartY = event.clientY;
            panStartPanX = panX;
            panStartPanY = panY;
            if (stage.setPointerCapture) stage.setPointerCapture(event.pointerId);
            lightboxImg.classList.add('is-panning');
        }

        event.preventDefault();
    });

    stage.addEventListener('pointermove', (event) => {
        if (!activePointers.has(event.pointerId)) return;
        activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

        if (activePointers.size >= 2 && pinchStartDistance > 0) {
            const points = Array.from(activePointers.values());
            const distance = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
            const center = {
                x: (points[0].x + points[1].x) / 2,
                y: (points[0].y + points[1].y) / 2
            };
            zoom = clampZoom(pinchStartZoom * (distance / pinchStartDistance));
            panX = pinchStartPanX + (center.x - pinchStartCenter.x);
            panY = pinchStartPanY + (center.y - pinchStartCenter.y);
            applyTransform();
            event.preventDefault();
            return;
        }

        if (panPointerId === event.pointerId && zoom > 1) {
            panX = panStartPanX + (event.clientX - panStartX);
            panY = panStartPanY + (event.clientY - panStartY);
            applyTransform();
            event.preventDefault();
        }
    });

    const finishPointer = (event) => {
        activePointers.delete(event.pointerId);

        if (panPointerId === event.pointerId) {
            panPointerId = null;
        }

        if (activePointers.size === 1 && zoom > 1) {
            const [remainingId, point] = Array.from(activePointers.entries())[0];
            panPointerId = remainingId;
            panStartX = point.x;
            panStartY = point.y;
            panStartPanX = panX;
            panStartPanY = panY;
        }

        if (activePointers.size < 2) {
            pinchStartDistance = 0;
        }

        if (activePointers.size === 0) {
            lightboxImg.classList.remove('is-panning');
        }
    };

    stage.addEventListener('pointerup', finishPointer);
    stage.addEventListener('pointercancel', finishPointer);
    stage.addEventListener('lostpointercapture', finishPointer);

    document.addEventListener('keydown', (event) => {
        if (!overlay.classList.contains('open')) return;

        if (event.key === 'Escape') close();
        if (event.key === '+' || event.key === '=') {
            const rect = stage.getBoundingClientRect();
            setZoomAtPoint(zoom + 0.25, rect.left + rect.width / 2, rect.top + rect.height / 2);
        }
        if (event.key === '-') {
            const rect = stage.getBoundingClientRect();
            setZoomAtPoint(zoom - 0.25, rect.left + rect.width / 2, rect.top + rect.height / 2);
        }
        if (event.key === '0') {
            zoom = 1;
            panX = 0;
            panY = 0;
            applyTransform();
        }
    });
};

buildAutoSectionsAndNav();
initScrollSpy();
initImageLightbox();
