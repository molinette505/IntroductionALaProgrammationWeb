(function () {
    const QUIZ_SELECTOR = '.quiz-template';

    const parseJSON = (text, fallback) => {
        try {
            return JSON.parse(text);
        } catch (error) {
            return fallback;
        }
    };

    const normalize = (value, caseSensitive = false) => {
        const text = String(value == null ? '' : value).trim();
        return caseSensitive ? text : text.toLowerCase();
    };

    const unique = (list) => Array.from(new Set(list));

    const createEl = (tag, className, text) => {
        const el = document.createElement(tag);
        if (className) el.className = className;
        if (typeof text === 'string') el.textContent = text;
        return el;
    };

    const getOptionData = (root) => {
        return Array.from(root.querySelectorAll('.quiz-options li')).map((li, index) => ({
            value: li.dataset.value || String(index + 1),
            label: li.textContent.trim()
        }));
    };

    const compareUnordered = (a, b) => {
        if (a.length !== b.length) return false;
        const aa = [...a].sort();
        const bb = [...b].sort();
        return aa.every((item, index) => item === bb[index]);
    };

    const toConsoleLine = (args) => args.map((arg) => {
        if (arg === undefined) return 'undefined';
        if (arg === null) return 'null';
        if (typeof arg === 'string') return arg;
        if (typeof arg === 'number' || typeof arg === 'boolean' || typeof arg === 'bigint') return String(arg);
        try {
            return JSON.stringify(arg);
        } catch (error) {
            return '[Object]';
        }
    }).join(' ');

    const runCodeQuiz = async ({ code, html, css, checks, validatorSource }) => {
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin');

        const fullDoc = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>${css || ''}</style>
</head>
<body>
${html || ''}
</body>
</html>`;

        document.body.appendChild(iframe);

        const loaded = new Promise((resolve) => {
            iframe.addEventListener('load', () => resolve(), { once: true });
        });

        iframe.srcdoc = fullDoc;
        await loaded;

        const frameWindow = iframe.contentWindow;
        const frameDocument = iframe.contentDocument;

        const logs = [];
        const mockConsole = {
            log: (...args) => logs.push({ level: 'log', text: toConsoleLine(args) }),
            info: (...args) => logs.push({ level: 'info', text: toConsoleLine(args) }),
            warn: (...args) => logs.push({ level: 'warn', text: toConsoleLine(args) }),
            error: (...args) => logs.push({ level: 'error', text: toConsoleLine(args) })
        };

        const variableNames = unique((checks || [])
            .filter((check) => check.type === 'variable' && check.name)
            .map((check) => check.name));

        let vars = {};
        let runtimeError = null;

        try {
            const extraction = variableNames.map((name) => {
                const escaped = JSON.stringify(name);
                return `try { __quizVars[${escaped}] = eval(${escaped}); } catch (__quizVarErr) {}`;
            }).join('\n');

            const wrapped = `${code}\n\nconst __quizVars = {};\n${extraction}\nreturn __quizVars;`;
            const fn = frameWindow.Function('console', 'document', 'window', wrapped);
            const result = fn.call(frameWindow, mockConsole, frameDocument, frameWindow);
            if (result && typeof result === 'object') vars = result;
        } catch (error) {
            runtimeError = error;
        }

        const details = [];

        if (!runtimeError) {
            (checks || []).forEach((check) => {
                let ok = false;

                if (check.type === 'variable') {
                    const actual = vars[check.name];
                    if (Object.prototype.hasOwnProperty.call(check, 'equals')) {
                        ok = normalize(actual, check.caseSensitive) === normalize(check.equals, check.caseSensitive);
                    } else if (Object.prototype.hasOwnProperty.call(check, 'includes')) {
                        ok = normalize(actual, check.caseSensitive).includes(normalize(check.includes, check.caseSensitive));
                    } else if (Object.prototype.hasOwnProperty.call(check, 'min') || Object.prototype.hasOwnProperty.call(check, 'max')) {
                        const numeric = Number(actual);
                        const min = Object.prototype.hasOwnProperty.call(check, 'min') ? Number(check.min) : Number.NEGATIVE_INFINITY;
                        const max = Object.prototype.hasOwnProperty.call(check, 'max') ? Number(check.max) : Number.POSITIVE_INFINITY;
                        ok = Number.isFinite(numeric) && numeric >= min && numeric <= max;
                    }
                }

                if (check.type === 'consoleIncludes') {
                    const lines = logs
                        .filter((logItem) => !check.level || logItem.level === check.level)
                        .map((logItem) => logItem.text);
                    ok = lines.some((line) => normalize(line, check.caseSensitive).includes(normalize(check.value, check.caseSensitive)));
                }

                if (check.type === 'consoleEquals') {
                    const lines = logs
                        .filter((logItem) => !check.level || logItem.level === check.level)
                        .map((logItem) => logItem.text);
                    ok = lines.some((line) => normalize(line, check.caseSensitive) === normalize(check.value, check.caseSensitive));
                }

                if (check.type === 'domExists') {
                    ok = Boolean(frameDocument.querySelector(check.selector || ''));
                }

                if (check.type === 'domText') {
                    const el = frameDocument.querySelector(check.selector || '');
                    const text = el ? el.textContent : '';
                    if (Object.prototype.hasOwnProperty.call(check, 'equals')) {
                        ok = normalize(text, check.caseSensitive) === normalize(check.equals, check.caseSensitive);
                    } else if (Object.prototype.hasOwnProperty.call(check, 'includes')) {
                        ok = normalize(text, check.caseSensitive).includes(normalize(check.includes, check.caseSensitive));
                    }
                }

                if (check.type === 'domAttr') {
                    const el = frameDocument.querySelector(check.selector || '');
                    const attrValue = el ? el.getAttribute(check.attr || '') : null;
                    if (Object.prototype.hasOwnProperty.call(check, 'equals')) {
                        ok = normalize(attrValue, check.caseSensitive) === normalize(check.equals, check.caseSensitive);
                    } else if (Object.prototype.hasOwnProperty.call(check, 'includes')) {
                        ok = normalize(attrValue, check.caseSensitive).includes(normalize(check.includes, check.caseSensitive));
                    }
                }

                details.push({
                    ok,
                    message: check.message || `Check ${check.type || 'inconnu'}`
                });
            });
        }

        let validatorResult = null;
        if (!runtimeError && validatorSource && validatorSource.trim()) {
            const quizApi = {
                getVar: (name) => vars[name],
                hasVar: (name) => Object.prototype.hasOwnProperty.call(vars, name),
                getLogs: () => logs.slice(),
                getConsoleText: () => logs.map((line) => line.text).join('\n'),
                query: (selector) => frameDocument.querySelector(selector),
                exists: (selector) => Boolean(frameDocument.querySelector(selector)),
                text: (selector) => {
                    const el = frameDocument.querySelector(selector);
                    return el ? el.textContent || '' : '';
                },
                value: (selector) => {
                    const el = frameDocument.querySelector(selector);
                    if (!el) return '';
                    return 'value' in el ? el.value : '';
                },
                attr: (selector, attrName) => {
                    const el = frameDocument.querySelector(selector);
                    return el ? el.getAttribute(attrName) : null;
                }
            };

            try {
                const validatorFn = new Function('quizApi', 'checks', validatorSource);
                const output = validatorFn(quizApi, details);
                if (typeof output === 'boolean') {
                    validatorResult = { valid: output, message: output ? 'Validation personnalisée: OK.' : 'Validation personnalisée: KO.' };
                } else if (output && typeof output === 'object') {
                    validatorResult = {
                        valid: Boolean(output.valid),
                        message: output.message || ''
                    };
                }
            } catch (error) {
                validatorResult = {
                    valid: false,
                    message: `Erreur dans quiz-validator: ${error.message}`
                };
            }
        }

        iframe.remove();

        if (runtimeError) {
            return {
                ok: false,
                message: `Erreur d'exécution: ${runtimeError.name}: ${runtimeError.message}`,
                details,
                logs,
                vars
            };
        }

        const allChecksValid = details.every((item) => item.ok);
        const finalOk = validatorResult ? allChecksValid && validatorResult.valid : allChecksValid;

        let feedback = finalOk ? 'Bravo, réponse correcte.' : 'Pas encore. Vérifie les conditions demandées.';

        if (!finalOk) {
            const failed = details.filter((item) => !item.ok).map((item) => `- ${item.message}`);
            if (failed.length) feedback += `\n${failed.join('\n')}`;
        }

        if (validatorResult && validatorResult.message) {
            feedback += `\n${validatorResult.message}`;
        }

        return {
            ok: finalOk,
            message: feedback,
            details,
            logs,
            vars
        };
    };

    const buildQuestionView = (template, type, config) => {
        const view = createEl('div', 'quiz-view quiz-view-question active');

        const promptNode = template.querySelector('.quiz-prompt');
        const promptText = promptNode ? promptNode.textContent.trim() : 'Question';
        view.appendChild(createEl('p', 'quiz-prompt-render', promptText));

        const feedback = createEl('div', 'quiz-feedback');
        feedback.style.display = 'none';

        const actions = createEl('div', 'quiz-actions');
        const validateBtn = createEl('button', 'quiz-btn quiz-btn-primary', 'Vérifier');
        validateBtn.type = 'button';
        const resetBtn = createEl('button', 'quiz-btn', 'Réinitialiser');
        resetBtn.type = 'button';

        actions.appendChild(validateBtn);
        actions.appendChild(resetBtn);

        let resetHandler = () => {};
        let validateHandler = async () => ({ ok: false, message: 'Type de quiz non supporté.' });

        if (type === 'single' || type === 'multi') {
            const options = getOptionData(template);
            const list = createEl('ul', 'quiz-options');
            const inputType = type === 'single' ? 'radio' : 'checkbox';
            const inputName = `quiz-${Math.random().toString(36).slice(2)}`;

            options.forEach((option, index) => {
                const item = createEl('li', 'quiz-option-item');
                const input = createEl('input');
                input.type = inputType;
                input.name = inputName;
                input.value = option.value;
                input.id = `${inputName}-${index}`;
                const label = createEl('label', null, option.label);
                label.setAttribute('for', input.id);
                item.appendChild(input);
                item.appendChild(label);
                list.appendChild(item);
            });

            view.appendChild(list);

            validateHandler = async () => {
                const selected = Array.from(list.querySelectorAll('input:checked')).map((input) => input.value);

                if (type === 'single') {
                    const expected = String(config.answer || '');
                    if (!selected.length) return { ok: false, message: 'Sélectionne une option.' };
                    return {
                        ok: selected[0] === expected,
                        message: selected[0] === expected ? 'Bonne réponse.' : 'Ce n\'est pas la bonne option.'
                    };
                }

                const expected = (config.answers || []).map(String);
                if (!selected.length) return { ok: false, message: 'Sélectionne au moins une option.' };
                const ok = compareUnordered(selected, expected);
                return {
                    ok,
                    message: ok ? 'Bon choix multiple.' : 'Revois les options cochées.'
                };
            };

            resetHandler = () => {
                list.querySelectorAll('input').forEach((input) => {
                    input.checked = false;
                });
            };
        }

        if (type === 'text') {
            const input = createEl('input', 'quiz-text-input');
            input.type = 'text';
            input.placeholder = config.placeholder || 'Écris ta réponse ici';
            view.appendChild(input);

            validateHandler = async () => {
                const actual = input.value.trim();
                if (!actual) return { ok: false, message: 'Saisis une réponse.' };

                const accepted = Array.isArray(config.answers)
                    ? config.answers.map((answer) => normalize(answer, config.caseSensitive))
                    : [normalize(config.answer || '', config.caseSensitive)];

                const ok = accepted.includes(normalize(actual, config.caseSensitive));
                return {
                    ok,
                    message: ok ? 'Réponse correcte.' : 'Réponse incorrecte.'
                };
            };

            resetHandler = () => {
                input.value = '';
            };
        }

        if (type === 'order') {
            const options = getOptionData(template);
            let ordered = options.map((option) => option.value);
            const optionMap = new Map(options.map((option) => [option.value, option.label]));
            const list = createEl('ul', 'quiz-order-list');

            const renderOrder = () => {
                list.innerHTML = '';
                ordered.forEach((value, index) => {
                    const item = createEl('li', 'quiz-order-item');
                    const badge = createEl('span', 'quiz-order-index', String(index + 1));
                    const text = createEl('span', null, optionMap.get(value) || value);
                    const controls = createEl('div', 'quiz-order-controls');

                    const up = createEl('button', 'quiz-order-btn', '↑');
                    up.type = 'button';
                    up.disabled = index === 0;
                    up.addEventListener('click', () => {
                        if (index === 0) return;
                        const next = [...ordered];
                        [next[index - 1], next[index]] = [next[index], next[index - 1]];
                        ordered = next;
                        renderOrder();
                    });

                    const down = createEl('button', 'quiz-order-btn', '↓');
                    down.type = 'button';
                    down.disabled = index === ordered.length - 1;
                    down.addEventListener('click', () => {
                        if (index === ordered.length - 1) return;
                        const next = [...ordered];
                        [next[index], next[index + 1]] = [next[index + 1], next[index]];
                        ordered = next;
                        renderOrder();
                    });

                    controls.appendChild(up);
                    controls.appendChild(down);
                    item.appendChild(badge);
                    item.appendChild(text);
                    item.appendChild(controls);
                    list.appendChild(item);
                });
            };

            renderOrder();
            view.appendChild(list);

            validateHandler = async () => {
                const expected = (config.order || []).map(String);
                if (!expected.length) return { ok: false, message: 'Quiz mal configuré (order manquant).' };
                const ok = expected.length === ordered.length && expected.every((value, index) => value === ordered[index]);
                return {
                    ok,
                    message: ok ? 'Ordre correct.' : 'L\'ordre n\'est pas correct.'
                };
            };

            resetHandler = () => {
                ordered = options.map((option) => option.value);
                renderOrder();
            };
        }

        if (type === 'code') {
            const starter = (template.querySelector('.quiz-starter') || {}).value || '';
            const quizHtml = (template.querySelector('.quiz-html') || {}).value || '';
            const quizCss = (template.querySelector('.quiz-css') || {}).value || '';
            const validatorSource = (template.querySelector('.quiz-validator') || {}).value || '';

            const codeArea = createEl('div', 'quiz-code-area');
            const textarea = createEl('textarea');
            textarea.value = starter;
            codeArea.appendChild(textarea);
            view.appendChild(codeArea);

            let editor = null;
            if (typeof CodeMirror !== 'undefined') {
                editor = CodeMirror.fromTextArea(textarea, {
                    mode: 'javascript',
                    theme: 'dracula',
                    lineNumbers: true,
                    autoCloseBrackets: true,
                    lineWrapping: false,
                    tabSize: 2,
                    viewportMargin: Infinity
                });
                editor.setSize(null, 190);
            }

            const getCurrentCode = () => (editor ? editor.getValue() : textarea.value);
            const setCurrentCode = (value) => {
                if (editor) {
                    editor.setValue(value);
                    editor.refresh();
                    return;
                }
                textarea.value = value;
            };

            validateHandler = async () => {
                const result = await runCodeQuiz({
                    code: getCurrentCode(),
                    html: quizHtml,
                    css: quizCss,
                    checks: config.checks || [],
                    validatorSource
                });
                return {
                    ok: result.ok,
                    message: result.message
                };
            };

            resetHandler = () => {
                setCurrentCode(starter);
            };

            const helperLines = [
                'API quiz (validator personnalisé):',
                '- quizApi.getVar(name)',
                '- quizApi.getLogs()',
                '- quizApi.getConsoleText()',
                '- quizApi.exists(selector)',
                '- quizApi.text(selector)',
                '- quizApi.value(selector)',
                '- quizApi.attr(selector, attrName)'
            ];
            const helper = createEl('div', 'quiz-help', helperLines.join('\n'));
            view.appendChild(helper);
        }

        validateBtn.addEventListener('click', async () => {
            validateBtn.disabled = true;
            const result = await validateHandler();
            validateBtn.disabled = false;

            feedback.style.display = 'block';
            feedback.classList.remove('ok', 'ko');
            feedback.classList.add(result.ok ? 'ok' : 'ko');
            feedback.textContent = result.message;
        });

        resetBtn.addEventListener('click', () => {
            resetHandler();
            feedback.style.display = 'none';
            feedback.textContent = '';
            feedback.classList.remove('ok', 'ko');
        });

        view.appendChild(actions);
        view.appendChild(feedback);

        return view;
    };

    const buildSolutionView = (template, type) => {
        const view = createEl('div', 'quiz-view quiz-view-solution');

        const plainSolution = (template.querySelector('.quiz-solution') || {}).value || '';
        const codeSolution = (template.querySelector('.quiz-solution-code') || {}).value || '';

        const content = codeSolution || plainSolution || 'Aucune solution définie.';

        const block = createEl('div', 'quiz-solution-block');

        if (codeSolution) {
            const pre = createEl('pre');
            const code = createEl('code');
            code.textContent = content;
            pre.appendChild(code);
            block.appendChild(pre);
        } else {
            block.textContent = content;
        }

        view.appendChild(block);
        return view;
    };

    const initQuiz = (template, index) => {
        const type = String(template.dataset.type || '').toLowerCase();
        const title = template.dataset.title || 'Quiz';

        const configNode = template.querySelector('.quiz-config');
        const config = configNode ? parseJSON(configNode.textContent, {}) : {};

        const widget = createEl('div', 'quiz-widget');

        const header = createEl('div', 'quiz-header');
        const titleEl = createEl('div', 'quiz-title');
        const badge = createEl('span', 'quiz-badge', String(index + 1));
        titleEl.appendChild(badge);
        titleEl.appendChild(document.createTextNode(title));

        const tabs = createEl('div', 'quiz-tabs');
        const btnQuiz = createEl('button', 'quiz-tab active', 'Quiz');
        const btnSolution = createEl('button', 'quiz-tab', 'Solution');
        btnQuiz.type = 'button';
        btnSolution.type = 'button';

        tabs.appendChild(btnQuiz);
        tabs.appendChild(btnSolution);

        header.appendChild(titleEl);
        header.appendChild(tabs);

        const body = createEl('div', 'quiz-body');

        const questionView = buildQuestionView(template, type, config);
        const solutionView = buildSolutionView(template, type);

        body.appendChild(questionView);
        body.appendChild(solutionView);

        btnQuiz.addEventListener('click', () => {
            btnQuiz.classList.add('active');
            btnSolution.classList.remove('active');
            questionView.classList.add('active');
            solutionView.classList.remove('active');
        });

        btnSolution.addEventListener('click', () => {
            btnSolution.classList.add('active');
            btnQuiz.classList.remove('active');
            solutionView.classList.add('active');
            questionView.classList.remove('active');
        });

        widget.appendChild(header);
        widget.appendChild(body);

        template.innerHTML = '';
        template.appendChild(widget);
    };

    document.querySelectorAll(QUIZ_SELECTOR).forEach((node, index) => {
        initQuiz(node, index);
    });
})();
