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
        const baseTitle = (titleEl.dataset.baseTitle || titleEl.textContent || '').trim();
        titleEl.dataset.baseTitle = baseTitle;

        const number = index + 1;
        titleEl.textContent = `${number}. ${baseTitle}`;

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

buildAutoSectionsAndNav();
initScrollSpy();
