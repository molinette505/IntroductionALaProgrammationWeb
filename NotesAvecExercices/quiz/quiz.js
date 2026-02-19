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

    const shuffleArray = (list) => {
        const next = [...list];
        for (let i = next.length - 1; i > 0; i -= 1) {
            const j = Math.floor(Math.random() * (i + 1));
            [next[i], next[j]] = [next[j], next[i]];
        }
        return next;
    };

    const parseMatchPairs = (template, config) => {
        const fromPairsList = Array.from(template.querySelectorAll('.quiz-match-pairs li')).map((li, index) => {
            let left = (li.dataset.left || li.dataset.prompt || li.dataset.description || '').trim();
            let right = (li.dataset.right || li.dataset.answer || '').trim();

            if (!left || !right) {
                const raw = li.textContent.trim();
                const separator = raw.includes('::') ? '::' : (raw.includes('=>') ? '=>' : (raw.includes('->') ? '->' : ''));
                if (separator) {
                    const parts = raw.split(separator);
                    if (!left) left = (parts[0] || '').trim();
                    if (!right) right = parts.slice(1).join(separator).trim();
                } else {
                    // Common authoring format: data-left on <li>, answer as plain text content.
                    if (!right && raw) right = raw;
                    if (!left && raw) left = raw;
                }
            }

            if (!left || !right) return null;
            return {
                id: li.dataset.id || `pair-${index + 1}`,
                left,
                right
            };
        }).filter(Boolean);

        if (fromPairsList.length) return fromPairsList;

        const leftNodes = Array.from(template.querySelectorAll('.quiz-match-left li[data-id], .quiz-match-descriptions li[data-id]'));
        const rightNodes = Array.from(template.querySelectorAll('.quiz-match-right li[data-id], .quiz-match-answers li[data-id]'));

        if (leftNodes.length && rightNodes.length) {
            const rightMap = new Map(rightNodes.map((li) => [li.dataset.id, li.textContent.trim()]));
            const merged = leftNodes.map((li) => {
                const id = li.dataset.id;
                if (!id || !rightMap.has(id)) return null;
                return {
                    id,
                    left: li.textContent.trim(),
                    right: rightMap.get(id)
                };
            }).filter(Boolean);
            if (merged.length) return merged;
        }

        if (Array.isArray(config.pairs) && config.pairs.length) {
            return config.pairs.map((pair, index) => {
                if (!pair) return null;
                const left = String(pair.left || pair.prompt || pair.description || '').trim();
                const right = String(pair.right || pair.answer || '').trim();
                if (!left || !right) return null;
                return {
                    id: String(pair.id || `pair-${index + 1}`),
                    left,
                    right
                };
            }).filter(Boolean);
        }

        return [];
    };

    const buildQuestionView = (template, type, config) => {
        const view = createEl('div', 'quiz-view');

        const promptNode = template.querySelector('.quiz-prompt');
        const promptRender = createEl('div', 'quiz-prompt-render');
        if (promptNode) {
            promptRender.innerHTML = promptNode.innerHTML.trim();
        } else {
            promptRender.textContent = 'Question';
        }
        view.appendChild(promptRender);

        const feedback = createEl('div', 'quiz-feedback');
        feedback.style.display = 'none';

        const correction = createEl('div', 'quiz-correction');
        correction.style.display = 'none';

        const actions = createEl('div', 'quiz-actions');
        const validateBtn = createEl('button', 'quiz-btn quiz-btn-primary', 'Valider');
        validateBtn.type = 'button';
        const resetBtn = createEl('button', 'quiz-btn', 'Réinitialiser');
        resetBtn.type = 'button';
        const revealBtn = createEl('button', 'quiz-btn', 'Voir la réponse');
        revealBtn.type = 'button';
        revealBtn.style.display = 'none';
        const scoreTag = createEl('span', 'quiz-score', 'Score : 0/1');

        actions.appendChild(validateBtn);
        actions.appendChild(resetBtn);
        actions.appendChild(revealBtn);
        actions.appendChild(scoreTag);

        const solutionText = ((template.querySelector('.quiz-solution') || {}).value || '').trim();

        let resetHandler = () => {};
        let revealHandler = null;
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

        if (type === 'mixandmatch' || type === 'mix-and-match' || type === 'match') {
            const pairs = parseMatchPairs(template, config);
            const assignments = new Map();
            const pairById = new Map(pairs.map((pair) => [pair.id, pair]));

            const container = createEl('div', 'quiz-match-layout');
            const leftList = createEl('div', 'quiz-match-left-list');
            const bankPanel = createEl('div', 'quiz-match-bank-panel');
            const bankTitle = createEl('p', 'quiz-match-bank-title', 'Réponses à glisser');
            const bank = createEl('div', 'quiz-match-bank');
            bankPanel.appendChild(bankTitle);
            bankPanel.appendChild(bank);
            container.appendChild(leftList);
            container.appendChild(bankPanel);
            view.appendChild(container);

            let shuffledCards = shuffleArray(pairs.map((pair) => pair.id));
            let dragState = null;
            let rowById = new Map();
            let touchDragState = null;
            let touchDragGhost = null;
            let touchDropTarget = null;

            const clearMatchStates = () => {
                leftList.querySelectorAll('.quiz-match-row').forEach((row) => {
                    row.classList.remove('is-correct', 'is-wrong');
                });
            };

            const unassignCard = (cardId) => {
                Array.from(assignments.entries()).forEach(([slotId, assignedId]) => {
                    if (assignedId === cardId) assignments.delete(slotId);
                });
            };

            const setDropVisuals = (zone, enabled) => {
                if (!zone) return;
                zone.classList.toggle('is-drop-target', Boolean(enabled));
            };

            const clearAllDropVisuals = () => {
                container.querySelectorAll('.quiz-match-dropzone').forEach((zone) => setDropVisuals(zone, false));
                setDropVisuals(bank, false);
                touchDropTarget = null;
            };

            const applyDropTarget = (cardId, sourceSlotId, targetEl) => {
                if (!cardId || !pairById.has(cardId) || !(targetEl instanceof HTMLElement)) return false;

                if (targetEl.classList.contains('quiz-match-dropzone')) {
                    const targetSlotId = targetEl.dataset.slotId || '';
                    if (!targetSlotId) return false;
                    const targetExisting = assignments.get(targetSlotId) || null;

                    if (sourceSlotId) assignments.delete(sourceSlotId);

                    // Swap when dropping a slot card onto an occupied slot.
                    if (targetExisting && targetExisting !== cardId && sourceSlotId) {
                        assignments.set(sourceSlotId, targetExisting);
                    }

                    // If card came from bank and slot was occupied, old card returns to bank automatically.
                    unassignCard(cardId);
                    assignments.set(targetSlotId, cardId);
                    return true;
                }

                if (targetEl.classList.contains('quiz-match-bank')) {
                    if (!sourceSlotId) return false;
                    assignments.delete(sourceSlotId);
                    return true;
                }

                return false;
            };

            const createCard = (cardId, sourceSlotId) => {
                const pair = pairById.get(cardId);
                if (!pair) return null;
                const card = createEl('div', 'quiz-match-card', pair.right);
                card.draggable = true;
                card.dataset.cardId = cardId;
                card.dataset.sourceSlotId = sourceSlotId || '';
                card.addEventListener('dragstart', (event) => {
                    dragState = {
                        cardId,
                        sourceSlotId: sourceSlotId || ''
                    };
                    card.classList.add('is-dragging');
                    if (event.dataTransfer) {
                        event.dataTransfer.setData('text/plain', cardId);
                        event.dataTransfer.effectAllowed = 'move';
                    }
                });
                card.addEventListener('dragend', () => {
                    dragState = null;
                    card.classList.remove('is-dragging');
                    clearAllDropVisuals();
                });

                // Touch / pen drag support (mobile-friendly drag-and-drop).
                card.addEventListener('pointerdown', (event) => {
                    if (event.pointerType === 'mouse') return;
                    if (touchDragState) return;

                    const rect = card.getBoundingClientRect();
                    touchDragState = {
                        pointerId: event.pointerId,
                        cardId,
                        sourceSlotId: sourceSlotId || '',
                        offsetX: event.clientX - rect.left,
                        offsetY: event.clientY - rect.top,
                        moved: false
                    };

                    const ghost = card.cloneNode(true);
                    ghost.classList.add('is-touch-ghost');
                    ghost.style.width = `${rect.width}px`;
                    ghost.style.height = `${rect.height}px`;
                    ghost.style.left = `${event.clientX - touchDragState.offsetX}px`;
                    ghost.style.top = `${event.clientY - touchDragState.offsetY}px`;
                    document.body.appendChild(ghost);
                    touchDragGhost = ghost;

                    card.classList.add('is-dragging');
                    if (card.setPointerCapture) card.setPointerCapture(event.pointerId);
                    event.preventDefault();
                });

                card.addEventListener('pointermove', (event) => {
                    if (!touchDragState || touchDragState.pointerId !== event.pointerId || !touchDragGhost) return;

                    touchDragState.moved = true;
                    touchDragGhost.style.left = `${event.clientX - touchDragState.offsetX}px`;
                    touchDragGhost.style.top = `${event.clientY - touchDragState.offsetY}px`;

                    const element = document.elementFromPoint(event.clientX, event.clientY);
                    const nextTarget = element instanceof HTMLElement
                        ? element.closest('.quiz-match-dropzone, .quiz-match-bank')
                        : null;

                    if (touchDropTarget !== nextTarget) {
                        clearAllDropVisuals();
                        touchDropTarget = nextTarget;
                        if (touchDropTarget) setDropVisuals(touchDropTarget, true);
                    }

                    event.preventDefault();
                });

                const endTouchDrag = (event) => {
                    if (!touchDragState || touchDragState.pointerId !== event.pointerId) return;

                    let shouldRender = false;
                    if (touchDragState.moved && touchDropTarget) {
                        shouldRender = applyDropTarget(
                            touchDragState.cardId,
                            touchDragState.sourceSlotId,
                            touchDropTarget
                        );
                    }

                    card.classList.remove('is-dragging');
                    if (touchDragGhost) {
                        touchDragGhost.remove();
                        touchDragGhost = null;
                    }
                    touchDragState = null;
                    clearAllDropVisuals();

                    if (shouldRender) renderMatch();
                    event.preventDefault();
                };

                card.addEventListener('pointerup', endTouchDrag);
                card.addEventListener('pointercancel', endTouchDrag);
                card.addEventListener('lostpointercapture', endTouchDrag);
                return card;
            };

            const renderMatch = () => {
                leftList.innerHTML = '';
                bank.innerHTML = '';
                rowById = new Map();

                pairs.forEach((pair, index) => {
                    const row = createEl('div', 'quiz-match-row');
                    row.dataset.slotId = pair.id;
                    const indexEl = createEl('span', 'quiz-match-index', String(index + 1));
                    const prompt = createEl('p', 'quiz-match-prompt', pair.left);
                    const dropzone = createEl('div', 'quiz-match-dropzone');
                    dropzone.dataset.slotId = pair.id;

                    const assignedCardId = assignments.get(pair.id);
                    if (assignedCardId && pairById.has(assignedCardId)) {
                        const assignedCard = createCard(assignedCardId, pair.id);
                        if (assignedCard) dropzone.appendChild(assignedCard);
                    } else {
                        dropzone.appendChild(createEl('span', 'quiz-match-placeholder', 'Dépose ici'));
                    }

                    dropzone.addEventListener('dragover', (event) => {
                        event.preventDefault();
                        setDropVisuals(dropzone, true);
                    });
                    dropzone.addEventListener('dragleave', () => setDropVisuals(dropzone, false));
                    dropzone.addEventListener('drop', (event) => {
                        event.preventDefault();
                        setDropVisuals(dropzone, false);
                        if (!dragState || !pairById.has(dragState.cardId)) return;
                        if (applyDropTarget(dragState.cardId, dragState.sourceSlotId || '', dropzone)) {
                            renderMatch();
                        }
                    });

                    row.appendChild(indexEl);
                    row.appendChild(prompt);
                    row.appendChild(dropzone);
                    leftList.appendChild(row);
                    rowById.set(pair.id, row);
                });

                const assignedIds = new Set(assignments.values());
                shuffledCards.forEach((cardId) => {
                    if (assignedIds.has(cardId)) return;
                    const card = createCard(cardId, '');
                    if (card) bank.appendChild(card);
                });

            };

            bank.addEventListener('dragover', (event) => {
                event.preventDefault();
                setDropVisuals(bank, true);
            });
            bank.addEventListener('dragleave', () => setDropVisuals(bank, false));
            bank.addEventListener('drop', (event) => {
                event.preventDefault();
                setDropVisuals(bank, false);
                if (!dragState || !dragState.sourceSlotId) return;
                if (applyDropTarget(dragState.cardId, dragState.sourceSlotId || '', bank)) {
                    renderMatch();
                }
            });

            renderMatch();

            validateHandler = () => {
                clearMatchStates();

                if (!pairs.length) {
                    return {
                        ok: false,
                        score: 0,
                        max: 1,
                        message: 'Quiz mal configuré: aucune paire détectée.',
                        expectedText: ''
                    };
                }

                let allFilled = true;
                let allCorrect = true;

                pairs.forEach((pair) => {
                    const row = rowById.get(pair.id) || null;
                    const assigned = assignments.get(pair.id);
                    if (!assigned) {
                        allFilled = false;
                        allCorrect = false;
                    }
                    if (assigned === pair.id) {
                        if (row) row.classList.add('is-correct');
                    } else {
                        if (row) row.classList.add('is-wrong');
                        allCorrect = false;
                    }
                });

                const expectedText = pairs.map((pair) => `${pair.left} -> ${pair.right}`).join('\n');

                if (!allFilled) {
                    return {
                        ok: false,
                        score: 0,
                        max: 1,
                        message: 'Associe toutes les réponses avant de valider.',
                        expectedText
                    };
                }

                return {
                    ok: allCorrect,
                    score: allCorrect ? 1 : 0,
                    max: 1,
                    message: allCorrect ? 'Associations correctes.' : 'Certaines associations sont incorrectes.',
                    expectedText
                };
            };

            resetHandler = () => {
                assignments.clear();
                shuffledCards = shuffleArray(shuffledCards);
                clearMatchStates();
                renderMatch();
            };

            revealBtn.style.display = 'inline-flex';
            revealHandler = () => {
                assignments.clear();
                pairs.forEach((pair) => assignments.set(pair.id, pair.id));
                clearMatchStates();
                renderMatch();
            };
        }

        validateBtn.addEventListener('click', () => {
            const result = validateHandler();
            const wrongMessage = String(config.wrongMessage || '').trim();
            if (!result.ok && wrongMessage) result.message = wrongMessage;

            scoreTag.textContent = `Score : ${result.score}/${result.max}`;

            feedback.style.display = 'block';
            feedback.classList.remove('ok', 'ko');
            feedback.classList.add(result.ok ? 'ok' : 'ko');
            feedback.textContent = result.message;

            if (solutionText) {
                correction.style.display = 'block';
                correction.textContent = solutionText;
            } else {
                correction.style.display = 'none';
                correction.textContent = '';
            }
        });

        revealBtn.addEventListener('click', () => {
            if (!revealHandler) return;
            revealHandler();
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
