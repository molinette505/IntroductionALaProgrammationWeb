// ==========================================
// 1. INITIALISATION
// ==========================================
if (typeof hljs !== 'undefined') hljs.highlightAll();
if (typeof lucide !== 'undefined') lucide.createIcons();

// --- UI GLOBALE ---
const menuBtn = document.getElementById('menu-btn');
const sidebar = document.getElementById('sidebar');
if (menuBtn && sidebar) menuBtn.addEventListener('click', () => sidebar.classList.toggle('open'));

const links = document.querySelectorAll('.nav-link');
const sections = document.querySelectorAll('.section-spy');
if (links.length > 0) {
    window.addEventListener('scroll', () => {
        let current = '';
        sections.forEach(sec => { if (window.scrollY >= sec.offsetTop - 300) current = sec.id; });
        links.forEach(l => {
            l.classList.remove('active');
            if (l.getAttribute('href').includes(current)) l.classList.add('active');
        });
    });
}
