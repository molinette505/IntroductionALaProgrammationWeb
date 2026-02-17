// ==========================================
// EDITEUR (PLAYGROUND)
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
        lineWrapping: false,
        tabSize: 2,
        viewportMargin: isAutoHeight ? Infinity : 10
    });

    editor.setValue(startCode);
    if (isAutoHeight) editor.setSize(null, "auto");

    // --- TIROIR ---
    const handle = container.querySelector('.console-toggle-handle');

    const renderHandleIcon = (isOpen) => {
        handle.innerHTML = `<i data-lucide="${isOpen ? 'chevron-right' : 'chevron-left'}" class="w-4 h-4"></i>`;
        if (typeof lucide !== 'undefined') lucide.createIcons({ root: handle });
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
                    const btn = container.querySelector('.btn-reset'); if (btn) { btn.disabled = true; btn.style.opacity = 0.5; }
                } else {
                    editor.setValue(userCode); editor.setOption('readOnly', false);
                    container.querySelector('.editor-input-wrapper').classList.remove('show-badge');
                    const btn = container.querySelector('.btn-reset'); if (btn) { btn.disabled = false; btn.style.opacity = 1; }
                }
            });
        });
    }

    // --- RESET ---
    const btnReset = container.querySelector('.btn-reset');
    if (btnReset) {
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
        const SOURCE_FILE = 'Editor.js';
        const STUDENT_SOURCE_FILE = 'StudentCode.js';
        const WRAPPER_OFFSET = 2;
        const DEFAULT_LOCATION = `${SOURCE_FILE}:1:1`;

        const normalizeStudentCode = (value) => String(value)
            .replace(/\u00a0/g, ' ')
            .replace(/[\u200b-\u200d\ufeff]/g, '')
            .replace(/\u2028|\u2029/g, '\n');

        const code = normalizeStudentCode(editor.getValue());

        const stringifyValue = (value) => {
            if (value === undefined) return 'undefined';
            if (value === null) return 'null';
            if (typeof value === 'string') return value;
            if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') return String(value);
            if (typeof value === 'function') return `[Function ${value.name || 'anonymous'}]`;
            try {
                return JSON.stringify(value, null, 2);
            } catch (err) {
                return `[Object: ${err.message}]`;
            }
        };

        const inlineValue = (value) => {
            const text = stringifyValue(value);
            return text.includes('\n') ? `${text.split('\n')[0]} ...` : text;
        };

        const toFrame = (line, col, fnName = null) => ({
            fnName,
            file: SOURCE_FILE,
            line: Math.max(1, line),
            col: Math.max(1, col),
            location: `${SOURCE_FILE}:${Math.max(1, line)}:${Math.max(1, col)}`
        });

        const parseStackFrames = (stack) => {
            if (!stack) return [];
            const frames = [];
            const seen = new Set();
            const lines = String(stack).split('\n');

            lines.forEach((lineText) => {
                const line = lineText.trim();
                if (!line) return;

                let fnName = null;
                let locationPart = line;

                if (line.startsWith('at ')) {
                    const body = line.slice(3);
                    const fnMatch = body.match(/^(.*?)\s+\((.*)\)$/);
                    if (fnMatch) {
                        fnName = fnMatch[1] || null;
                        locationPart = fnMatch[2];
                    } else {
                        fnName = null;
                        locationPart = body;
                    }
                } else if (line.includes('@')) {
                    const atIndex = line.indexOf('@');
                    fnName = atIndex > 0 ? line.slice(0, atIndex) : null;
                    locationPart = line.slice(atIndex + 1);
                }

                let match;
                let last = null;
                const locator = /([^\s()]+):(\d+):(\d+)/g;
                while ((match = locator.exec(locationPart)) !== null) {
                    last = match;
                }
                if (!last) return;

                const rawFile = last[1];
                const lineNum = Number(last[2]);
                const colNum = Number(last[3]);
                const baseFile = rawFile.split('/').pop() || '';
                const cleanBaseFile = baseFile.split('?')[0].split('#')[0];
                const baseLower = baseFile.toLowerCase();
                const cleanLower = cleanBaseFile.toLowerCase();

                if (baseLower === 'script.js') return;
                if (baseLower === 'editor.js' && cleanBaseFile !== SOURCE_FILE) return;

                const isUserFrame = cleanBaseFile === SOURCE_FILE
                    || cleanBaseFile === STUDENT_SOURCE_FILE
                    || cleanBaseFile === '<anonymous>'
                    || /^VM\d+$/i.test(cleanBaseFile)
                    || cleanLower.includes('studentcode.js');
                if (!isUserFrame) return;

                let cleanedFnName = fnName;
                if (cleanedFnName && cleanedFnName.includes('eval')) {
                    cleanedFnName = '<global>';
                }
                if (cleanedFnName && cleanedFnName.includes('Object.log')) {
                    cleanedFnName = null;
                }

                const frame = toFrame(lineNum - WRAPPER_OFFSET, colNum, cleanedFnName);
                const key = `${frame.location}|${frame.fnName || ''}`;
                if (seen.has(key)) return;
                seen.add(key);
                frames.push(frame);
            });

            return frames;
        };

        const inferSyntaxFrameFromCode = (source, errorMessage = '') => {
            const stackDelimiters = [];
            let line = 1;
            let col = 0;
            let inSingle = false;
            let inDouble = false;
            let inTemplate = false;
            let inLineComment = false;
            let inBlockComment = false;
            let escaped = false;
            let quoteStart = null;

            for (let i = 0; i < source.length; i += 1) {
                const ch = source[i];
                const next = source[i + 1] || '';
                col += 1;

                // In JS, an unescaped newline inside '...' or "..." is a syntax error.
                // We report the opening quote as the most useful location.
                if ((inSingle || inDouble) && ch === '\n' && !escaped) {
                    if (quoteStart) return toFrame(quoteStart.line, quoteStart.col);
                    return toFrame(line, Math.max(1, col - 1));
                }

                if (ch === '\n') {
                    line += 1;
                    col = 0;
                    inLineComment = false;
                    escaped = false;
                    continue;
                }

                if (inLineComment) continue;

                if (inBlockComment) {
                    if (ch === '*' && next === '/') {
                        inBlockComment = false;
                        i += 1;
                        col += 1;
                    }
                    continue;
                }

                if (inSingle || inDouble || inTemplate) {
                    if (escaped) {
                        escaped = false;
                        continue;
                    }
                    if (ch === '\\') {
                        escaped = true;
                        continue;
                    }
                    if (inSingle && ch === '\'') {
                        inSingle = false;
                        quoteStart = null;
                        continue;
                    }
                    if (inDouble && ch === '"') {
                        inDouble = false;
                        quoteStart = null;
                        continue;
                    }
                    if (inTemplate && ch === '`') {
                        inTemplate = false;
                        quoteStart = null;
                        continue;
                    }
                    continue;
                }

                if (ch === '/' && next === '/') {
                    inLineComment = true;
                    i += 1;
                    col += 1;
                    continue;
                }
                if (ch === '/' && next === '*') {
                    inBlockComment = true;
                    i += 1;
                    col += 1;
                    continue;
                }

                if (ch === '\'') {
                    inSingle = true;
                    quoteStart = { line, col };
                    continue;
                }
                if (ch === '"') {
                    inDouble = true;
                    quoteStart = { line, col };
                    continue;
                }
                if (ch === '`') {
                    inTemplate = true;
                    quoteStart = { line, col };
                    continue;
                }

                if (ch === '(' || ch === '[' || ch === '{') {
                    stackDelimiters.push({ ch, line, col });
                    continue;
                }
                if (ch === ')' || ch === ']' || ch === '}') {
                    const last = stackDelimiters[stackDelimiters.length - 1];
                    if (!last) return toFrame(line, col);
                    const pair = `${last.ch}${ch}`;
                    if (!['()', '[]', '{}'].includes(pair)) return toFrame(line, col);
                    stackDelimiters.pop();
                }
            }

            if (quoteStart) return toFrame(quoteStart.line, quoteStart.col);

            if (stackDelimiters.length) {
                const msg = String(errorMessage || '').toLowerCase();
                if (msg.includes('missing )') || msg.includes('expected')) {
                    const lastParen = [...stackDelimiters].reverse().find((entry) => entry.ch === '(');
                    if (lastParen) return toFrame(lastParen.line, lastParen.col);
                }
                const last = stackDelimiters[stackDelimiters.length - 1];
                return toFrame(last.line, last.col);
            }

            return null;
        };

        const getFallbackFrame = (error) => {
            if (!error) return null;

            const stack = String(error.stack || '');
            const anonMatch = stack.match(/<anonymous>:(\d+):(\d+)/);
            if (anonMatch) return toFrame(Number(anonMatch[1]) - WRAPPER_OFFSET, Number(anonMatch[2]));

            const lineNum = Number(error.lineNumber || error.line || 0);
            const colNum = Number(error.columnNumber || error.column || error.col || 1);
            if (lineNum > 0) return toFrame(lineNum - WRAPPER_OFFSET, colNum);

            return null;
        };

        const toTraceText = (frames) => {
            if (!frames.length) return '';
            return frames.map((frame) => {
                if (frame.fnName) return `at ${frame.fnName} (${frame.location})`;
                return `at ${frame.location}`;
            }).join('\n');
        };

        const focusEditorLine = (frame) => {
            if (!frame) return;
            const lineIndex = Math.max(0, frame.line - 1);
            const chIndex = Math.max(0, frame.col - 1);
            editor.focus();
            editor.setCursor({ line: lineIndex, ch: chIndex });
            editor.scrollIntoView({ line: lineIndex, ch: chIndex }, 120);
        };

        const iconByType = (type) => {
            if (type === 'error') return '⨯';
            if (type === 'warn') return '⚠';
            if (type === 'info') return 'i';
            if (type === 'debug') return '•';
            return '›';
        };

        const print = (type, args, meta = {}) => {
            if (container.getAttribute('data-console-state') === 'closed') toggleConsole(true);

            const level = ['log', 'warn', 'error', 'info', 'debug'].includes(type) ? type : 'log';
            const firstError = args.find((arg) => arg instanceof Error) || null;

            let locationFrame = null;
            let traceText = '';
            let messageText = '';

            if (firstError) {
                const errorFrames = parseStackFrames(firstError.stack);
                const inferredSyntaxFrame = inferSyntaxFrameFromCode(code, firstError.message);
                locationFrame = errorFrames[0] || inferredSyntaxFrame || getFallbackFrame(firstError) || null;
                traceText = toTraceText(errorFrames) || (locationFrame ? `at ${locationFrame.location}` : '');
                const uncaughtPrefix = meta.uncaught ? 'Uncaught ' : '';
                messageText = `${uncaughtPrefix}${firstError.name}: ${firstError.message}`;
            } else {
                const detailBlocks = [];
                const pieces = args.map((arg) => {
                    if (arg && typeof arg === 'object') {
                        detailBlocks.push(stringifyValue(arg));
                    }
                    return inlineValue(arg);
                });
                messageText = pieces.join(' ');
                const callFrames = parseStackFrames(meta.callStack || '');
                locationFrame = callFrames[0] || null;
                if (callFrames.length) traceText = toTraceText(callFrames);
                if (detailBlocks.length) {
                    traceText = traceText ? `${traceText}\n\n${detailBlocks.join('\n\n')}` : detailBlocks.join('\n\n');
                }
                if (!traceText && locationFrame) {
                    traceText = `at ${locationFrame.location}`;
                }
            }

            if (!locationFrame && meta.error) {
                locationFrame = getFallbackFrame(meta.error) || null;
            }

            const locationText = locationFrame ? locationFrame.location : DEFAULT_LOCATION;
            const hasDetails = Boolean(traceText);

            const entry = document.createElement('div');
            entry.className = `console-entry console-entry--${level}`;

            const row = document.createElement('div');
            row.className = 'console-row';

            const expandBtn = document.createElement('button');
            expandBtn.type = 'button';
            expandBtn.className = 'console-expand';
            expandBtn.textContent = hasDetails ? '▸' : ' ';
            expandBtn.disabled = !hasDetails;
            if (!hasDetails) expandBtn.classList.add('is-empty');

            const icon = document.createElement('span');
            icon.className = `console-icon console-icon--${level}`;
            icon.textContent = iconByType(level);

            const message = document.createElement('span');
            message.className = 'console-message';
            message.textContent = messageText || 'undefined';

            const location = document.createElement('button');
            location.type = 'button';
            location.className = 'console-location';
            location.textContent = locationText;
            if (locationFrame) {
                location.addEventListener('click', () => focusEditorLine(locationFrame));
            } else {
                location.disabled = true;
                location.classList.add('is-disabled');
            }

            row.appendChild(expandBtn);
            row.appendChild(icon);
            row.appendChild(message);
            row.appendChild(location);
            entry.appendChild(row);

            if (hasDetails) {
                const details = document.createElement('pre');
                details.className = 'console-details';
                details.textContent = traceText;

                const detailsActions = document.createElement('div');
                detailsActions.className = 'console-details-actions';

                const copyTraceBtn = document.createElement('button');
                copyTraceBtn.type = 'button';
                copyTraceBtn.className = 'console-copy-trace';
                copyTraceBtn.textContent = 'Copier trace';
                copyTraceBtn.addEventListener('click', async () => {
                    try {
                        await navigator.clipboard.writeText(traceText);
                        copyTraceBtn.textContent = 'Trace copiee';
                        setTimeout(() => { copyTraceBtn.textContent = 'Copier trace'; }, 1200);
                    } catch (err) {
                        copyTraceBtn.textContent = 'Copie impossible';
                        setTimeout(() => { copyTraceBtn.textContent = 'Copier trace'; }, 1200);
                    }
                });

                detailsActions.appendChild(copyTraceBtn);
                entry.appendChild(detailsActions);
                entry.appendChild(details);

                const toggleDetails = () => {
                    const isOpen = entry.classList.toggle('is-open');
                    expandBtn.textContent = isOpen ? '▾' : '▸';
                };

                expandBtn.addEventListener('click', toggleDetails);
                if (level === 'error') {
                    entry.classList.add('is-open');
                    expandBtn.textContent = '▾';
                }
            }

            consoleDiv.appendChild(entry);
            consoleDiv.scrollTop = consoleDiv.scrollHeight;
        };

        const mockConsole = {
            log: (...args) => print('log', args, { callStack: new Error().stack }),
            warn: (...args) => print('warn', args, { callStack: new Error().stack }),
            info: (...args) => print('info', args, { callStack: new Error().stack }),
            debug: (...args) => print('debug', args, { callStack: new Error().stack }),
            error: (...args) => print('error', args, { callStack: new Error().stack })
        };

        const codeWithSource = `${code}\n//# sourceURL=${STUDENT_SOURCE_FILE}`;
        let runnable;

        try {
            runnable = new Function('console', codeWithSource);
        } catch (error) {
            print('error', [error], { uncaught: true, error });
            return;
        }

        try {
            runnable(mockConsole);
        } catch (error) {
            print('error', [error], { uncaught: true, error });
        }
    });

    if (typeof lucide !== 'undefined') lucide.createIcons({ root: container });
});
