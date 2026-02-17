// --- DONNÉES ---
const THEMES = {
    objects: {
        varName: 'inventaire',
        data: ['🍎', '🍌', '🍇', '🍉', '🥥'],
        options: ['🍕', '⚽', '🎸', '💎', '🌵', '🧸', '📦', '🍔', '🎁', '🍦']
    },
    scores: {
        varName: 'scores',
        data: [12, 15, 8, 19, 14],
        options: [0, 5, 8, 10, 12, 14, 15, 16, 18, 20]
    },
    names: {
        varName: 'etudiants',
        data: ['Alice', 'Bob', 'Charlie', 'David'],
        options: ['Emma', 'Fabien', 'Gaston', 'Hélène', 'Inès', 'Jules', 'Karim', 'Lea']
    },
    booleans: {
        varName: 'etatsActivationPortes',
        data: [true, false, true, false],
        options: [true, false]
    }
};

let currentThemeKey = 'objects';
let lockers = [...THEMES['objects'].data];
let activeZoomIndex = null;
let isAnimating = false;

const container = document.getElementById('array-container');
const lengthDisplay = document.getElementById('length-display');
const codeLog = document.getElementById('code-log');
const returnLog = document.getElementById('return-log');
const zoomOverlay = document.getElementById('zoom-overlay');
const zoomContent = document.getElementById('zoom-content');
const zoomIndexSpan = document.getElementById('zoom-index');
const cartArea = document.getElementById('cart-area');
const cartContainer = document.getElementById('cart-container');
const cartItems = document.getElementById('cart-items');
const cartTitle = document.querySelector('.demo-cart-title');
const resetButton = document.getElementById('demo-reset');
const presetsBox = document.getElementById('demo-presets');
const presetButtons = document.querySelectorAll('[data-preset]');
const consoleBox = document.querySelector('.demo-console');
const demoStage = document.querySelector('.demo-stage');
const panelNames = new Set(['read-write', 'add', 'remove', 'slice', 'length']);
const demoControls = document.querySelector('.demo-controls');
const defaultCartTitle = cartTitle ? cartTitle.innerText : 'Éléments Retirés';

// Init
const demoConfig = getDemoConfig();
applyDemoConfig(demoConfig);
applyTheme(demoConfig.initialTheme);

function getDemoConfig() {
    const params = new URLSearchParams(window.location.search);
    const themeParam = params.get('theme');
    const panelsParam = params.get('panels');

    const parsedPanels = panelsParam
        ? panelsParam
            .split(',')
            .map(panel => panel.trim())
            .filter(panel => panelNames.has(panel))
        : [];

    return {
        embed: params.get('embed') === '1',
        lockTheme: params.get('lockTheme') === '1',
        hideTheme: params.get('hideTheme') === '1',
        hideControls: params.get('controls') === '0',
        hideConsole: params.get('console') === '0',
        showPresets: params.get('presets') === '1',
        hideReset: params.get('reset') === '0',
        initialTheme: themeParam && THEMES[themeParam] ? themeParam : 'objects',
        panels: parsedPanels
    };
}

function applyDemoConfig(config) {
    if (config.embed) {
        document.body.classList.add('demo-embed-mode');
    }

    const themeSelector = document.getElementById('theme-selector');
    const themeBox = document.getElementById('demo-theme-box');
    if (themeSelector) {
        themeSelector.value = config.initialTheme;
        themeSelector.disabled = config.lockTheme;
    }
    if (themeBox && (config.hideTheme || config.lockTheme)) {
        themeBox.classList.add('demo-hidden');
    }

    if (config.panels.length > 0) {
        document.querySelectorAll('.demo-panel').forEach(panel => {
            const name = panel.getAttribute('data-panel');
            panel.classList.toggle('demo-hidden-panel', !config.panels.includes(name));
        });

        if (demoControls && config.panels.length === 1) {
            demoControls.classList.add('demo-controls-single');
        }
    }

    if (demoControls && config.hideControls) {
        demoControls.classList.add('demo-hidden');
    }
    if (consoleBox && config.hideConsole) {
        consoleBox.classList.add('demo-hidden');
    }
    if (presetsBox) {
        presetsBox.classList.toggle('demo-hidden', !config.showPresets);
    }
    if (resetButton && config.hideReset) {
        resetButton.classList.add('demo-hidden');
    }
}

function changeTheme() {
    if (isAnimating) return;
    const selector = document.getElementById('theme-selector');
    applyTheme(selector.value);
}

function applyTheme(key) {
    currentThemeKey = key;
    const theme = THEMES[key];
    lockers = [...theme.data];

    document.querySelectorAll('.var-name').forEach(el => el.innerText = theme.varName);
    document.getElementById('container-label').innerText = theme.varName;

    const dropdowns = document.querySelectorAll('.data-dropdown');
    dropdowns.forEach(select => {
        select.innerHTML = '';
        theme.options.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt;
            option.innerText = opt;
            select.appendChild(option);
        });
    });

    const useTextInput = key === 'scores';
    toggleValueInput('write-value', 'write-value-text', useTextInput, theme);
    toggleValueInput('push-value', 'push-value-text', useTextInput, theme);
    toggleValueInput('unshift-value', 'unshift-value-text', useTextInput, theme);
    codeLog.innerText = `// Thème changé : ${theme.varName}`;
    codeLog.classList.remove('demo-log-flash');
    returnLog.innerText = '';
    renderLockers();
    updateResetLabel();
}

function toggleValueInput(selectId, inputId, useTextInput, theme) {
    const select = document.getElementById(selectId);
    const input = document.getElementById(inputId);
    if (!select || !input) return;
    select.classList.toggle('demo-hidden', useTextInput);
    input.classList.toggle('demo-hidden', !useTextInput);
    if (useTextInput) {
        input.value = theme.data[0] ?? 0;
    }
}

function getVarName() { return THEMES[currentThemeKey].varName; }
function formatVal(val) { return typeof val === 'string' ? `"${val}"` : val; }
function getTypedValue(raw) {
    if (currentThemeKey === 'scores') {
        const num = Number(raw);
        return Number.isNaN(num) ? 0 : num;
    }
    if (currentThemeKey === 'booleans') return (raw === 'true');
    return raw;
}

function getValueForAction(selectId, inputId) {
    if (currentThemeKey === 'scores') {
        const input = document.getElementById(inputId);
        return input ? input.value : '';
    }
    const select = document.getElementById(selectId);
    return select ? select.value : '';
}

function getRemovalVarName(isMultiple = false) {
    const names = {
        objects: { single: 'itemRetire', multiple: 'itemsRetires' },
        scores: { single: 'scoreRetire', multiple: 'scoresRetires' },
        names: { single: 'nomRetire', multiple: 'nomsRetires' },
        booleans: { single: 'etatRetire', multiple: 'etatsRetires' }
    };
    const set = names[currentThemeKey] || { single: 'elementRetire', multiple: 'elementsRetires' };
    return isMultiple ? set.multiple : set.single;
}

function getSliceVarName() {
    const names = {
        objects: 'extrait',
        scores: 'extrait',
        names: 'extrait',
        booleans: 'extrait'
    };
    return names[currentThemeKey] || 'extrait';
}

function setCartLabel(label) {
    if (!cartTitle) return;
    cartTitle.innerText = label || defaultCartTitle;
}

function resetCartLabel() {
    if (!cartTitle) return;
    cartTitle.innerText = defaultCartTitle;
}

function updateResetLabel() {
    if (!resetButton) return;
    const baseCount = THEMES[currentThemeKey]?.data?.length ?? 0;
    resetButton.innerText = `Réinitialiser (${baseCount})`;
}

function resetDemo() {
    closeZoom();
    closeAllDoors();
    resetCartLabel();
    const theme = THEMES[currentThemeKey];
    lockers = [...theme.data];
    renderLockers();
    lengthDisplay.innerText = lockers.length;
    codeLog.innerText = `// Réinitialisé (${theme.varName})`;
    returnLog.innerText = '';
}

function applyPreset(preset) {
    closeZoom();
    closeAllDoors();
    resetCartLabel();
    const theme = THEMES[currentThemeKey];
    if (preset === 'empty') {
        lockers = [];
        codeLog.innerText = `let ${theme.varName} = [];`;
    } else if (preset === 'filled') {
        if (currentThemeKey === 'scores') {
            lockers = [15, 10, 25, 30];
            codeLog.innerText = `let ${theme.varName} = [15, 10, 25, 30];`;
        } else {
            lockers = [...theme.data];
            codeLog.innerText = `let ${theme.varName} = [${theme.data.map(formatVal).join(', ')}];`;
        }
    }
    returnLog.innerText = '';
    renderLockers();
}

if (resetButton) {
    resetButton.addEventListener('click', () => resetDemo());
}
if (presetButtons.length > 0) {
    presetButtons.forEach(button => {
        button.addEventListener('click', () => applyPreset(button.dataset.preset));
    });
}

function closeAllDoors(exceptIndex = null) {
    document.querySelectorAll('.locker-door.open').forEach(door => {
        const doorIndex = Number(door.id.replace('door-', ''));
        if (exceptIndex === null || doorIndex !== exceptIndex) {
            door.classList.remove('open');
        }
    });
}

function toggleDoor(index) {
    const door = document.getElementById(`door-${index}`);
    if (!door) return;

    const shouldOpen = !door.classList.contains('open');
    if (shouldOpen) {
        closeAllDoors(index);
    }
    door.classList.toggle('open');
}

// --- DOM ---
function createLockerNode(item, index, isEmpty = false) {
    const lockerDiv = document.createElement('div');
    lockerDiv.className = 'locker';
    lockerDiv.id = `locker-${index}`;

    const innerContent = document.createElement('div');
    innerContent.className = 'locker-content';
    innerContent.innerText = isEmpty ? '' : item;

    const door = document.createElement('div');
    door.className = 'locker-door';
    door.id = `door-${index}`;

    const handle = document.createElement('div');
    handle.className = 'locker-handle';

    const indexNum = document.createElement('span');
    indexNum.className = 'locker-index';
    indexNum.innerText = index;

    const windowDiv = document.createElement('div');
    windowDiv.className = 'window-glass';

    const windowContent = document.createElement('div');
    windowContent.innerText = isEmpty ? '' : item;
    windowContent.className = 'locker-window-text';
    if (!isEmpty && String(item).length > 3) windowContent.classList.add('locker-window-text--small');

    windowDiv.appendChild(windowContent);
    door.appendChild(indexNum);
    door.appendChild(windowDiv);
    door.appendChild(handle);

    door.addEventListener('click', (event) => {
        event.stopPropagation();
        if (isAnimating) return;
        toggleDoor(index);
    });
    lockerDiv.addEventListener('click', (event) => {
        if (isAnimating) return;
        if (event.target.closest('.locker-door')) return;
        if (door.classList.contains('open')) {
            door.classList.remove('open');
        }
    });

    lockerDiv.appendChild(innerContent);
    lockerDiv.appendChild(door);

    return lockerDiv;
}

function renderLockers() {
    container.innerHTML = '';
    lockers.forEach((item, index) => {
        const isEmpty = item === null || typeof item === 'undefined';
        const node = createLockerNode(isEmpty ? '' : item, index, isEmpty);
        container.appendChild(node);
    });
    lengthDisplay.innerText = lockers.length;
}

if (demoStage) {
    demoStage.addEventListener('click', (event) => {
        if (isAnimating) return;
        if (event.target.closest('#array-container')) return;
        closeAllDoors();
    });
}

const wait = (ms) => new Promise(r => setTimeout(r, ms));

function log(cmd, result) {
    codeLog.innerText = cmd;
    codeLog.classList.remove('demo-log-flash');
    void codeLog.offsetWidth;
    codeLog.classList.add('demo-log-flash');
    if (result !== undefined) {
        returnLog.innerText = `// Retourne: ${result}`;
    } else {
        returnLog.innerText = '';
    }
}

function toggleControls(enable) {
    const btns = document.querySelectorAll('button');
    btns.forEach(b => b.disabled = !enable);
    if (enable) container.classList.remove('demo-grayscale');
    else container.classList.add('demo-grayscale');
}

function lengthAdd() {
    if (isAnimating) return;
    pushItem();
}

function lengthRemove() {
    if (isAnimating) return;
    popItem();
}

// --- CART HELPER ---
async function prepareCart(label = null) {
    setCartLabel(label || defaultCartTitle);
    cartArea.classList.remove('demo-hidden');
    cartItems.innerHTML = '';
    cartContainer.style.transition = 'transform 0.5s ease-out';
    cartContainer.style.transform = "translate(-50%, 0)";
    await wait(600);
}

async function dismissCart() {
    await wait(500);
    cartContainer.style.transition = 'transform 0.8s ease-in';
    cartContainer.style.transform = "translate(200%, 0)";
    await wait(800);
    cartArea.classList.add('demo-hidden');
    cartContainer.style.transition = 'none';
    cartContainer.style.transform = "translate(-50%, 0)";
    cartItems.innerHTML = '';
    resetCartLabel();
}

// --- MOTEUR PHYSIQUE (FLY) ---
async function flyItem(content, sourceId, targetId) {
    const sourceNode = document.getElementById(sourceId);
    const targetNode = document.getElementById(targetId);

    if (!sourceNode || !targetNode) return;

    const sourceLockerRect = sourceNode.getBoundingClientRect();
    const targetLockerRect = targetNode.getBoundingClientRect();
    const inset = 4;

    const displayValue = content === null ? '' : content;
    const flyer = document.createElement('div');
    flyer.className = 'flying-item';
    flyer.innerText = displayValue;
    if (String(displayValue).length > 3) flyer.style.fontSize = "12px";

    const sourceWidth = sourceLockerRect.width - (inset * 2);
    const sourceHeight = sourceLockerRect.height - (inset * 2);
    flyer.style.width = sourceWidth + 'px';
    flyer.style.height = sourceHeight + 'px';
    flyer.style.left = (sourceLockerRect.left + inset) + 'px';
    flyer.style.top = (sourceLockerRect.top + inset) + 'px';

    document.body.appendChild(flyer);
    void flyer.offsetWidth;

    let targetWidth = targetLockerRect.width - (inset * 2);
    let targetHeight = targetLockerRect.height - (inset * 2);
    let targetLeft = targetLockerRect.left + inset;
    let targetTop = targetLockerRect.top + inset;
    const shouldShrink = targetNode.classList.contains('cart-slot')
        || targetNode.classList.contains('cart-item')
        || targetId.startsWith('cart-target-');

    if (shouldShrink) {
        targetWidth = targetLockerRect.width;
        targetHeight = targetLockerRect.height;
        targetLeft = targetLockerRect.left;
        targetTop = targetLockerRect.top;
    }

    flyer.style.left = targetLeft + 'px';
    flyer.style.top = targetTop + 'px';
    if (shouldShrink) {
        flyer.style.width = targetWidth + 'px';
        flyer.style.height = targetHeight + 'px';
        flyer.style.fontSize = '0.7rem';
    }
    if (!shouldShrink) {
        flyer.style.width = targetWidth + 'px';
        flyer.style.height = targetHeight + 'px';
    }

    return new Promise(resolve => {
        setTimeout(() => {
            flyer.remove();
            resolve();
        }, 800);
    });
}

// --- ACTIONS ---

// 1. LIRE
async function accessItem() {
    if (isAnimating) return;
    const index = parseInt(document.getElementById('read-index').value);

    if (index >= 0 && index < lockers.length) {
        log(`${getVarName()}[${index}];`);
        activeZoomIndex = index;
        const door = document.getElementById(`door-${index}`);
        door.classList.add('open');
        await wait(400);
        zoomIndexSpan.innerText = index;
        const displayValue = lockers[index] === null ? 'Vide' : lockers[index];
        zoomContent.innerText = displayValue;
        zoomOverlay.classList.remove('demo-hidden');
    } else {
        log(`${getVarName()}[${index}];`, "undefined");
        shakeForm('read-index');
    }
}

function closeZoom() {
    zoomOverlay.classList.add('demo-hidden');
    if (activeZoomIndex !== null) {
        const door = document.getElementById(`door-${activeZoomIndex}`);
        if (door) door.classList.remove('open');
        activeZoomIndex = null;
    }
}

// 2. ÉCRIRE
async function writeItem() {
    if (isAnimating) return;
    isAnimating = true; toggleControls(false);

    const index = parseInt(document.getElementById('write-index').value);
    let value = getTypedValue(getValueForAction('write-value', 'write-value-text'));

    if (index >= 0) {
        if (index >= lockers.length) {
            for (let i = lockers.length; i <= index; i++) {
                lockers.push(null);
            }
            renderLockers();
        }

        log(`${getVarName()}[${index}] = ${formatVal(value)};`, formatVal(value));

        const door = document.getElementById(`door-${index}`);
        const locker = document.getElementById(`locker-${index}`);
        const contentDiv = locker.querySelector('.locker-content');
        const windowContent = door.querySelector('.window-glass div');

        door.classList.add('open');
        await wait(500);

        contentDiv.style.transform = "scale(0)";
        await wait(200);

        lockers[index] = value;
        contentDiv.innerText = value;
        windowContent.innerText = value;
        if (String(value).length > 3) windowContent.classList.add('locker-window-text--small');
        else windowContent.classList.remove('locker-window-text--small');

        contentDiv.style.transform = "scale(1)";
        await wait(500);

        door.classList.remove('open');
    } else {
        log(`${getVarName()}[${index}] = ${formatVal(value)};`, "Error: Index invalide");
        shakeForm('write-index');
    }
    isAnimating = false; toggleControls(true);
}

// 3. PUSH
async function pushItem() {
    if (isAnimating) return;
    isAnimating = true; toggleControls(false);

    let val = getTypedValue(getValueForAction('push-value', 'push-value-text'));

    const newIndex = lockers.length;
    const emptyNode = createLockerNode('', newIndex, true);
    emptyNode.classList.add('locker-appear');

    container.appendChild(emptyNode);
    lengthDisplay.innerText = newIndex + 1;

    log(`${getVarName()}.push(${formatVal(val)}); // 1. Allocation mémoire...`);
    await wait(1200);

    log(`${getVarName()}.push(${formatVal(val)}); // 2. Assignation`, newIndex + 1);

    const door = document.getElementById(`door-${newIndex}`);
    const contentDiv = emptyNode.querySelector('.locker-content');
    const windowContent = door.querySelector('.window-glass div');

    door.classList.add('open');
    await wait(400);

    contentDiv.style.transform = "scale(0)";
    contentDiv.innerText = val;
    windowContent.innerText = val;
    if (String(val).length > 3) windowContent.classList.add('locker-window-text--small');

    contentDiv.style.transform = "scale(1)";
    await wait(400);

    door.classList.remove('open');
    lockers.push(val);

    isAnimating = false; toggleControls(true);
}

// 4. POP (Avec Chariot)
async function popItem() {
    if (isAnimating || lockers.length === 0) return;
    isAnimating = true; toggleControls(false);

    const lastIdx = lockers.length - 1;
    const removedVal = lockers[lastIdx];
    const removedVar = getRemovalVarName(false);
    const logCmd = `let ${removedVar} = ${getVarName()}.pop();`;

    log(logCmd);

    await prepareCart(removedVar);

    const targetPlaceholder = document.createElement('div');
    targetPlaceholder.className = 'cart-slot';
    targetPlaceholder.id = 'cart-target-pop';
    cartItems.appendChild(targetPlaceholder);

    const door = document.getElementById(`door-${lastIdx}`);
    door.classList.add('open');
    await wait(400);

    const contentDiv = document.getElementById(`locker-${lastIdx}`).querySelector('.locker-content');
    contentDiv.innerText = '';
    const winDiv = door.querySelector('.window-glass div');
    if (winDiv) winDiv.innerText = '';

    await flyItem(removedVal, `locker-${lastIdx}`, 'cart-target-pop');

    targetPlaceholder.className = 'cart-item';
    targetPlaceholder.innerText = removedVal;

    door.classList.remove('open');
    await wait(400);

    log(logCmd, formatVal(removedVal));
    const lastNode = document.getElementById(`locker-${lastIdx}`);
    lastNode.classList.add('locker-disappear');

    dismissCart();
    await wait(800);

    lastNode.remove();
    lockers.pop();
    lengthDisplay.innerText = lockers.length;

    isAnimating = false; toggleControls(true);
}

// 5. UNSHIFT (Physique)
async function unshiftItem() {
    if (isAnimating) return;
    isAnimating = true; toggleControls(false);

    let val = getTypedValue(getValueForAction('unshift-value', 'unshift-value-text'));

    log(`${getVarName()}.unshift(${formatVal(val)}); // 1. Allocation Fin`);

    const lastIdx = lockers.length;
    const emptyNode = createLockerNode('', lastIdx, true);
    emptyNode.classList.add('locker-appear');
    container.appendChild(emptyNode);
    lengthDisplay.innerText = lockers.length + 1;
    await wait(1500);

    log(`${getVarName()}.unshift(${formatVal(val)}); // 2. Décalage des données (i -> i+1)`);
    document.querySelectorAll('.locker-door').forEach(d => d.classList.add('open'));
    await wait(600);

    for (let i = 0; i < lockers.length; i++) {
        const el = document.getElementById(`locker-${i}`).querySelector('.locker-content');
        el.innerText = '';
        const win = document.getElementById(`door-${i}`).querySelector('.window-glass div');
        if (win) win.innerText = '';
    }

    const flights = [];
    for (let i = lockers.length - 1; i >= 0; i--) {
        flights.push(flyItem(lockers[i], `locker-${i}`, `locker-${i + 1}`));
    }
    await Promise.all(flights);

    lockers.unshift(val);
    renderLockers();

    const doors = document.querySelectorAll('.locker-door');
    doors.forEach(d => { d.style.transition = 'none'; d.classList.add('open'); });
    await wait(50);
    doors.forEach(d => d.style.transition = '');

    const firstContent = document.getElementById('locker-0').querySelector('.locker-content');
    firstContent.style.transform = 'scale(0)';
    firstContent.innerText = val;

    log(`${getVarName()}.unshift(${formatVal(val)}); // 3. Insertion index 0`, lockers.length);
    await wait(200);
    firstContent.style.transform = 'scale(1)';
    await wait(500);

    document.querySelectorAll('.locker-door').forEach(d => d.classList.remove('open'));

    isAnimating = false; toggleControls(true);
}

// 6. SHIFT (Avec Chariot)
async function shiftItem() {
    if (isAnimating || lockers.length === 0) return;
    isAnimating = true; toggleControls(false);

    const removedVal = lockers[0];
    const removedVar = getRemovalVarName(false);
    const logCmd = `let ${removedVar} = ${getVarName()}.shift();`;
    log(logCmd);

    await prepareCart(removedVar);
    const targetPlaceholder = document.createElement('div');
    targetPlaceholder.className = 'cart-slot';
    targetPlaceholder.id = 'cart-target-shift';
    cartItems.appendChild(targetPlaceholder);

    document.querySelectorAll('.locker-door').forEach(d => d.classList.add('open'));
    await wait(600);

    const firstContent = document.getElementById('locker-0').querySelector('.locker-content');
    firstContent.innerText = '';
    const firstWin = document.getElementById('door-0').querySelector('.window-glass div');
    if (firstWin) firstWin.innerText = '';

    await flyItem(removedVal, `locker-0`, 'cart-target-shift');

    targetPlaceholder.className = 'cart-item';
    targetPlaceholder.innerText = removedVal;

    // Décalage

    for (let i = 1; i < lockers.length; i++) {
        const el = document.getElementById(`locker-${i}`).querySelector('.locker-content');
        el.innerText = '';
        const win = document.getElementById(`door-${i}`).querySelector('.window-glass div');
        if (win) win.innerText = '';
    }

    const flights = [];
    for (let i = 1; i < lockers.length; i++) {
        flights.push(flyItem(lockers[i], `locker-${i}`, `locker-${i - 1}`));
    }
    await Promise.all(flights);

    lockers.shift();
    renderLockers();

    const doors = document.querySelectorAll('.locker-door');
    doors.forEach(d => { d.style.transition = 'none'; d.classList.add('open'); });
    await wait(50);
    doors.forEach(d => d.style.transition = '');

    dismissCart();
    await wait(500);
    log(logCmd, formatVal(removedVal));
    document.querySelectorAll('.locker-door').forEach(d => d.classList.remove('open'));

    isAnimating = false; toggleControls(true);
}

// 7. SLICE (Copie)
async function sliceItems() {
    if (isAnimating) return;

    const startRaw = document.getElementById('slice-start').value;
    const endRaw = document.getElementById('slice-end').value;
    const startInput = startRaw === "" ? 0 : parseInt(startRaw);
    const endInput = endRaw === "" ? null : parseInt(endRaw);

    let start = Number.isNaN(startInput) ? 0 : startInput;
    let end = endInput === null || Number.isNaN(endInput) ? lockers.length : endInput;

    if (start < 0) start = lockers.length + start;
    if (end < 0) end = lockers.length + end;

    if (start < 0) start = 0;
    if (start > lockers.length) start = lockers.length;
    if (end < start) end = start;
    if (end > lockers.length) end = lockers.length;

    document.querySelectorAll('.locker-door').forEach(d => d.classList.remove('open'));

    isAnimating = true; toggleControls(false);

    const sliceVar = getSliceVarName();
    let logCmd = `let ${sliceVar} = ${getVarName()}.slice(${startRaw === "" ? 0 : startRaw}`;
    if (endRaw !== "") logCmd += `, ${endRaw}`;
    logCmd += `);`;
    log(logCmd);

    const extracted = lockers.slice(start, end);

    if (extracted.length > 0) {
        await prepareCart(sliceVar);
        const cartFlights = [];

        for (let i = 0; i < extracted.length; i++) {
            const sourceIndex = start + i;
            const itemChar = extracted[i];

            const targetPlaceholder = document.createElement('div');
            targetPlaceholder.className = 'cart-slot';
            targetPlaceholder.id = `cart-target-${i}`;
            cartItems.appendChild(targetPlaceholder);

            cartFlights.push(
                flyItem(itemChar, `locker-${sourceIndex}`, `cart-target-${i}`).then(() => {
                    targetPlaceholder.className = 'cart-item';
                    targetPlaceholder.innerText = itemChar;
                })
            );
        }

        await Promise.all(cartFlights);
        await wait(700);
        dismissCart();
    } else {
        resetCartLabel();
    }

    log(logCmd, `[${extracted.map(formatVal).join(', ')}]`);

    isAnimating = false; toggleControls(true);
}

function shakeForm(id) {
    const el = document.getElementById(id);
    el.classList.add('demo-shake');
    setTimeout(() => el.classList.remove('demo-shake'), 500);
}
