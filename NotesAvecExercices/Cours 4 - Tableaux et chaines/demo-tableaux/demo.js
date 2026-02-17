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

// Init
applyTheme('objects');

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

    door.onclick = () => { if (!isAnimating) door.classList.toggle('open'); };

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

// --- CART HELPER ---
async function prepareCart() {
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
    cartContainer.style.transform = "translate(-50%, 40px)";
    cartItems.innerHTML = '';
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

    flyer.style.width = (sourceLockerRect.width - (inset * 2)) + 'px';
    flyer.style.height = (sourceLockerRect.height - (inset * 2)) + 'px';
    flyer.style.left = (sourceLockerRect.left + inset) + 'px';
    flyer.style.top = (sourceLockerRect.top + inset) + 'px';

    document.body.appendChild(flyer);
    void flyer.offsetWidth;

    flyer.style.left = (targetLockerRect.left + inset) + 'px';
    flyer.style.top = (targetLockerRect.top + inset) + 'px';

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

    log(`${getVarName()}.pop(); // 1. Préparation retour`);

    await prepareCart();

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

    log(`${getVarName()}.pop(); // 2. Suppression mémoire`, formatVal(removedVal));
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
    log(`${getVarName()}.shift(); // 1. Préparation`);

    await prepareCart();
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

    log(`${getVarName()}.shift(); // 2. Décalage (i -> i-1)`);

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
    log(`${getVarName()}.shift(); // 3. Terminé`, formatVal(removedVal));
    document.querySelectorAll('.locker-door').forEach(d => d.classList.remove('open'));

    isAnimating = false; toggleControls(true);
}

// 7. SPLICE (Mutation)
async function spliceItems() {
    if (isAnimating) return;

    let startInput = parseInt(document.getElementById('splice-start').value);
    let countInput = document.getElementById('splice-count').value;

    // Calculer l'index de départ (gestion des négatifs)
    let start = startInput < 0 ? lockers.length + startInput : startInput;
    if (start < 0) start = 0;
    if (start > lockers.length) start = lockers.length;

    // Calculer le nombre (gestion du champ vide)
    let count;
    if (countInput === "") {
        count = lockers.length - start;
    } else {
        count = parseInt(countInput);
        if (count < 0) count = 0;
    }

    document.querySelectorAll('.locker-door').forEach(d => d.classList.remove('open'));

    isAnimating = true; toggleControls(false);
    const actualCount = Math.min(count, lockers.length - start);
    const endIndex = start + actualCount;

    // Log précis pour montrer ce que l'utilisateur a vraiment demandé
    let logCmd = `let extrait = ${getVarName()}.splice(${startInput}`;
    if (countInput !== "") logCmd += `, ${countInput}`;
    logCmd += `);`;
    log(logCmd);

    // 1. Ouvrir portes
    document.querySelectorAll('.locker-door').forEach(d => d.classList.add('open'));
    await wait(600);

    // 2. Chariot arrive
    if (actualCount > 0) await prepareCart();

    // 3. Vol vers Chariot
    const removedItems = lockers.slice(start, endIndex);
    const cartFlights = [];

    for (let i = 0; i < removedItems.length; i++) {
        const originalIndex = start + i;
        const itemChar = removedItems[i];

        const targetPlaceholder = document.createElement('div');
        targetPlaceholder.className = 'cart-slot';
        targetPlaceholder.id = `cart-target-${i}`;
        cartItems.appendChild(targetPlaceholder);

        // Vider
        const el = document.getElementById(`locker-${originalIndex}`).querySelector('.locker-content');
        el.innerText = '';
        const win = document.getElementById(`door-${originalIndex}`).querySelector('.window-glass div');
        if (win) win.innerText = '';

        // Vol
        cartFlights.push(
            flyItem(itemChar, `locker-${originalIndex}`, `cart-target-${i}`).then(() => {
                targetPlaceholder.className = 'cart-item';
                targetPlaceholder.innerText = itemChar;
            })
        );
    }
    await Promise.all(cartFlights);
    if (actualCount > 0) await wait(200);

    // 4. Shift des éléments restants
    if (endIndex < lockers.length) {
        log(`// Décalage pour combler le vide...`);

        for (let i = endIndex; i < lockers.length; i++) {
            const el = document.getElementById(`locker-${i}`).querySelector('.locker-content');
            el.innerText = '';
            const win = document.getElementById(`door-${i}`).querySelector('.window-glass div');
            if (win) win.innerText = '';
        }

        const shiftFlights = [];
        for (let i = endIndex; i < lockers.length; i++) {
            const targetIdx = i - actualCount;
            shiftFlights.push(flyItem(lockers[i], `locker-${i}`, `locker-${targetIdx}`));
        }
        await Promise.all(shiftFlights);
    }

    // 5. Update Logique
    const removed = lockers.splice(start, actualCount);
    renderLockers();

    // Réouvrir portes
    const doors = document.querySelectorAll('.locker-door');
    doors.forEach(d => { d.style.transition = 'none'; d.classList.add('open'); });
    await wait(50);
    doors.forEach(d => d.style.transition = '');

    // 6. Fin
    if (actualCount > 0) dismissCart();
    await wait(500);
    document.querySelectorAll('.locker-door').forEach(d => d.classList.remove('open'));

    // Afficher le retour dans le log
    log(logCmd, `[${removed.map(formatVal).join(', ')}]`);

    isAnimating = false; toggleControls(true);
}

function shakeForm(id) {
    const el = document.getElementById(id);
    el.classList.add('demo-shake');
    setTimeout(() => el.classList.remove('demo-shake'), 500);
}
