// ==========================================
// 1. INITIALISATION
// ==========================================
if (typeof hljs !== 'undefined') hljs.highlightAll();
if (typeof lucide !== 'undefined') lucide.createIcons();

// ==========================================
// 2. LOGIQUE PRINCIPALE
// ==========================================
document.querySelectorAll('.playground-container').forEach((container) => {

    const type = container.dataset.type;
    const title = container.dataset.title || "Script JavaScript";
    const instructions = container.dataset.instructions || null;
    const isAutoHeight = container.dataset.autoHeight === "true";
    const isConsoleInitialOpen = container.dataset.consoleOpen === "true";

    container.setAttribute('data-console-state', isConsoleInitialOpen ? 'open' : 'closed');

    const startCode = container.querySelector('.source-code').value.trim();
    const solutionElement = container.querySelector('.solution-code');
    const solutionCode = solutionElement ? solutionElement.value.trim() : "// Pas de solution";
    let userCode = startCode;

    let headerHTML = '';
    if (type === 'exercise') {
        headerHTML = `
            <div class="editor-header">
                <div class="header-left">
                    <span class="badge-type exercise">Exercice</span>
                    <span class="header-title">${title}</span>
                </div>
                <div class="tabs-container">
                    <button class="tab-btn active" data-target="user">Code</button>
                    <button class="tab-btn" data-target="solution"><i data-lucide="key" class="w-3 h-3"></i> Solution</button>
                </div>
            </div>`;
    } else {
        headerHTML = `
            <div class="editor-header">
                <div class="header-left">
                    <span class="badge-type example">Exemple</span>
                    <span class="header-title">${title}</span>
                </div>
            </div>`;
    }

    const bodyHTML = `
        <div class="editor-toolbar">
            <div class="toolbar-info">Modifiez le code ci-dessous et testez-le -></div>
            <div class="toolbar-actions">
                <button class="btn-reset" title="Réinitialiser"><i data-lucide="rotate-ccw" class="w-3 h-3"></i> Reinitialiser</button>
                <button class="btn-run"><i data-lucide="play" class="w-3 h-3"></i> Exécuter</button>
            </div>
        </div>
        ${instructions ? `<div class="toolbar-secondary"><i data-lucide="info" class="w-3 h-3"></i> ${instructions}</div>` : ''}
        
        <div class="editor-body">
            <button class="console-toggle-handle" title="Toggle Console"></button>

            <div class="editor-input-wrapper">
                <div class="readonly-badge">Lecture Seule</div>
                <textarea class="cm-target"></textarea>
            </div>
            <div class="console-output">
                <div class="log-info" style="padding: 10px; opacity: 0.7;">// Le résultat s'affichera ici...</div>
            </div>
        </div>
    `;

    container.innerHTML = headerHTML + bodyHTML;

    // --- CODEMIRROR ---
    const textarea = container.querySelector('.cm-target');
    const editor = CodeMirror.fromTextArea(textarea, {
        mode: "javascript", 
        theme: "dracula", 
        lineNumbers: true,
        autoCloseBrackets: true,
        lineWrapping: false, // Scroll horizontal forcé
        tabSize: 2,
        viewportMargin: isAutoHeight ? Infinity : 10
    });
    
    editor.setValue(startCode);
    if (isAutoHeight) editor.setSize(null, "auto");

    // --- TIROIR ---
    const handle = container.querySelector('.console-toggle-handle');

    const renderHandleIcon = (isOpen) => {
        handle.innerHTML = `<i data-lucide="${isOpen ? 'chevron-right' : 'chevron-left'}" class="w-4 h-4"></i>`;
        lucide.createIcons({ root: handle });
    };

    renderHandleIcon(isConsoleInitialOpen);

    const toggleConsole = (forceOpen = null) => {
        const isOpen = container.getAttribute('data-console-state') === 'open';
        const newState = forceOpen !== null ? forceOpen : !isOpen;

        container.setAttribute('data-console-state', newState ? 'open' : 'closed');
        renderHandleIcon(newState);
        setTimeout(() => editor.refresh(), 450);
    };

    handle.addEventListener('click', () => toggleConsole());

    // --- ONGLETS ---
    const isViewingSolution = () => container.querySelector('.tab-btn[data-target="solution"]')?.classList.contains('active');

    if (type === 'exercise') {
        const tabs = container.querySelectorAll('.tab-btn');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                if (container.querySelector('.tab-btn[data-target="user"]').classList.contains('active')) {
                    userCode = editor.getValue();
                }
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');

                if (tab.dataset.target === 'solution') {
                    editor.setValue(solutionCode); editor.setOption('readOnly', true);
                    container.querySelector('.editor-input-wrapper').classList.add('show-badge');
                    const btn = container.querySelector('.btn-reset'); if(btn) { btn.disabled = true; btn.style.opacity = 0.5; }
                } else {
                    editor.setValue(userCode); editor.setOption('readOnly', false);
                    container.querySelector('.editor-input-wrapper').classList.remove('show-badge');
                    const btn = container.querySelector('.btn-reset'); if(btn) { btn.disabled = false; btn.style.opacity = 1; }
                }
            });
        });
    }

    // --- RESET ---
    const btnReset = container.querySelector('.btn-reset');
    if(btnReset) {
        btnReset.addEventListener('click', () => {
            if (confirm("Recommencer l'exercice ?")) {
                userCode = startCode; editor.setValue(startCode);
                if (isViewingSolution()) container.querySelector('.tab-btn[data-target="user"]').click();
            }
        });
    }

    // --- RUN ---
    const btnRun = container.querySelector('.btn-run');
    const consoleDiv = container.querySelector('.console-output');

    btnRun.addEventListener('click', () => {
        consoleDiv.innerHTML = '';
        const code = editor.getValue();
        const mockConsole = {
            log: (...args) => print('log', args),
            warn: (...args) => print('warn', args),
            error: (...args) => print('error', args)
        };

        function print(type, args) {
            if (container.getAttribute('data-console-state') === 'closed') toggleConsole(true);

            const line = document.createElement('div');
            line.className = `log-entry log-${type}`;
            line.textContent = '> ' + args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ');
            consoleDiv.appendChild(line);
            consoleDiv.scrollTop = consoleDiv.scrollHeight;
        }

        try { new Function('console', code)(mockConsole); } catch (e) { print('error', [e.message]); }
    });
    
    lucide.createIcons({ root: container });
});

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