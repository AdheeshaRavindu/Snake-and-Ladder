const MAX_PLAYERS = 8;
const PLAYER_COLORS = ['#ff8a5b', '#7ad8ff', '#ffd36b', '#7ef0a3', '#c596ff', '#ff6fae', '#5ff0e6', '#f29b54'];
const DICE_ROLL_EFFECTS = ['roll-effect-flip', 'roll-effect-shake', 'roll-effect-slam', 'roll-effect-wobble'];
const PLACEHOLDER_PREFIX = 'PASTE_FIREBASE_';

const playerNameInput = document.getElementById('playerNameInput');
const roomCodeInput = document.getElementById('roomCodeInput');
const createRoomBtn = document.getElementById('createRoomBtn');
const joinRoomBtn = document.getElementById('joinRoomBtn');
const startGameBtn = document.getElementById('startGameBtn');
const leaveRoomBtn = document.getElementById('leaveRoomBtn');
const roomCodeLabel = document.getElementById('roomCodeLabel');
const playerStatusListEl = document.getElementById('playerStatusList');
const currentTurnLabelEl = document.getElementById('currentTurnLabel');
const winnerLabelEl = document.getElementById('winnerLabel');
const rollDiceBtn = document.getElementById('rollDiceBtn');
const diceCube = document.getElementById('diceCube');
const gameMessages = document.getElementById('gameMessages');
const voiceBtn = document.getElementById('toggleVoiceBtn');
const bgmBtn = document.getElementById('toggleBgmBtn');
const sfxBtn = document.getElementById('toggleSfxBtn');

const APP_STATE = {
    clientId: getOrCreateClientId(),
    db: null,
    roomCode: null,
    roomRef: null,
    roomData: null,
    displayedPlayers: [],
    latestAnimatedMoveSeq: 0,
    animating: false,
    announcedPlayers: {},
    voiceEnabled: true,
    hasStartedAnnouncement: false
};

const DICE_FACES = {
    1: ['center'],
    2: ['top-left', 'bottom-right'],
    3: ['top-left', 'center', 'bottom-right'],
    4: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
    5: ['top-left', 'top-right', 'center', 'bottom-left', 'bottom-right'],
    6: ['top-left', 'top-right', 'middle-left', 'middle-right', 'bottom-left', 'bottom-right']
};

function getOrCreateClientId() {
    const existing = localStorage.getItem('snake_ladder_client_id');
    if (existing) return existing;

    const clientId = `p_${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem('snake_ladder_client_id', clientId);
    return clientId;
}

function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function isFirebaseConfigured() {
    const config = window.FIREBASE_CONFIG;
    if (!config) return false;
    return Object.values(config).every((value) => typeof value === 'string' && !value.startsWith(PLACEHOLDER_PREFIX));
}

function initFirebase() {
    if (!isFirebaseConfigured()) {
        gameMessages.textContent = 'Paste your Firebase config into firebase-config.js to enable online play.';
        return false;
    }

    if (!firebase.apps.length) {
        firebase.initializeApp(window.FIREBASE_CONFIG);
    }

    APP_STATE.db = firebase.database();
    return true;
}

function renderDiceFace(value) {
    diceCube.innerHTML = '';
    diceCube.setAttribute('aria-label', `Dice showing ${value}`);

    (DICE_FACES[value] || []).forEach((position) => {
        const pip = document.createElement('span');
        pip.className = `pip ${position}`;
        diceCube.appendChild(pip);
    });
}

function rollDiceValue() {
    return Math.floor(Math.random() * 6) + 1;
}

function pickRandomRollEffect() {
    return DICE_ROLL_EFFECTS[Math.floor(Math.random() * DICE_ROLL_EFFECTS.length)];
}

function generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
}

function normalizeRoomCode(value) {
    return value.trim().toUpperCase();
}

function getPlayerName() {
    return playerNameInput.value.trim() || 'Player';
}

function getOrderedPlayers(playersMap) {
    if (!playersMap) return [];
    return Object.entries(playersMap)
        .map(([id, player]) => ({ id, ...player }))
        .sort((a, b) => (a.joinedAt || 0) - (b.joinedAt || 0));
}

function updateBoardTokens() {
    if (window.renderPlayerTokens) {
        window.renderPlayerTokens(APP_STATE.displayedPlayers);
    }
}

function updateStatusPanel() {
    playerStatusListEl.innerHTML = '';

    APP_STATE.displayedPlayers.forEach((player) => {
        const isActive = APP_STATE.roomData
            && APP_STATE.roomData.currentTurnPlayerId === player.id
            && APP_STATE.roomData.status === 'playing'
            && !APP_STATE.roomData.winnerId;

        const item = document.createElement('div');
        item.className = `status-player${isActive ? ' active' : ''}`;
        item.innerHTML = `
            <span class="player-chip">
                <i class="player-dot" style="background:${player.color}"></i>
                ${player.name}${player.id === APP_STATE.clientId ? ' (You)' : ''}
            </span>
            <span class="status-square">Square ${player.position || 1}</span>
        `;
        playerStatusListEl.appendChild(item);
    });

    if (!APP_STATE.roomData) {
        currentTurnLabelEl.textContent = 'Waiting for room';
        winnerLabelEl.textContent = 'No winner yet';
        return;
    }

    const players = getOrderedPlayers(APP_STATE.roomData.players);
    const currentPlayer = players.find((player) => player.id === APP_STATE.roomData.currentTurnPlayerId);
    const winner = players.find((player) => player.id === APP_STATE.roomData.winnerId);

    currentTurnLabelEl.textContent = currentPlayer ? currentPlayer.name : 'Waiting for players';
    winnerLabelEl.textContent = winner ? `${winner.name} wins` : 'No winner yet';
}

function setButtonStates() {
    const inRoom = Boolean(APP_STATE.roomCode);
    const players = getOrderedPlayers(APP_STATE.roomData?.players);
    const isHost = APP_STATE.roomData?.hostId === APP_STATE.clientId;
    const canStart = inRoom && isHost && APP_STATE.roomData?.status === 'lobby' && players.length >= 1;
    const isMyTurn = APP_STATE.roomData?.currentTurnPlayerId === APP_STATE.clientId;
    const canRoll = inRoom
        && APP_STATE.roomData?.status === 'playing'
        && !APP_STATE.roomData?.winnerId
        && isMyTurn
        && !APP_STATE.animating;

    createRoomBtn.disabled = inRoom;
    joinRoomBtn.disabled = inRoom;
    roomCodeInput.disabled = inRoom;
    playerNameInput.disabled = inRoom;
    startGameBtn.disabled = !canStart;
    leaveRoomBtn.disabled = !inRoom;
    rollDiceBtn.disabled = !canRoll;

    voiceBtn.style.opacity = APP_STATE.voiceEnabled ? '1' : '0.5';
    bgmBtn.style.opacity = window.AudioSys.bgmEnabled ? '1' : '0.5';
    sfxBtn.style.opacity = window.AudioSys.sfxEnabled ? '1' : '0.5';
}

function announcePlayerTurn(playerName) {
    if (!APP_STATE.voiceEnabled) return;
    if (getOrderedPlayers(APP_STATE.roomData?.players).length <= 1) return;
    if (!('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel();
    window.AudioSys.announcerCue();

    const hasBeenAnnounced = APP_STATE.announcedPlayers[playerName] === true;
    const utterance = new SpeechSynthesisUtterance(hasBeenAnnounced ? playerName : `${playerName}, step up to the board.`);
    utterance.rate = 0.9;
    utterance.pitch = 1.05;
    utterance.volume = 0.9;

    setTimeout(() => {
        window.speechSynthesis.speak(utterance);
    }, 280);

    APP_STATE.announcedPlayers[playerName] = true;
}

function syncDisplayedPlayersFromRoom() {
    APP_STATE.displayedPlayers = getOrderedPlayers(APP_STATE.roomData?.players).map((player) => ({
        ...player,
        position: player.position || 1
    }));
    updateStatusPanel();
    updateBoardTokens();
}

function findDisplayedPlayer(playerId) {
    return APP_STATE.displayedPlayers.find((player) => player.id === playerId);
}

async function animatePlayerMovement(player, targetSquare, stepDelay) {
    const direction = targetSquare >= player.position ? 1 : -1;

    while (player.position !== targetSquare) {
        player.position += direction;
        updateBoardTokens();
        window.AudioSys.hop();
        await delay(stepDelay);
    }
}

async function animateMove(move) {
    const player = findDisplayedPlayer(move.playerId);
    if (!player) {
        syncDisplayedPlayersFromRoom();
        return;
    }

    APP_STATE.animating = true;
    setButtonStates();

    const rollEffectClass = pickRandomRollEffect();
    diceCube.classList.remove(...DICE_ROLL_EFFECTS);
    void diceCube.offsetWidth;
    diceCube.classList.add('spinning', rollEffectClass);
    window.AudioSys.roll();

    const rollDuration = 1100;
    const animationStart = Date.now();

    await new Promise((resolve) => {
        const interval = setInterval(() => {
            renderDiceFace(rollDiceValue());
            if (Date.now() - animationStart >= rollDuration) {
                clearInterval(interval);
                resolve();
            }
        }, 100);
    });

    await delay(100);
    diceCube.classList.remove('spinning', rollEffectClass);
    renderDiceFace(move.diceValue);
    gameMessages.textContent = `${move.playerName} rolled a ${move.diceValue}.`;
    await delay(220);

    if (!move.blockedByExact) {
        await animatePlayerMovement(player, move.rawTarget, 240);
    }

    if (move.blockedByExact) {
        gameMessages.textContent = `${move.playerName} rolled ${move.diceValue} but needs an exact ${100 - move.fromPosition} to win.`;
    } else if (move.specialType === 'ladder') {
        window.AudioSys.ladder();
        await delay(250);
        await window.animateSpecialMove(player.id, 'ladder', move.rawTarget, move.finalTarget, 850);
        player.position = move.finalTarget;
        gameMessages.textContent = `${move.playerName} rolled ${move.diceValue} and climbed a ladder to ${move.finalTarget}.`;
    } else if (move.specialType === 'snake') {
        window.AudioSys.snake();
        await delay(250);
        await window.animateSpecialMove(player.id, 'snake', move.rawTarget, move.finalTarget, 1000);
        player.position = move.finalTarget;
        gameMessages.textContent = `${move.playerName} rolled ${move.diceValue} and slid down a snake to ${move.finalTarget}.`;
    } else {
        gameMessages.textContent = `${move.playerName} rolled ${move.diceValue} and moved to square ${move.rawTarget}.`;
    }

    updateBoardTokens();
    await delay(120);

    if (move.winnerId) {
        window.AudioSys.win();
    }

    APP_STATE.latestAnimatedMoveSeq = move.seq;
    APP_STATE.animating = false;
    syncDisplayedPlayersFromRoom();

    if (!move.winnerId && APP_STATE.roomData?.currentTurnPlayerId) {
        const nextPlayer = getOrderedPlayers(APP_STATE.roomData.players)
            .find((roomPlayer) => roomPlayer.id === APP_STATE.roomData.currentTurnPlayerId);
        if (nextPlayer) {
            announcePlayerTurn(nextPlayer.name);
        }
    }

    setButtonStates();
}

function handleRoomSnapshot(snapshot) {
    const data = snapshot.val();
    if (!data) {
        APP_STATE.roomData = null;
        APP_STATE.roomCode = null;
        APP_STATE.roomRef = null;
        APP_STATE.displayedPlayers = [];
        roomCodeLabel.textContent = 'Not connected';
        gameMessages.textContent = 'Room closed. Create or join a room to begin.';
        updateStatusPanel();
        updateBoardTokens();
        setButtonStates();
        return;
    }

    const previousStatus = APP_STATE.roomData?.status;
    const previousTurnPlayerId = APP_STATE.roomData?.currentTurnPlayerId;
    APP_STATE.roomData = data;
    roomCodeLabel.textContent = APP_STATE.roomCode;

    if (data.latestMove && data.latestMove.seq > APP_STATE.latestAnimatedMoveSeq && !APP_STATE.animating) {
        animateMove(data.latestMove);
        return;
    }

    if (data.message && !APP_STATE.animating) {
        gameMessages.textContent = data.message;
    }

    if (!APP_STATE.animating) {
        syncDisplayedPlayersFromRoom();
    } else {
        updateStatusPanel();
    }

    if (data.status === 'playing' && previousStatus !== 'playing') {
        APP_STATE.announcedPlayers = {};
        APP_STATE.hasStartedAnnouncement = false;
    }

    if (data.status === 'playing' && previousTurnPlayerId !== data.currentTurnPlayerId && !data.latestMove?.winnerId) {
        const currentPlayer = getOrderedPlayers(data.players).find((player) => player.id === data.currentTurnPlayerId);
        if (currentPlayer) {
            announcePlayerTurn(currentPlayer.name);
        }
    } else if (data.status === 'playing' && !APP_STATE.hasStartedAnnouncement) {
        const currentPlayer = getOrderedPlayers(data.players).find((player) => player.id === data.currentTurnPlayerId);
        if (currentPlayer) {
            announcePlayerTurn(currentPlayer.name);
            APP_STATE.hasStartedAnnouncement = true;
        }
    }

    setButtonStates();
}

function attachRoomListener(roomCode) {
    if (APP_STATE.roomRef) {
        APP_STATE.roomRef.off();
    }

    APP_STATE.roomCode = roomCode;
    APP_STATE.roomRef = APP_STATE.db.ref(`rooms/${roomCode}`);
    APP_STATE.roomRef.on('value', handleRoomSnapshot);
}

async function createRoom() {
    if (!initFirebase()) return;

    const playerName = getPlayerName();
    let roomCode = generateRoomCode();
    let snapshot = await APP_STATE.db.ref(`rooms/${roomCode}`).get();

    while (snapshot.exists()) {
        roomCode = generateRoomCode();
        snapshot = await APP_STATE.db.ref(`rooms/${roomCode}`).get();
    }

    const roomData = {
        hostId: APP_STATE.clientId,
        status: 'lobby',
        currentTurnPlayerId: APP_STATE.clientId,
        winnerId: null,
        lastDiceValue: 1,
        latestMove: null,
        message: `${playerName} created room ${roomCode}.`,
        createdAt: firebase.database.ServerValue.TIMESTAMP,
        players: {
            [APP_STATE.clientId]: {
                name: playerName,
                color: PLAYER_COLORS[0],
                position: 1,
                turns: 0,
                joinedAt: Date.now()
            }
        }
    };

    await APP_STATE.db.ref(`rooms/${roomCode}`).set(roomData);
    attachRoomListener(roomCode);
}

async function joinRoom() {
    if (!initFirebase()) return;

    const roomCode = normalizeRoomCode(roomCodeInput.value);
    if (!roomCode) {
        gameMessages.textContent = 'Enter a room code first.';
        return;
    }

    const roomRef = APP_STATE.db.ref(`rooms/${roomCode}`);
    const snapshot = await roomRef.get();
    if (!snapshot.exists()) {
        gameMessages.textContent = 'Room not found.';
        return;
    }

    const room = snapshot.val();
    const players = getOrderedPlayers(room.players);

    if (room.status !== 'lobby') {
        gameMessages.textContent = 'This room has already started.';
        return;
    }

    if (players.length >= MAX_PLAYERS && !room.players[APP_STATE.clientId]) {
        gameMessages.textContent = 'This room is full.';
        return;
    }

    const existingPlayer = room.players[APP_STATE.clientId];
    const playerName = getPlayerName();
    const color = existingPlayer?.color || PLAYER_COLORS[Math.min(players.length, PLAYER_COLORS.length - 1)];

    await roomRef.child(`players/${APP_STATE.clientId}`).set({
        name: playerName,
        color,
        position: 1,
        turns: 0,
        joinedAt: existingPlayer?.joinedAt || Date.now()
    });

    await roomRef.update({
        message: `${playerName} joined room ${roomCode}.`
    });

    attachRoomListener(roomCode);
}

async function startOnlineGame() {
    if (!APP_STATE.roomData || APP_STATE.roomData.hostId !== APP_STATE.clientId) return;

    const players = getOrderedPlayers(APP_STATE.roomData.players);
    if (!players.length) return;

    const updates = {
        status: 'playing',
        currentTurnPlayerId: players[0].id,
        winnerId: null,
        lastDiceValue: 1,
        latestMove: null,
        message: `${players[0].name} starts. Roll the dice.`
    };

    players.forEach((player) => {
        updates[`players/${player.id}/position`] = 1;
        updates[`players/${player.id}/turns`] = 0;
    });

    APP_STATE.latestAnimatedMoveSeq = 0;
    APP_STATE.announcedPlayers = {};
    APP_STATE.hasStartedAnnouncement = false;

    await APP_STATE.roomRef.update(updates);
}

async function leaveRoom() {
    if (!APP_STATE.roomRef || !APP_STATE.roomData) return;

    const isHost = APP_STATE.roomData.hostId === APP_STATE.clientId;
    if (isHost) {
        await APP_STATE.roomRef.remove();
    } else {
        await APP_STATE.roomRef.child(`players/${APP_STATE.clientId}`).remove();
        const remaining = getOrderedPlayers(APP_STATE.roomData.players).filter((player) => player.id !== APP_STATE.clientId);
        if (!remaining.length) {
            await APP_STATE.roomRef.remove();
        } else {
            await APP_STATE.roomRef.update({
                message: `${getPlayerName()} left the room.`
            });
        }
    }

    if (APP_STATE.roomRef) {
        APP_STATE.roomRef.off();
    }

    APP_STATE.roomRef = null;
    APP_STATE.roomCode = null;
    APP_STATE.roomData = null;
    APP_STATE.displayedPlayers = [];
    APP_STATE.latestAnimatedMoveSeq = 0;
    APP_STATE.animating = false;
    roomCodeLabel.textContent = 'Not connected';
    gameMessages.textContent = 'Create or join a room to begin.';
    updateStatusPanel();
    updateBoardTokens();
    setButtonStates();
}

async function handleRoll() {
    if (!APP_STATE.roomRef || !APP_STATE.roomData || APP_STATE.animating) return;
    if (APP_STATE.roomData.status !== 'playing') return;
    if (APP_STATE.roomData.currentTurnPlayerId !== APP_STATE.clientId) return;
    if (APP_STATE.roomData.winnerId) return;

    const players = getOrderedPlayers(APP_STATE.roomData.players);
    const activeIndex = players.findIndex((player) => player.id === APP_STATE.clientId);
    const player = players[activeIndex];
    if (!player) return;

    const diceValue = rollDiceValue();
    const fromPosition = player.position || 1;
    const overshoots = fromPosition + diceValue > 100;
    const rawTarget = overshoots ? fromPosition : fromPosition + diceValue;
    const blockedByExact = overshoots;
    const specialType = !blockedByExact && ladders[rawTarget] ? 'ladder' : !blockedByExact && snakes[rawTarget] ? 'snake' : null;
    const finalTarget = blockedByExact
        ? fromPosition
        : specialType === 'ladder'
            ? ladders[rawTarget]
            : specialType === 'snake'
                ? snakes[rawTarget]
                : rawTarget;
    const winnerId = !blockedByExact && finalTarget === 100 ? APP_STATE.clientId : null;
    const nextPlayerId = winnerId ? null : players[(activeIndex + 1) % players.length].id;
    const moveSeq = (APP_STATE.roomData.latestMove?.seq || 0) + 1;

    const move = {
        seq: moveSeq,
        playerId: APP_STATE.clientId,
        playerName: player.name,
        diceValue,
        fromPosition,
        rawTarget,
        blockedByExact,
        specialType,
        finalTarget,
        winnerId,
        nextPlayerId
    };

    const updates = {
        [`players/${APP_STATE.clientId}/position`]: finalTarget,
        [`players/${APP_STATE.clientId}/turns`]: (player.turns || 0) + 1,
        currentTurnPlayerId: nextPlayerId,
        winnerId,
        status: winnerId ? 'finished' : 'playing',
        lastDiceValue: diceValue,
        latestMove: move,
        message: winnerId
            ? `${player.name} reached square 100 and wins the game.`
            : blockedByExact
                ? `${players[(activeIndex + 1) % players.length].name}, your turn. ${player.name} needed an exact ${100 - fromPosition}.`
            : `${players[(activeIndex + 1) % players.length].name}, your turn. Roll the dice.`
    };

    await APP_STATE.roomRef.update(updates);
}

function toggleVoiceAnnouncements() {
    APP_STATE.voiceEnabled = !APP_STATE.voiceEnabled;
    if (!APP_STATE.voiceEnabled && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
    }
    setButtonStates();
}

voiceBtn.addEventListener('click', toggleVoiceAnnouncements);
bgmBtn.addEventListener('click', () => {
    window.AudioSys.toggleBGM();
    setButtonStates();
});
sfxBtn.addEventListener('click', () => {
    window.AudioSys.toggleSFX();
    setButtonStates();
});
createRoomBtn.addEventListener('click', createRoom);
joinRoomBtn.addEventListener('click', joinRoom);
startGameBtn.addEventListener('click', startOnlineGame);
leaveRoomBtn.addEventListener('click', leaveRoom);
rollDiceBtn.addEventListener('click', handleRoll);

window.addEventListener('load', () => {
    renderDiceFace(1);
    updateStatusPanel();
    updateBoardTokens();
    setButtonStates();

    if (!isFirebaseConfigured()) {
        gameMessages.textContent = 'Paste your Firebase config into firebase-config.js to enable online play.';
    }
});
