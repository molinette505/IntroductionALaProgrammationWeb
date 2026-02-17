(function () {
    const QUIZ_SELECTOR = '.quiz-template';

    const parseJSON = (text, fallback) => {
        try {
            return JSON.parse(text);
        } catch (error) {
            return fallback;
        }
    };

    const normalize = (value, caseSensitive) => {
        const text = String(value == null ? '' : value).trim();
        return caseSensitive ? text : text.toLowerCase();
    };

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

    const clearOptionStates = (list) => {
        list.querySelectorAll('.quiz-option-item').forEach((item) => {
            item.classList.remove('is-correct', 'is-wrong', 'is-missed');
        });
    };

    const clearOrderStates = (list) => {
        list.querySelectorAll('.quiz-order-item').forEach((item) => {
            item.classList.remove('is-correct', 'is-wrong');
        });
    };

    const toAcceptedAnswers = (config) => {
        if (Array.isArray(config.answers) && config.answers.length) {
            return config.answers.map((value) => String(value));
        }
        if (Object.prototype.hasOwnProperty.call(config, 'answer')) {
            return [String(config.answer)];
        }
        return [];
    };

    const buildQuestionView = (template, type, config) => {
        const view = createEl('div', 'quiz-view');

        const promptNode = template.querySelector('.quiz-prompt');
        const promptText = promptNode ? promptNode.textContent.trim() : 'Question';
        view.appendChild(createEl('p', 'quiz-prompt-render', promptText));

        const feedback = createEl('div', 'quiz-feedback');
        feedback.style.display = 'none';

        const correction = createEl('div', 'quiz-correction');
        correction.style.display = 'none';

        const actions = createEl('div', 'quiz-actions');
        const validateBtn = createEl('button', 'quiz-btn quiz-btn-primary', 'Valider');
        validateBtn.type = 'button';
        const resetBtn = createEl('button', 'quiz-btn', 'Réinitialiser');
        resetBtn.type = 'button';
        const scoreTag = createEl('span', 'quiz-score', 'Score : 0/1');

        actions.appendChild(validateBtn);
        actions.appendChild(resetBtn);
        actions.appendChild(scoreTag);

        const solutionText = ((template.querySelector('.quiz-solution') || {}).value || '').trim();

        let resetHandler = () => {};
        let validateHandler = () => ({
            ok: false,
            score: 0,
            max: 1,
            message: 'Type de quiz non supporté.',
            expectedText: ''
        });

        if (type === 'single' || type === 'multi') {
            const options = getOptionData(template);
            const optionLabelMap = new Map(options.map((option) => [option.value, option.label]));
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

            validateHandler = () => {
                const selectedValues = Array.from(list.querySelectorAll('input:checked')).map((input) => input.value);
                clearOptionStates(list);

                if (type === 'single') {
                    const expected = String(config.answer || '');
                    const expectedLabel = optionLabelMap.get(expected) || expected;

                    list.querySelectorAll('.quiz-option-item').forEach((item) => {
                        const input = item.querySelector('input');
                        if (!input) return;
                        if (input.value === expected) item.classList.add('is-correct');
                        if (input.checked && input.value !== expected) item.classList.add('is-wrong');
                    });

                    if (!selectedValues.length) {
                        return {
                            ok: false,
                            score: 0,
                            max: 1,
                            message: 'Sélectionne une option.',
                            expectedText: expectedLabel
                        };
                    }

                    const ok = selectedValues[0] === expected;
                    return {
                        ok,
                        score: ok ? 1 : 0,
                        max: 1,
                        message: ok ? 'Bonne réponse.' : 'Ce n\'est pas la bonne option.',
                        expectedText: expectedLabel
                    };
                }

                const expectedValues = (config.answers || []).map(String);
                const expectedSet = new Set(expectedValues);
                const selectedSet = new Set(selectedValues);

                list.querySelectorAll('.quiz-option-item').forEach((item) => {
                    const input = item.querySelector('input');
                    if (!input) return;
                    const isExpected = expectedSet.has(input.value);
                    const isChecked = selectedSet.has(input.value);

                    if (isExpected && isChecked) item.classList.add('is-correct');
                    if (!isExpected && isChecked) item.classList.add('is-wrong');
                    if (isExpected && !isChecked) item.classList.add('is-missed');
                });

                if (!selectedValues.length) {
                    return {
                        ok: false,
                        score: 0,
                        max: 1,
                        message: 'Sélectionne au moins une option.',
                        expectedText: expectedValues.map((value) => optionLabelMap.get(value) || value).join(', ')
                    };
                }

                const ok = compareUnordered(selectedValues, expectedValues);
                return {
                    ok,
                    score: ok ? 1 : 0,
                    max: 1,
                    message: ok ? 'Bon choix multiple.' : 'Revois les options cochées.',
                    expectedText: expectedValues.map((value) => optionLabelMap.get(value) || value).join(', ')
                };
            };

            resetHandler = () => {
                list.querySelectorAll('input').forEach((input) => {
                    input.checked = false;
                });
                clearOptionStates(list);
            };
        }

        if (type === 'text') {
            const input = createEl('input', 'quiz-text-input');
            input.type = 'text';
            input.placeholder = config.placeholder || 'Écris ta réponse ici';
            view.appendChild(input);

            validateHandler = () => {
                const actual = input.value.trim();
                const accepted = toAcceptedAnswers(config);
                const normalizedAccepted = accepted.map((value) => normalize(value, config.caseSensitive));

                input.classList.remove('is-correct', 'is-wrong');

                if (!actual) {
                    input.classList.add('is-wrong');
                    return {
                        ok: false,
                        score: 0,
                        max: 1,
                        message: 'Saisis une réponse.',
                        expectedText: accepted.join(' | ')
                    };
                }

                const ok = normalizedAccepted.includes(normalize(actual, config.caseSensitive));
                input.classList.add(ok ? 'is-correct' : 'is-wrong');

                return {
                    ok,
                    score: ok ? 1 : 0,
                    max: 1,
                    message: ok ? 'Réponse correcte.' : 'Réponse incorrecte.',
                    expectedText: accepted.join(' | ')
                };
            };

            resetHandler = () => {
                input.value = '';
                input.classList.remove('is-correct', 'is-wrong');
            };
        }

        if (type === 'order') {
            const options = getOptionData(template);
            let orderedValues = options.map((option) => option.value);
            const optionLabelMap = new Map(options.map((option) => [option.value, option.label]));
            const list = createEl('ul', 'quiz-order-list');

            const renderOrder = () => {
                list.innerHTML = '';
                orderedValues.forEach((value, index) => {
                    const item = createEl('li', 'quiz-order-item');
                    item.dataset.value = value;

                    const badge = createEl('span', 'quiz-order-index', String(index + 1));
                    const text = createEl('span', null, optionLabelMap.get(value) || value);
                    const controls = createEl('div', 'quiz-order-controls');

                    const up = createEl('button', 'quiz-order-btn', '↑');
                    up.type = 'button';
                    up.disabled = index === 0;
                    up.addEventListener('click', () => {
                        if (index === 0) return;
                        const next = [...orderedValues];
                        [next[index - 1], next[index]] = [next[index], next[index - 1]];
                        orderedValues = next;
                        renderOrder();
                    });

                    const down = createEl('button', 'quiz-order-btn', '↓');
                    down.type = 'button';
                    down.disabled = index === orderedValues.length - 1;
                    down.addEventListener('click', () => {
                        if (index === orderedValues.length - 1) return;
                        const next = [...orderedValues];
                        [next[index], next[index + 1]] = [next[index + 1], next[index]];
                        orderedValues = next;
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

            validateHandler = () => {
                const expected = (config.order || []).map(String);
                clearOrderStates(list);

                if (!expected.length || expected.length !== orderedValues.length) {
                    return {
                        ok: false,
                        score: 0,
                        max: 1,
                        message: 'Quiz mal configuré (ordre attendu manquant).',
                        expectedText: ''
                    };
                }

                let ok = true;
                Array.from(list.children).forEach((item, index) => {
                    const value = item.dataset.value || '';
                    if (value === expected[index]) {
                        item.classList.add('is-correct');
                    } else {
                        item.classList.add('is-wrong');
                        ok = false;
                    }
                });

                const expectedText = expected.map((value) => optionLabelMap.get(value) || value).join(' -> ');

                return {
                    ok,
                    score: ok ? 1 : 0,
                    max: 1,
                    message: ok ? 'Ordre correct.' : 'L\'ordre n\'est pas correct.',
                    expectedText
                };
            };

            resetHandler = () => {
                orderedValues = options.map((option) => option.value);
                renderOrder();
            };
        }

        validateBtn.addEventListener('click', () => {
            const result = validateHandler();

            scoreTag.textContent = `Score : ${result.score}/${result.max}`;

            feedback.style.display = 'block';
            feedback.classList.remove('ok', 'ko');
            feedback.classList.add(result.ok ? 'ok' : 'ko');
            feedback.textContent = result.message;

            const correctionParts = [];
            if (result.expectedText) {
                correctionParts.push(`Bonnes réponses : ${result.expectedText}`);
            }
            if (solutionText) {
                correctionParts.push(`Pourquoi : ${solutionText}`);
            }

            if (correctionParts.length) {
                correction.style.display = 'block';
                correction.textContent = correctionParts.join('\n');
            } else {
                correction.style.display = 'none';
                correction.textContent = '';
            }
        });

        resetBtn.addEventListener('click', () => {
            resetHandler();
            scoreTag.textContent = 'Score : 0/1';
            feedback.style.display = 'none';
            feedback.textContent = '';
            feedback.classList.remove('ok', 'ko');
            correction.style.display = 'none';
            correction.textContent = '';
        });

        view.appendChild(actions);
        view.appendChild(feedback);
        view.appendChild(correction);

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

        header.appendChild(titleEl);

        const body = createEl('div', 'quiz-body');
        const questionView = buildQuestionView(template, type, config);
        body.appendChild(questionView);

        widget.appendChild(header);
        widget.appendChild(body);

        template.innerHTML = '';
        template.appendChild(widget);
    };

    document.querySelectorAll(QUIZ_SELECTOR).forEach((node, index) => {
        initQuiz(node, index);
    });
})();
