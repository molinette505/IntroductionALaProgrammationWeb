// ==========================================
// EDITEUR (PLAYGROUND)
// ==========================================
const resolveVisualizerUrl = () => {
    const currentUrl = new URL(window.location.href);
    const notesMarker = '/NotesAvecExercices/';

    if (currentUrl.pathname.includes(notesMarker)) {
        const projectRootPath = `${currentUrl.pathname.split(notesMarker)[0]}/`;
        return new URL(`${projectRootPath}js-visualizer/index.html`, currentUrl).href;
    }

    return new URL('js-visualizer/index.html', currentUrl).href;
};

let visualizerOverlaySingleton = null;

const JS_RESERVED_WORDS = new Set([
    'await', 'break', 'case', 'catch', 'class', 'const', 'continue', 'debugger', 'default', 'delete',
    'do', 'else', 'enum', 'export', 'extends', 'false', 'finally', 'for', 'function', 'if', 'import',
    'in', 'instanceof', 'let', 'new', 'null', 'return', 'super', 'switch', 'this', 'throw', 'true',
    'try', 'typeof', 'var', 'void', 'while', 'with', 'yield',
    'console', 'document', 'window', 'Math', 'Array', 'Object', 'String', 'Number', 'Boolean', 'Date'
]);

const JS_GLOBAL_SUGGESTIONS = [
    'const', 'let', 'var', 'function', 'return', 'if', 'else', 'switch', 'case', 'break', 'default',
    'for', 'while', 'do', 'try', 'catch', 'finally', 'new', 'class', 'async', 'await',
    'document', 'window', 'console.log()', 'console.warn()', 'console.error()', 'setTimeout()', 'setInterval()',
    'document.getElementById()', 'document.querySelector()', 'document.querySelectorAll()',
    'querySelector()', 'querySelectorAll()', 'getElementById()', 'addEventListener()', 'forEach()',
    'classList.add()', 'classList.remove()', 'classList.toggle()',
    'style.setProperty()', 'style.removeProperty()',
    'setAttribute()', 'removeAttribute()', 'getAttribute()'
];

const CLASSLIST_MEMBER_SUGGESTIONS = [
    'add()', 'remove()', 'toggle()', 'contains()'
];

const STYLE_MEMBER_SUGGESTIONS = [
    'display', 'width', 'height', 'margin', 'marginTop', 'marginBottom', 'marginLeft', 'marginRight',
    'padding', 'paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight',
    'border', 'borderWidth', 'borderColor', 'borderStyle', 'borderRadius',
    'color', 'backgroundColor', 'backgroundImage', 'opacity', 'visibility', 'cursor', 'boxShadow',
    'fontSize', 'fontWeight', 'fontFamily', 'textAlign', 'lineHeight', 'textDecoration', 'textTransform',
    'letterSpacing', 'position', 'top', 'bottom', 'left', 'right', 'zIndex', 'overflow', 'float',
    'flex', 'flexDirection', 'justifyContent', 'alignItems', 'gridTemplateColumns', 'gap',
    'transform', 'transition', 'animation'
];

const STYLE_METHOD_SUGGESTIONS = [
    'setProperty()', 'removeProperty()'
];

const DELIMITER_SUGGESTIONS = {
    '$': ['${}']
};

const JS_MEMBER_SUGGESTIONS = [
    'length', 'push()', 'pop()', 'shift()', 'unshift()', 'slice()', 'includes()', 'indexOf()', 'join()',
    'forEach()', 'map()', 'filter()', 'find()', 'trim()', 'toUpperCase()', 'toLowerCase()',
    'value', 'innerText', 'innerHTML', 'textContent',
    'classList', 'style',
    'getElementById()', 'querySelector()', 'querySelectorAll()', 'createElement()',
    'appendChild()', 'setAttribute()', 'removeAttribute()', 'getAttribute()'
];

const HTML_SUGGESTIONS = [
    '<div></div>', '<p></p>', '<span></span>', '<section></section>', '<article></article>',
    '<button></button>', '<input />', '<label></label>', '<ul></ul>', '<li></li>',
    '<h1></h1>', '<h2></h2>', '<img src=\"\" alt=\"\" />', 'id=\"\"', 'class=\"\"'
];

const CSS_SUGGESTIONS = [
    'display', 'position', 'width', 'height', 'margin', 'padding', 'border', 'border-radius',
    'background', 'color', 'font-size', 'font-weight', 'line-height', 'box-sizing', 'gap', 'flex',
    'justify-content', 'align-items', 'grid-template-columns'
];

const getVisualizerOverlay = () => {
    if (visualizerOverlaySingleton) return visualizerOverlaySingleton;

    const root = document.createElement('div');
    root.className = 'visualizer-overlay';
    root.innerHTML = `
        <div class="visualizer-overlay__backdrop"></div>
        <div class="visualizer-overlay__panel" role="dialog" aria-modal="true" aria-label="JS Visualizer">
            <div class="visualizer-overlay__header">
                <span class="visualizer-overlay__title">JS Visualizer</span>
                <button type="button" class="visualizer-overlay__close" title="Fermer" aria-label="Fermer">
                    <i data-lucide="x" class="w-3 h-3"></i>
                </button>
            </div>
            <iframe class="visualizer-overlay__frame" title="JS Visualizer" sandbox="allow-scripts allow-same-origin"></iframe>
        </div>
    `;

    document.body.appendChild(root);
    if (typeof lucide !== 'undefined') lucide.createIcons({ root });

    const backdrop = root.querySelector('.visualizer-overlay__backdrop');
    const panel = root.querySelector('.visualizer-overlay__panel');
    const closeBtn = root.querySelector('.visualizer-overlay__close');
    const frame = root.querySelector('.visualizer-overlay__frame');

    let pendingPayload = null;
    let isFrameReady = false;

    const close = () => {
        root.classList.remove('is-open');
        document.body.classList.remove('visualizer-overlay-open');
    };

    const tryPushPayload = () => {
        if (!pendingPayload || !frame.contentWindow) return false;

        const payload = pendingPayload;

        try {
            const visualizerWindow = frame.contentWindow;
            visualizerWindow.postMessage({ type: 'visualizer:load-content', payload }, '*');
            pendingPayload = null;
            return true;
        } catch (error) {
            pendingPayload = payload;
            return false;
        }
    };

    const open = (src, payload) => {
        pendingPayload = payload || null;
        root.classList.add('is-open');
        document.body.classList.add('visualizer-overlay-open');

        if (frame.src !== src) {
            isFrameReady = false;
            frame.src = src;
            return;
        }

        tryPushPayload();
    };

    frame.addEventListener('load', () => {
        isFrameReady = false;
        if (!pendingPayload) return;
        tryPushPayload();
    });

    window.addEventListener('message', (event) => {
        if (!pendingPayload) return;
        if (event.source !== frame.contentWindow) return;
        if (!event.data || event.data.type !== 'visualizer:ready') return;
        isFrameReady = true;
        tryPushPayload();
    });

    closeBtn.addEventListener('click', close);
    backdrop.addEventListener('click', close);
    panel.addEventListener('click', (event) => event.stopPropagation());

    document.addEventListener('keydown', (event) => {
        if (event.key !== 'Escape') return;
        if (!root.classList.contains('is-open')) return;
        close();
    });

    visualizerOverlaySingleton = { open, close };
    return visualizerOverlaySingleton;
};

document.querySelectorAll('.playground-container').forEach((container) => {
    const type = container.dataset.type;
    const isExerciseType = type === 'exercise';
    const isCompareType = type === 'compare';
    const rawTitle = container.dataset.title || 'Script JavaScript';
    const title = String(rawTitle)
        .replace(/^\s*(?:exemple|exercice|exercise|example)\s*:\s*/i, '')
        .trim() || 'Script JavaScript';
    const instructions = container.dataset.instructions || null;
    const toolbarInfoText = container.dataset.toolbarText
        || container.dataset.runText
        || 'Modifiez le code ci-dessous et testez-le ->';
    const parseTruthyFlag = (rawValue) => {
        if (rawValue == null) return null;
        const value = String(rawValue).trim().toLowerCase();
        if (!value) return true;
        if (['true', '1', 'yes', 'on', 'auto', 'fit', 'content'].includes(value)) return true;
        if (['false', '0', 'no', 'off'].includes(value)) return false;
        return null;
    };

    const hasAutoHeightAttribute = container.hasAttribute('data-auto-height')
        || container.hasAttribute('data-fit-code')
        || container.hasAttribute('data-fit-height')
        || container.hasAttribute('data-fit-code-height');

    const autoHeightFlag = parseTruthyFlag(container.dataset.autoHeight);
    const fitCodeFlag = parseTruthyFlag(
        container.dataset.fitCode
        || container.dataset.fitHeight
        || container.dataset.fitCodeHeight
    );
    const isAutoHeight = autoHeightFlag ?? fitCodeFlag ?? hasAutoHeightAttribute;
    const consoleOpenFlag = parseTruthyFlag(container.dataset.consoleOpen);
    const isConsoleInitialOpen = consoleOpenFlag ?? container.hasAttribute('data-console-open');
    const autoExecuteFlag = parseTruthyFlag(container.dataset.autoExecute);
    const isAutoExecuteEnabled = autoExecuteFlag ?? true;
    const requestedLibrary = String(container.dataset.lib || '').trim().toLowerCase();
    const p5Flag = parseTruthyFlag(container.dataset.p5);
    const shouldLoadP5 = p5Flag ?? (requestedLibrary === 'p5' || requestedLibrary === 'p5js');
    const p5ScriptSrc = container.dataset.p5Src || 'https://cdn.jsdelivr.net/npm/p5@1.9.4/lib/p5.min.js';
    const jsStrictFlag = parseTruthyFlag(container.dataset.jsStrict || container.dataset.strictJs);
    const useStrictJs = jsStrictFlag ?? false;
    container.setAttribute('data-auto-height-enabled', isAutoHeight ? 'true' : 'false');

    const requestedStartEditor = String(container.dataset.startEditor || container.dataset.editorStart || 'js').toLowerCase();
    const requestedOutputView = String(container.dataset.outputDefault || container.dataset.outputView || 'console').toLowerCase();
    const initialOutputView = (requestedOutputView === 'render' || requestedOutputView === 'html') ? 'render' : 'console';

    const readCode = (selector) => {
        const el = container.querySelector(selector);
        return el ? el.value.trim() : '';
    };

    const sourceFiles = {
        html: readCode('.source-code-html'),
        css: readCode('.source-code-css'),
        js: readCode('.source-code-js')
    };

    if (!sourceFiles.js) {
        sourceFiles.js = readCode('.source-code');
    }

    const solutionFiles = {
        html: readCode('.solution-code-html'),
        css: readCode('.solution-code-css'),
        js: readCode('.solution-code-js')
    };

    if (!solutionFiles.js) solutionFiles.js = readCode('.solution-code');

    const compareFiles = {
        html: readCode('.compare-code-html') || readCode('.source-code-b-html'),
        css: readCode('.compare-code-css') || readCode('.source-code-b-css'),
        js: readCode('.compare-code-js') || readCode('.source-code-b-js')
    };
    if (!compareFiles.js) {
        compareFiles.js = readCode('.compare-code') || readCode('.source-code-b');
    }

    // Fallbacks so each tab always has content.
    if (!sourceFiles.html) sourceFiles.html = '';
    if (!sourceFiles.css) sourceFiles.css = '';
    if (!sourceFiles.js) sourceFiles.js = '// Code JavaScript';

    if (!solutionFiles.html) solutionFiles.html = sourceFiles.html;
    if (!solutionFiles.css) solutionFiles.css = sourceFiles.css;
    if (!solutionFiles.js) solutionFiles.js = sourceFiles.js;
    if (!compareFiles.html) compareFiles.html = solutionFiles.html;
    if (!compareFiles.css) compareFiles.css = solutionFiles.css;
    if (!compareFiles.js) compareFiles.js = solutionFiles.js;

    const cloneFiles = (files) => ({ html: files.html, css: files.css, js: files.js });

    const compareLabelA = container.dataset.labelA || 'Choix A';
    const compareLabelB = container.dataset.labelB || 'Choix B';
    const compareIsReadOnly = true;
    const initialPrimaryFiles = cloneFiles(sourceFiles);
    const initialSecondaryFiles = cloneFiles(isCompareType ? compareFiles : solutionFiles);

    let userFiles = cloneFiles(initialPrimaryFiles);
    let secondaryFiles = cloneFiles(initialSecondaryFiles);

    const validFiles = ['html', 'css', 'js'];
    const initialEditorFile = validFiles.includes(requestedStartEditor) ? requestedStartEditor : 'js';

    container.setAttribute('data-console-state', isConsoleInitialOpen ? 'open' : 'closed');
    container.setAttribute('data-output-view', initialOutputView);

    let headerHTML = '';
    if (isExerciseType) {
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
    } else if (isCompareType) {
        headerHTML = `
            <div class="editor-header">
                <div class="header-left">
                    <span class="badge-type compare">Comparaison</span>
                    <span class="header-title">${title}</span>
                </div>
                <div class="tabs-container">
                    <button class="tab-btn active" data-target="user">${compareLabelA}</button>
                    <button class="tab-btn" data-target="solution">${compareLabelB}</button>
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
            <div class="toolbar-info">${toolbarInfoText}</div>
            <div class="toolbar-actions">
                <button class="btn-visualizer" title="Ouvrir dans JS Visualizer" aria-label="Ouvrir dans JS Visualizer">JSV</button>
                <button class="btn-expand" title="Plein écran" aria-label="Plein écran"><i data-lucide="maximize-2" class="w-3 h-3"></i></button>
                <button class="btn-reset" title="Réinitialiser" aria-label="Réinitialiser"><i data-lucide="rotate-ccw" class="w-3 h-3"></i></button>
                <button class="btn-run" title="Exécuter" aria-label="Exécuter"><i data-lucide="save" class="w-3 h-3"></i></button>
            </div>
        </div>
        ${instructions ? `<div class="toolbar-secondary"><i data-lucide="info" class="w-3 h-3"></i> ${instructions}</div>` : ''}

        <div class="editor-body">
            <button class="console-toggle-handle" title="Toggle Console"></button>

            <div class="editor-input-wrapper">
                <div class="readonly-badge">Lecture Seule</div>
                <div class="editor-file-tabs">
                    <button class="editor-file-tab" data-file="html">HTML</button>
                    <button class="editor-file-tab" data-file="css">CSS</button>
                    <button class="editor-file-tab" data-file="js">JS</button>
                </div>
                <textarea class="cm-target"></textarea>
            </div>

            <div class="console-output">
                <div class="output-view-tabs">
                    <button class="output-view-tab" data-view="console">Console</button>
                    <button class="output-view-tab" data-view="render">Rendu</button>
                </div>
                <div class="output-view output-view-console">
                    <div class="output-console-log">
                        <div class="log-info" style="padding: 10px; opacity: 0.7;">// Le résultat s'affichera ici...</div>
                    </div>
                </div>
                <div class="output-view output-view-render">
                    <iframe class="output-render-frame" title="Rendu" sandbox="allow-scripts allow-same-origin"></iframe>
                </div>
            </div>
        </div>
    `;

    container.innerHTML = headerHTML + bodyHTML;

    const editorBody = container.querySelector('.editor-body');
    const editorInputWrapper = container.querySelector('.editor-input-wrapper');
    const textarea = container.querySelector('.cm-target');
    const editor = CodeMirror.fromTextArea(textarea, {
        mode: 'javascript',
        theme: 'dracula',
        lineNumbers: true,
        // Keep auto-closing only for brackets, never for quotes/backticks.
        autoCloseBrackets: {
            pairs: '()[]{}',
            explode: '[]{}()'
        },
        lineWrapping: false,
        tabSize: 2,
        viewportMargin: isAutoHeight ? Infinity : 10
    });
    const isVerticalConsoleLayout = () => window.matchMedia('(max-width: 1024px)').matches;
    const syncAutoHeight = () => {
        if (!isAutoHeight) return;
        requestAnimationFrame(() => {
            editor.setOption('viewportMargin', Infinity);
            editor.setSize(null, 'auto');
            editor.refresh();

            if (!editorBody || !editorInputWrapper) return;
            if (container.classList.contains('is-fullscreen')) {
                editorBody.style.height = '';
                return;
            }
            if (isVerticalConsoleLayout()) {
                // In stacked/mobile mode, let CSS manage total height to keep the handle aligned.
                editorBody.style.height = '';
                return;
            }

            const tabs = editorInputWrapper.querySelector('.editor-file-tabs');
            const tabsHeight = tabs ? tabs.offsetHeight : 0;
            const scrollInfo = editor.getScrollInfo();
            const codeHeight = scrollInfo && Number.isFinite(scrollInfo.height) ? scrollInfo.height : 0;
            const cmScroller = editor.getScrollerElement();
            const cmBorders = cmScroller ? (cmScroller.offsetHeight - cmScroller.clientHeight) : 0;
            const targetHeight = Math.max(110, Math.ceil(tabsHeight + codeHeight + cmBorders));
            editorBody.style.height = `${targetHeight}px`;
        });
    };

    if (isAutoHeight) syncAutoHeight();

    const handle = container.querySelector('.console-toggle-handle');
    const fileTabButtons = container.querySelectorAll('.editor-file-tab');
    const modeTabButtons = container.querySelectorAll('.tab-btn[data-target]');
    const outputTabButtons = container.querySelectorAll('.output-view-tab');

    const btnVisualizer = container.querySelector('.btn-visualizer');
    const btnExpand = container.querySelector('.btn-expand');
    const btnReset = container.querySelector('.btn-reset');
    const btnRun = container.querySelector('.btn-run');

    const consolePanel = container.querySelector('.output-console-log');
    const renderFrame = container.querySelector('.output-render-frame');

    let activeMode = 'user';
    let activeFile = initialEditorFile;
    let runCounter = 0;
    const visualizerUrl = resolveVisualizerUrl();
    const shouldAutoExecuteForMode = (mode = activeMode) => {
        if (!isAutoExecuteEnabled) return false;
        if (isExerciseType && mode === 'user') return false;
        return true;
    };

    const getModeFiles = () => (activeMode === 'solution' ? secondaryFiles : userFiles);

    const getCodeMirrorMode = (file) => {
        if (file === 'html') return 'htmlmixed';
        if (file === 'css') return 'css';
        return 'javascript';
    };

    const stripStringsAndComments = (source) => String(source || '')
        .replace(/\/\*[\s\S]*?\*\//g, ' ')
        .replace(/\/\/[^\n]*/g, ' ')
        .replace(/`(?:\\.|[^`])*`/g, ' ')
        .replace(/"(?:\\.|[^"])*"/g, ' ')
        .replace(/'(?:\\.|[^'])*'/g, ' ');

    const collectIdentifiers = (source) => {
        const cleaned = stripStringsAndComments(source);
        const matches = cleaned.match(/\b[A-Za-z_$][\w$]*\b/g) || [];
        const out = new Set();
        matches.forEach((word) => {
            if (word.length < 2) return;
            if (JS_RESERVED_WORDS.has(word)) return;
            out.add(word);
        });
        return [...out];
    };

    const normalizeSuggestionText = (text) => String(text || '').replace(/[()]/g, '').toLowerCase();

    const buildSuggestionList = (pool, prefix, force) => {
        const normalizedPrefix = String(prefix || '').toLowerCase();
        if (!force && normalizedPrefix.length < 2) return [];

        const unique = [...new Set(pool)];
        const ranked = unique
            .filter((item) => {
                const base = normalizeSuggestionText(item);
                return normalizedPrefix ? base.includes(normalizedPrefix) : true;
            })
            .sort((a, b) => {
                const aBase = normalizeSuggestionText(a);
                const bBase = normalizeSuggestionText(b);
                const aStarts = aBase.startsWith(normalizedPrefix);
                const bStarts = bBase.startsWith(normalizedPrefix);
                if (aStarts !== bStarts) return aStarts ? -1 : 1;
                return aBase.localeCompare(bBase, 'fr');
            });

        return ranked.slice(0, 50);
    };

    const getWordCharRegex = (file) => {
        if (file === 'css') return /[A-Za-z0-9_-]/;
        if (file === 'html') return /[A-Za-z0-9:_-]/;
        return /[A-Za-z0-9_$]/;
    };

    const getAutocompleteContext = (cmInstance) => {
        const cursor = cmInstance.getCursor('head');
        const line = cmInstance.getLine(cursor.line);
        const token = cmInstance.getTokenAt(cursor);
        const tokenType = token.type || '';
        if (/comment|string/.test(tokenType)) return null;

        const end = cursor.ch;
        const wordChar = getWordCharRegex(activeFile);
        let start = end;

        while (start > 0 && wordChar.test(line.charAt(start - 1))) {
            start -= 1;
        }

        let prefix = line.slice(start, end);
        let afterDot = start > 0 && line.charAt(start - 1) === '.';
        let dotQualifier = null;

        if (afterDot) {
            const beforeDot = line.slice(0, start - 1).replace(/\s+$/, '');
            const qualifierMatch = beforeDot.match(/([A-Za-z_$][\w$]*)$/);
            dotQualifier = qualifierMatch ? qualifierMatch[1] : null;
        }

        // For HTML tag suggestions, support "<di" -> "<div></div>"
        if (activeFile === 'html' && start > 0 && line.charAt(start - 1) === '<') {
            start -= 1;
            prefix = line.slice(start, end);
            afterDot = false;
        }

        return {
            cursor,
            start,
            end,
            prefix,
            afterDot,
            dotQualifier
        };
    };

    const getHintListByFile = (file, prefix, afterDot, force, dotQualifier = null) => {
        if (file === 'js') {
            const activeFiles = getModeFiles();
            const symbols = collectIdentifiers(activeFiles.js || '');
            let basePool;

            if (afterDot && dotQualifier === 'style') {
                basePool = [...STYLE_MEMBER_SUGGESTIONS, ...STYLE_METHOD_SUGGESTIONS];
            } else if (afterDot && dotQualifier === 'classList') {
                basePool = CLASSLIST_MEMBER_SUGGESTIONS;
            } else if (afterDot) {
                basePool = JS_MEMBER_SUGGESTIONS;
            } else {
                basePool = [...symbols, ...JS_GLOBAL_SUGGESTIONS];
            }

            return buildSuggestionList(basePool, prefix, force || afterDot);
        }

        if (file === 'html') {
            return buildSuggestionList(HTML_SUGGESTIONS, prefix, force);
        }

        if (file === 'css') {
            return buildSuggestionList(CSS_SUGGESTIONS, prefix, force);
        }

        return [];
    };

    const getCompletionCursorOffset = (insertText) => {
        if (insertText === '${}') return 2;
        if (/\(\)$/.test(insertText)) return insertText.length - 1;
        return insertText.length;
    };

    const isCursorInsideCompletion = (insertText) => {
        if (insertText === '${}') return true;
        return /\(\)$/.test(insertText);
    };

    const buildCompletionEntries = (hints, onPicked = null) => {
        return hints.map((hintValue) => {
            const insertText = String(hintValue);
            return {
                text: insertText,
                displayText: insertText,
                hint: (cm, data, completion) => {
                    const textToInsert = completion && completion.text ? String(completion.text) : insertText;
                    const from = data.from;
                    const to = data.to;
                    cm.replaceRange(textToInsert, from, to, 'complete');
                    const cursorCh = from.ch + getCompletionCursorOffset(textToInsert);
                    const targetPos = CodeMirror.Pos(from.line, cursorCh);
                    cm.setSelection(targetPos, targetPos);
                    cm.focus();

                    // Some key paths can still move the cursor right after pick; re-apply once.
                    if (isCursorInsideCompletion(textToInsert)) {
                        setTimeout(() => {
                            cm.setSelection(targetPos, targetPos);
                        }, 0);
                    }

                    if (typeof onPicked === 'function') onPicked(cm, textToInsert);
                }
            };
        });
    };

    const openAutocompleteList = (hints, from, to, extraOptions = {}) => {
        if (!hints || !hints.length) return;
        const onPicked = typeof extraOptions.onPicked === 'function' ? extraOptions.onPicked : null;
        const entries = buildCompletionEntries(hints, onPicked);
        const { onPicked: _ignoredOnPicked, ...forwardedOptions } = extraOptions;
        const hintOptions = {
            completeSingle: false,
            alignWithWord: true,
            ...forwardedOptions
        };
        CodeMirror.showHint(editor, () => ({
            list: entries,
            from,
            to
        }), hintOptions);
    };

    const showAutocomplete = (force = false, refreshOpen = false) => {
        if (editor.getOption('readOnly')) return;
        if (typeof CodeMirror.showHint !== 'function') return;
        if (editor.state.completionActive) {
            if (!refreshOpen) return;
            editor.state.completionActive.close();
        }

        const context = getAutocompleteContext(editor);
        if (!context) return;

        const hints = getHintListByFile(
            activeFile,
            context.prefix,
            context.afterDot,
            force,
            context.dotQualifier
        );
        if (!hints.length) return;

        openAutocompleteList(
            hints,
            CodeMirror.Pos(context.cursor.line, context.start),
            CodeMirror.Pos(context.cursor.line, context.end)
        );
    };

    const shouldSuggestDelimiter = (line, cursor, charTyped) => {
        if (charTyped !== '$') return false;
        return line.charAt(cursor.ch) !== '{';
    };

    const showDelimiterAutocomplete = (charTyped) => {
        if (editor.getOption('readOnly')) return;
        if (typeof CodeMirror.showHint !== 'function') return;

        const list = DELIMITER_SUGGESTIONS[charTyped];
        if (!list || !list.length) return;

        if (editor.state.completionActive) {
            editor.state.completionActive.close();
        }

        const cursor = editor.getCursor('head');
        const line = editor.getLine(cursor.line);
        if (!shouldSuggestDelimiter(line, cursor, charTyped)) return;

        const from = CodeMirror.Pos(cursor.line, Math.max(0, cursor.ch - 1));
        const to = CodeMirror.Pos(cursor.line, cursor.ch);

        openAutocompleteList(list, from, to);
    };

    editor.setOption('extraKeys', {
        ...(editor.getOption('extraKeys') || {}),
        'Ctrl-Space': () => showAutocomplete(true, true),
        Enter: (cm) => {
            if (cm.state.completionActive) {
                CodeMirror.commands.pickCompletion(cm);
                return;
            }
            return CodeMirror.Pass;
        },
        Tab: (cm) => {
            if (cm.state.completionActive) {
                CodeMirror.commands.pickCompletion(cm);
                return;
            }
            return CodeMirror.Pass;
        }
    });

    editor.on('inputRead', (cmInstance, change) => {
        if (editor.getOption('readOnly')) return;
        if (!change || change.origin === 'setValue' || change.origin === 'complete') return;

        const inserted = Array.isArray(change.text) ? change.text.join('') : '';
        if (inserted.length !== 1) return;

        // Quotes/backticks have no dedicated autocomplete in this editor.
        // If a list is still open from previous typing, close it immediately.
        if (inserted === '\'' || inserted === '"' || inserted === '`') {
            if (editor.state.completionActive) {
                editor.state.completionActive.close();
            }
            return;
        }

        if (inserted === '$') {
            showDelimiterAutocomplete(inserted);
            return;
        }

        if (inserted === '.') {
            showAutocomplete(true, true);
            return;
        }

        if (/[A-Za-z_$]/.test(inserted)) {
            showAutocomplete(false, true);
        }
    });

    const persistCurrentEditorValue = () => {
        if (activeMode === 'user') {
            userFiles[activeFile] = editor.getValue();
            return;
        }
        if (activeMode === 'solution' && isCompareType && !compareIsReadOnly) {
            secondaryFiles[activeFile] = editor.getValue();
        }
    };

    const setOutputView = (view) => {
        const resolved = view === 'render' ? 'render' : 'console';
        container.setAttribute('data-output-view', resolved);
        outputTabButtons.forEach((btn) => {
            btn.classList.toggle('active', btn.dataset.view === resolved);
        });
    };

    const setEditorFile = (file, options = {}) => {
        const { persist = true } = options;
        if (!validFiles.includes(file)) return;
        if (persist) persistCurrentEditorValue();

        activeFile = file;
        fileTabButtons.forEach((btn) => {
            btn.classList.toggle('active', btn.dataset.file === file);
        });

        const files = getModeFiles();
        editor.setOption('mode', getCodeMirrorMode(file));
        editor.setValue(files[file] || '');
        editor.refresh();
        syncAutoHeight();
    };

    const setEditorMode = (mode) => {
        const resolvedMode = mode === 'solution' ? 'solution' : 'user';
        if (resolvedMode === activeMode) return;

        persistCurrentEditorValue();
        activeMode = resolvedMode;

        modeTabButtons.forEach((btn) => {
            btn.classList.toggle('active', btn.dataset.target === resolvedMode);
        });

        const isSolution = resolvedMode === 'solution';
        const isReadOnlyMode = isCompareType || (isSolution && isExerciseType);
        editor.setOption('readOnly', isReadOnlyMode);
        editorInputWrapper.classList.toggle('show-badge', isReadOnlyMode);

        setEditorFile(activeFile, { persist: false });
    };

    const renderExpandIcon = (isFullscreen) => {
        if (!btnExpand) return;
        const label = isFullscreen ? 'Réduire' : 'Plein écran';
        btnExpand.innerHTML = `
            <i data-lucide="${isFullscreen ? 'minimize-2' : 'maximize-2'}" class="w-3 h-3"></i>
        `;
        btnExpand.setAttribute('title', label);
        btnExpand.setAttribute('aria-label', label);
        if (typeof lucide !== 'undefined') lucide.createIcons({ root: btnExpand });
    };

    const setFullscreen = (isFullscreen) => {
        container.classList.toggle('is-fullscreen', isFullscreen);
        document.body.classList.toggle('playground-fullscreen-open', isFullscreen);
        if (btnExpand) btnExpand.setAttribute('aria-pressed', isFullscreen ? 'true' : 'false');
        renderExpandIcon(isFullscreen);
        if (editorBody && isFullscreen) editorBody.style.height = '';
        setTimeout(() => {
            editor.refresh();
            if (!isFullscreen) syncAutoHeight();
        }, 80);
    };

    const renderHandleIcon = (isOpen) => {
        handle.innerHTML = `<i data-lucide="${isOpen ? 'chevron-right' : 'chevron-left'}" class="w-4 h-4"></i>`;
        if (typeof lucide !== 'undefined') lucide.createIcons({ root: handle });
    };

    const toggleConsole = (forceOpen = null) => {
        const isOpen = container.getAttribute('data-console-state') === 'open';
        const newState = forceOpen !== null ? forceOpen : !isOpen;

        container.setAttribute('data-console-state', newState ? 'open' : 'closed');
        renderHandleIcon(newState);
        setTimeout(() => {
            editor.refresh();
            syncAutoHeight();
        }, 450);
    };

    const clearConsole = () => {
        consolePanel.innerHTML = '';
    };

    const showConsolePlaceholder = () => {
        consolePanel.innerHTML = '<div class="log-info" style="padding: 10px; opacity: 0.7;">// Le résultat s\'affichera ici...</div>';
    };

    const buildRenderDoc = (files) => {
        const html = files.html || '';
        const css = files.css || '';
        const p5ScriptTag = shouldLoadP5
            ? `<script src="${p5ScriptSrc}"></script>`
            : '';
        const baseCss = `
html {
  box-sizing: border-box;
}
*,
*::before,
*::after {
  box-sizing: inherit;
}
`;

        return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>${baseCss}\n${css}</style>
${p5ScriptTag}
</head>
<body>
${html}
</body>
</html>`;
    };

    const buildVisualizerPayload = (files, context = {}) => {
        const js = files.js || '';
        const css = files.css || '';
        let html = files.html || '';
        const editorTab = ['html', 'css', 'js'].includes(context.editor) ? context.editor : 'js';
        const viewTab = context.tab === 'dom' ? 'dom' : 'console';
        if (shouldLoadP5 && !/p5(?:\.min)?\.js/i.test(html)) {
            if (/<\/body>/i.test(html)) {
                html = html.replace(/<\/body>/i, `<script src="${p5ScriptSrc}"></script>\n</body>`);
            } else {
                html = `<script src="${p5ScriptSrc}"></script>\n${html}`;
            }
        }
        if (!/<body[\s>]/i.test(html) && !/<html[\s>]/i.test(html)) {
            html = `<body>\n${html}\n</body>`;
        }
        return {
            html,
            css,
            js,
            editor: editorTab,
            tab: viewTab,
            run: false,
            ui: {
                flowLineEnabled: false,
                showFlowLineToggle: false,
                showLoadButton: false
            }
        };
    };

    const loadRenderFrame = (files, runId) => new Promise((resolve) => {
        const content = buildRenderDoc(files);
        const onLoad = () => {
            renderFrame.removeEventListener('load', onLoad);
            if (runId !== runCounter) {
                resolve(null);
                return;
            }
            resolve({
                doc: renderFrame.contentDocument,
                win: renderFrame.contentWindow
            });
        };

        renderFrame.addEventListener('load', onLoad);
        renderFrame.srcdoc = content;
    });

    const resetPreview = async (files) => {
        const previewRunId = ++runCounter;
        await loadRenderFrame(files, previewRunId);
    };

    // Initial UI state.
    renderHandleIcon(isConsoleInitialOpen);
    setOutputView(initialOutputView);
    setEditorMode('user');
    setEditorFile(activeFile, { persist: false });
    renderExpandIcon(false);
    if (isAutoHeight) {
        editor.on('changes', syncAutoHeight);
        window.addEventListener('resize', syncAutoHeight, { passive: true });
    }

    handle.addEventListener('click', () => toggleConsole());

    if (btnExpand) {
        btnExpand.addEventListener('click', () => {
            const isFullscreen = container.classList.contains('is-fullscreen');
            setFullscreen(!isFullscreen);
        });
    }

    if (btnVisualizer) {
        btnVisualizer.addEventListener('click', () => {
            persistCurrentEditorValue();
            const payload = buildVisualizerPayload(cloneFiles(getModeFiles()), {
                editor: activeFile,
                tab: container.getAttribute('data-output-view') === 'render' ? 'dom' : 'console'
            });
            getVisualizerOverlay().open(visualizerUrl, payload);
        });
    }

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && container.classList.contains('is-fullscreen')) {
            setFullscreen(false);
        }
    });

    fileTabButtons.forEach((btn) => {
        btn.addEventListener('click', () => {
            setEditorFile(btn.dataset.file);
        });
    });

    modeTabButtons.forEach((btn) => {
        btn.addEventListener('click', async () => {
            setEditorMode(btn.dataset.target);
            if (shouldAutoExecuteForMode(activeMode)) {
                await runPlayground(false);
            } else {
                await resetPreview(cloneFiles(getModeFiles()));
            }
        });
    });

    outputTabButtons.forEach((btn) => {
        btn.addEventListener('click', () => {
            setOutputView(btn.dataset.view);
        });
    });

    if (btnReset) {
        btnReset.addEventListener('click', async () => {
            if (activeMode === 'solution') {
                secondaryFiles = cloneFiles(initialSecondaryFiles);
            } else {
                userFiles = cloneFiles(initialPrimaryFiles);
            }
            setOutputView(initialOutputView);
            clearConsole();
            showConsolePlaceholder();

            setEditorFile(activeFile, { persist: false });

            if (shouldAutoExecuteForMode(activeMode)) {
                await runPlayground(false);
            } else {
                await resetPreview(cloneFiles(getModeFiles()));
            }
        });
    }

    const runPlayground = async (forceOpenConsole = true) => {
        persistCurrentEditorValue();
        if (forceOpenConsole) toggleConsole(true);
        clearConsole();

        const SOURCE_FILE = 'file.js';
        const STUDENT_SOURCE_FILE = 'StudentCode.js';
        const WRAPPER_OFFSET = 2;
        const STRICT_WRAPPER_OFFSET = 3;
        const runtimeWrapperOffset = useStrictJs ? STRICT_WRAPPER_OFFSET : WRAPPER_OFFSET;
        const DEFAULT_LOCATION = `${SOURCE_FILE}:1:1`;

        const normalizeStudentCode = (value) => String(value)
            .replace(/\u00a0/g, ' ')
            .replace(/[\u200b-\u200d\ufeff]/g, '')
            .replace(/\u2028|\u2029/g, '\n');

        const runFiles = cloneFiles(getModeFiles());
        runFiles.js = normalizeStudentCode(runFiles.js || '');

        const runId = ++runCounter;
        const frameContext = await loadRenderFrame(runFiles, runId);
        if (!frameContext) return;

        const frameDocument = frameContext.doc;
        const frameWindow = frameContext.win;

        if (!frameDocument || !frameWindow) {
            showConsolePlaceholder();
            return;
        }

        const code = runFiles.js;

        const clampText = (text) => {
            return String(text == null ? '' : text);
        };

        const isDomNodeLike = (value) => {
            return Boolean(
                value
                && typeof value === 'object'
                && typeof value.nodeType === 'number'
                && typeof value.nodeName === 'string'
            );
        };

        const isNodeListLike = (value) => {
            return Boolean(
                value
                && typeof value === 'object'
                && typeof value.length === 'number'
                && typeof value.item === 'function'
                && !isDomNodeLike(value)
            );
        };

        const domNodePreview = (value) => {
            if (!isDomNodeLike(value)) return '';

            if (value.nodeType === 1) {
                const html = String(value.outerHTML || `<${String(value.nodeName || '').toLowerCase()}>`)
                    .replace(/\s+/g, ' ')
                    .trim();
                return clampText(html, 420);
            }

            if (value.nodeType === 3) {
                return `#text("${clampText(value.textContent || '', 120)}")`;
            }

            if (value.nodeType === 9) return '[document]';
            return `[Node ${String(value.nodeName || '').toLowerCase()}]`;
        };

        const domCollectionPreview = (value) => {
            const arr = Array.from(value || []);
            const typeName = (value && value.constructor && value.constructor.name) || 'Collection';
            const head = `${typeName}(${arr.length})`;
            if (!arr.length) return head;
            const items = arr.map((item) => domNodePreview(item));
            return `${head} ${items.join(', ')}`;
        };

        const stringifyValue = (value) => {
            if (value === undefined) return 'undefined';
            if (value === null) return 'null';
            if (typeof value === 'string') return value;
            if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') return String(value);
            if (typeof value === 'function') return `[Function ${value.name || 'anonymous'}]`;
            if (isDomNodeLike(value)) return domNodePreview(value);
            if (isNodeListLike(value)) return domCollectionPreview(value);
            if (value === frameWindow) return '[Window]';
            if (value === frameDocument) return '[Document]';
            try {
                return JSON.stringify(value, null, 2);
            } catch (err) {
                return `[Object: ${err.message}]`;
            }
        };

        const inlineValue = (value) => {
            return stringifyValue(value);
        };

        const isErrorLike = (value) => {
            if (!value || typeof value !== 'object') return false;
            if (value instanceof Error) return true;

            const tag = Object.prototype.toString.call(value);
            if (tag === '[object Error]' || tag === '[object DOMException]') return true;

            return typeof value.name === 'string' && typeof value.message === 'string';
        };

        const toErrorLike = (value) => {
            if (!isErrorLike(value)) return null;
            if (value instanceof Error) return value;

            const fallback = new Error(String(value.message || 'Erreur'));
            fallback.name = String(value.name || 'Error');
            if (value.stack) fallback.stack = String(value.stack);

            if (typeof value.lineNumber !== 'undefined') fallback.lineNumber = value.lineNumber;
            if (typeof value.columnNumber !== 'undefined') fallback.columnNumber = value.columnNumber;
            if (typeof value.line !== 'undefined') fallback.line = value.line;
            if (typeof value.col !== 'undefined') fallback.col = value.col;

            return fallback;
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

            String(stack).split('\n').forEach((lineText) => {
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
                const cleanLower = cleanBaseFile.toLowerCase();

                if (cleanLower === 'script.js') return;
                if (cleanLower === 'editor.js' && cleanBaseFile !== SOURCE_FILE) return;

                const isUserFrame = cleanBaseFile === SOURCE_FILE
                    || cleanBaseFile === STUDENT_SOURCE_FILE
                    || cleanBaseFile === '<anonymous>'
                    || /^VM\d+$/i.test(cleanBaseFile)
                    || cleanLower.includes('studentcode.js');
                if (!isUserFrame) return;

                let cleanedFnName = fnName;
                if (cleanedFnName && cleanedFnName.includes('eval')) cleanedFnName = '<global>';
                if (cleanedFnName && cleanedFnName.includes('Object.log')) cleanedFnName = null;

                const frame = toFrame(lineNum - runtimeWrapperOffset, colNum, cleanedFnName);
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

            const lowered = String(errorMessage || '').toLowerCase();
            if (lowered.includes('unexpected identifier')
                || lowered.includes('unexpected token')
                || lowered.includes('invalid or unexpected token')) {
                const tokenMatch = String(errorMessage).match(/['"`]([^'"`]+)['"`]/);
                const token = tokenMatch ? tokenMatch[1] : null;
                if (token) {
                    const index = source.indexOf(token);
                    if (index >= 0) {
                        let tokenLine = 1;
                        let tokenCol = 1;
                        for (let i = 0; i < index; i += 1) {
                            if (source[i] === '\n') {
                                tokenLine += 1;
                                tokenCol = 1;
                            } else {
                                tokenCol += 1;
                            }
                        }
                        return toFrame(tokenLine, tokenCol);
                    }
                }
            }

            return null;
        };

        const getFallbackFrame = (error) => {
            if (!error) return null;

            const stack = String(error.stack || '');
            const anonMatch = stack.match(/<anonymous>:(\d+):(\d+)/);
            if (anonMatch) return toFrame(Number(anonMatch[1]) - runtimeWrapperOffset, Number(anonMatch[2]));

            const lineNum = Number(error.lineNumber || error.line || 0);
            const colNum = Number(error.columnNumber || error.column || error.col || 1);
            if (lineNum > 0) return toFrame(lineNum - runtimeWrapperOffset, colNum);

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

        const iconByType = (typeName) => {
            if (typeName === 'error') return '⨯';
            if (typeName === 'warn') return '⚠';
            if (typeName === 'info') return 'i';
            if (typeName === 'debug') return '•';
            return '›';
        };

        const print = (typeName, args, meta = {}) => {
            if (container.getAttribute('data-console-state') === 'closed') toggleConsole(true);

            const level = ['log', 'warn', 'error', 'info', 'debug'].includes(typeName) ? typeName : 'log';
            if (level === 'error') setOutputView('console');
            const firstErrorRaw = args.find((arg) => isErrorLike(arg)) || null;
            const firstError = toErrorLike(firstErrorRaw);

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
                    if (isErrorLike(arg)) {
                        const err = toErrorLike(arg);
                        if (err) {
                            detailBlocks.push(err.stack || `${err.name}: ${err.message}`);
                            return `${err.name}: ${err.message}`;
                        }
                    }
                    if (arg && typeof arg === 'object') detailBlocks.push(stringifyValue(arg));
                    return inlineValue(arg);
                });
                messageText = pieces.join(' ');

                const callFrames = parseStackFrames(meta.callStack || '');
                locationFrame = callFrames[0] || null;
                if (level !== 'log' && callFrames.length) traceText = toTraceText(callFrames);

                if (level !== 'log' && detailBlocks.length) {
                    traceText = traceText ? `${traceText}\n\n${detailBlocks.join('\n\n')}` : detailBlocks.join('\n\n');
                }

                if (level !== 'log' && !traceText && locationFrame) traceText = `at ${locationFrame.location}`;
            }

            if (!locationFrame && meta.error) {
                locationFrame = getFallbackFrame(toErrorLike(meta.error) || meta.error) || null;
            }

            const locationText = locationFrame ? locationFrame.location : DEFAULT_LOCATION;
            const hasDetails = level !== 'log' && Boolean(traceText);

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
            if (level === 'log') expandBtn.classList.add('is-hidden');

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

            consolePanel.appendChild(entry);
            consolePanel.scrollTop = consolePanel.scrollHeight;
        };

        const captureCallStack = () => {
            try {
                return new frameWindow.Error().stack || new Error().stack;
            } catch (err) {
                return new Error().stack;
            }
        };

        const mockConsole = {
            log: (...args) => print('log', args, { callStack: captureCallStack() }),
            warn: (...args) => print('warn', args, { callStack: captureCallStack() }),
            info: (...args) => print('info', args, { callStack: captureCallStack() }),
            debug: (...args) => print('debug', args, { callStack: captureCallStack() }),
            error: (...args) => print('error', args, { callStack: captureCallStack() })
        };

        frameWindow.console = mockConsole;
        frameWindow.onerror = (message, source, lineno, colno, error) => {
            const normalized = toErrorLike(error);
            if (normalized) {
                print('error', [normalized], { uncaught: true, error: normalized });
                return true;
            }

            const synthetic = new Error(String(message || 'Erreur inconnue'));
            synthetic.stack = `Error: ${synthetic.message}\nat ${SOURCE_FILE}:${lineno || 1}:${colno || 1}`;
            print('error', [synthetic], { uncaught: true, error: synthetic });
            return true;
        };

        frameWindow.onunhandledrejection = (event) => {
            const reason = event && event.reason;
            const error = toErrorLike(reason) || new Error(String(reason || 'Promesse rejetee'));
            print('error', [error], { uncaught: true, error });
            if (event && typeof event.preventDefault === 'function') event.preventDefault();
        };

        if (!code.trim()) {
            showConsolePlaceholder();
            return;
        }

        const codeWithSource = useStrictJs
            ? `"use strict";\n${code}\n//# sourceURL=${STUDENT_SOURCE_FILE}`
            : `${code}\n//# sourceURL=${STUDENT_SOURCE_FILE}`;
        try {
            if (useStrictJs) {
                // Some debugging exercises need strict mode so typos on undeclared
                // variables throw a real ReferenceError.
                const strictRunner = frameWindow.Function(codeWithSource);
                strictRunner.call(frameWindow);
            } else {
                // Pre-parse first so syntax errors surface as JS errors instead of
                // DOM errors mentioning appendChild on the injected <script>.
                frameWindow.Function(codeWithSource);

                // Execute student code as a real script in the frame global scope.
                // This ensures inline handlers like onclick="maFonction()" can resolve
                // top-level function declarations.
                const studentScript = frameDocument.createElement('script');
                studentScript.textContent = codeWithSource;
                frameDocument.body.appendChild(studentScript);
                studentScript.remove();

                // p5.js global mode auto-init may already be passed when user code is
                // injected after frame load. In that case, explicitly start one p5
                // instance so setup()/draw() become active.
                if (shouldLoadP5 && typeof frameWindow.p5 === 'function') {
                    const hasInstanceMode = /\bnew\s+p5\s*\(/.test(code);
                    const hasGlobalSketch = typeof frameWindow.setup === 'function'
                        || typeof frameWindow.draw === 'function'
                        || typeof frameWindow.preload === 'function';

                    if (!hasInstanceMode && hasGlobalSketch) {
                        frameWindow.__playgroundP5Instance = new frameWindow.p5();
                    }
                }
            }
        } catch (error) {
            print('error', [error], { uncaught: true, error });
        }

        if (!consolePanel.children.length) {
            showConsolePlaceholder();
        }
    };

    btnRun.addEventListener('click', async () => {
        await runPlayground(true);
    });

    if (shouldAutoExecuteForMode(activeMode)) {
        runPlayground(false);
    } else {
        resetPreview(cloneFiles(getModeFiles()));
    }

    if (typeof lucide !== 'undefined') lucide.createIcons({ root: container });
});
