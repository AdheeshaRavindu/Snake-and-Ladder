const MIN_PLAYERS = 1;
const MAX_PLAYERS = 5;
const PLAYER_COLORS = ['#ff8a5b', '#7ad8ff', '#ffd36b', '#7ef0a3', '#c596ff'];

const playerCountEl = document.getElementById('playerCount');
const playerSetupListEl = document.getElementById('playerSetupList');
const playerStatusListEl = document.getElementById('playerStatusList');
const currentTurnLabelEl = document.getElementById('currentTurnLabel');
const winnerLabelEl = document.getElementById('winnerLabel');
const startGameBtn = document.getElementById('startGameBtn');
const resetGameBtn = document.getElementById('resetGameBtn');
const rollDiceBtn = document.getElementById('rollDiceBtn');
const diceCube = document.getElementById('diceCube');
const gameMessages = document.getElementById('gameMessages');
const voiceBtn = document.getElementById('toggleVoiceBtn');
const bgmBtn = document.getElementById('toggleBgmBtn');
const sfxBtn = document.getElementById('toggleSfxBtn');

const GAME_STATE = {
    players: [],
    currentPlayerIndex: 0,
    winnerIndex: null,
    started: false,
    isRolling: false,
    announcedPlayers: {},
    voiceEnabled: true
};

const DICE_ROLL_EFFECTS = [
    'roll-effect-flip',
    'roll-effect-shake',
    'roll-effect-slam',
    'roll-effect-wobble'
];

function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function announcePlayerTurn(playerName) {
    if (GAME_STATE.players.length <= 1) return;
    if (!GAME_STATE.voiceEnabled) return;
    if (!('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel();
    window.AudioSys.announcerCue();

    const hasBeenAnnounced = GAME_STATE.announcedPlayers[playerName] === true;
    const utterance = new SpeechSynthesisUtterance(
        hasBeenAnnounced ? playerName : `${playerName}, step up to the board.`
    );
    utterance.rate = 0.9;
    utterance.pitch = 1.05;
    utterance.volume = 0.9;

    setTimeout(() => {
        window.speechSynthesis.speak(utterance);
    }, 280);

    GAME_STATE.announcedPlayers[playerName] = true;
}

function rollDiceValue() {
    return Math.floor(Math.random() * 6) + 1;
}

function pickRandomRollEffect() {
    return DICE_ROLL_EFFECTS[Math.floor(Math.random() * DICE_ROLL_EFFECTS.length)];
}

const DICE_FACES = {
    1: ['center'],
    2: ['top-left', 'bottom-right'],
    3: ['top-left', 'center', 'bottom-right'],
    4: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
    5: ['top-left', 'top-right', 'center', 'bottom-left', 'bottom-right'],
    6: ['top-left', 'top-right', 'middle-left', 'middle-right', 'bottom-left', 'bottom-right']
};

function renderDiceFace(value) {
    diceCube.innerHTML = '';
    diceCube.setAttribute('aria-label', `Dice showing ${value}`);

    (DICE_FACES[value] || []).forEach((position) => {
        const pip = document.createElement('span');
        pip.className = `pip ${position}`;
        diceCube.appendChild(pip);
    });
}

function renderPlayerSetupInputs() {
    const count = Number(playerCountEl.value);
    const previousPlayers = GAME_STATE.players;

    playerSetupListEl.innerHTML = '';

    for (let i = 0; i < count; i++) {
        const wrapper = document.createElement('label');
        wrapper.className = 'player-input-card';

        const label = document.createElement('span');
        label.className = 'mini-label';
        label.textContent = `Player ${i + 1}`;

        const input = document.createElement('input');
        input.className = 'input-control';
        input.type = 'text';
        input.maxLength = 18;
        input.value = previousPlayers[i]?.name || `Player ${i + 1}`;

        wrapper.appendChild(label);
        wrapper.appendChild(input);
        playerSetupListEl.appendChild(wrapper);
    }
}

function buildPlayersFromInputs() {
    const inputs = playerSetupListEl.querySelectorAll('input');
    return Array.from(inputs).map((input, index) => ({
        id: index,
        name: input.value.trim() || `Player ${index + 1}`,
        color: PLAYER_COLORS[index],
        position: 1,
        turns: 0
    }));
}

function updateBoardTokens() {
    if (window.renderPlayerTokens) {
        window.renderPlayerTokens(GAME_STATE.players);
    }
}

function updateStatusPanel() {
    playerStatusListEl.innerHTML = '';

    GAME_STATE.players.forEach((player, index) => {
        const item = document.createElement('div');
        item.className = `status-player${GAME_STATE.started && GAME_STATE.currentPlayerIndex === index && GAME_STATE.winnerIndex === null ? ' active' : ''}`;
        item.innerHTML = `
            <span class="player-chip">
                <i class="player-dot" style="background:${player.color}"></i>
                ${player.name}
            </span>
            <span class="status-square">Square ${player.position}</span>
        `;
        playerStatusListEl.appendChild(item);
    });

    if (!GAME_STATE.started) {
        currentTurnLabelEl.textContent = 'Set up players to begin';
    } else if (GAME_STATE.winnerIndex !== null) {
        currentTurnLabelEl.textContent = 'Game finished';
    } else {
        currentTurnLabelEl.textContent = GAME_STATE.players[GAME_STATE.currentPlayerIndex].name;
    }

    winnerLabelEl.textContent = GAME_STATE.winnerIndex === null
        ? 'No winner yet'
        : `${GAME_STATE.players[GAME_STATE.winnerIndex].name} wins`;
}

function setAudioButtons() {
    voiceBtn.style.opacity = GAME_STATE.voiceEnabled ? '1' : '0.5';
    bgmBtn.style.opacity = window.AudioSys.bgmEnabled ? '1' : '0.5';
    sfxBtn.style.opacity = window.AudioSys.sfxEnabled ? '1' : '0.5';
}

function startGame() {
    const count = Number(playerCountEl.value);
    if (count < MIN_PLAYERS || count > MAX_PLAYERS) return;

    GAME_STATE.players = buildPlayersFromInputs();
    GAME_STATE.currentPlayerIndex = 0;
    GAME_STATE.winnerIndex = null;
    GAME_STATE.started = true;
    GAME_STATE.isRolling = false;
    GAME_STATE.announcedPlayers = {};

    renderDiceFace(1);
    rollDiceBtn.disabled = false;
    gameMessages.textContent = `${GAME_STATE.players[0].name} starts. Roll the dice.`;
    announcePlayerTurn(GAME_STATE.players[0].name);

    window.AudioSys.sfxEnabled = true;
    window.AudioSys.bgmEnabled = true;
    window.AudioSys.startBGM();
    setAudioButtons();

    updateStatusPanel();
    updateBoardTokens();
}

function resetGame() {
    GAME_STATE.players = [];
    GAME_STATE.currentPlayerIndex = 0;
    GAME_STATE.winnerIndex = null;
    GAME_STATE.started = false;
    GAME_STATE.isRolling = false;
    GAME_STATE.announcedPlayers = {};

    renderDiceFace(1);
    rollDiceBtn.disabled = true;
    gameMessages.textContent = 'Choose your players and press Start Game.';

    renderPlayerSetupInputs();
    updateStatusPanel();
    updateBoardTokens();
}

function nextPlayer() {
    GAME_STATE.currentPlayerIndex = (GAME_STATE.currentPlayerIndex + 1) % GAME_STATE.players.length;
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

async function resolveSquare(player, diceValue) {
    const rawTarget = Math.min(player.position + diceValue, 100);
    await animatePlayerMovement(player, rawTarget, 240);

    if (ladders[rawTarget]) {
        const finalTarget = ladders[rawTarget];
        window.AudioSys.ladder();
        await delay(250);
        await window.animateSpecialMove(player.id, 'ladder', rawTarget, finalTarget, 850);
        player.position = finalTarget;
        updateBoardTokens();
        gameMessages.textContent = `${player.name} rolled ${diceValue} and climbed a ladder to ${finalTarget}.`;
        return;
    }

    if (snakes[rawTarget]) {
        const finalTarget = snakes[rawTarget];
        window.AudioSys.snake();
        await delay(250);
        await window.animateSpecialMove(player.id, 'snake', rawTarget, finalTarget, 1000);
        player.position = finalTarget;
        updateBoardTokens();
        gameMessages.textContent = `${player.name} rolled ${diceValue} and slid down a snake to ${finalTarget}.`;
        return;
    }

    gameMessages.textContent = `${player.name} rolled ${diceValue} and moved to square ${rawTarget}.`;
}

async function handleRoll() {
    if (!GAME_STATE.started || GAME_STATE.winnerIndex !== null || GAME_STATE.isRolling) return;

    GAME_STATE.isRolling = true;
    rollDiceBtn.disabled = true;
    const rollEffectClass = pickRandomRollEffect();
    diceCube.classList.remove(...DICE_ROLL_EFFECTS);
    void diceCube.offsetWidth;
    diceCube.classList.add('spinning', rollEffectClass);
    window.AudioSys.roll();

    const player = GAME_STATE.players[GAME_STATE.currentPlayerIndex];
    const diceValue = rollDiceValue();
    const animationStart = Date.now();
    const rollDuration = 1100;

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
    renderDiceFace(diceValue);
    gameMessages.textContent = `${player.name} rolled a ${diceValue}.`;
    await delay(220);
    player.turns += 1;

    await resolveSquare(player, diceValue);
    updateBoardTokens();

    if (player.position === 100) {
        GAME_STATE.winnerIndex = GAME_STATE.currentPlayerIndex;
        gameMessages.textContent = `${player.name} reached square 100 and wins the game.`;
        window.AudioSys.win();
    } else {
        nextPlayer();
        gameMessages.textContent = `${GAME_STATE.players[GAME_STATE.currentPlayerIndex].name}, your turn. Roll the dice.`;
        announcePlayerTurn(GAME_STATE.players[GAME_STATE.currentPlayerIndex].name);
    }

    updateStatusPanel();
    rollDiceBtn.disabled = GAME_STATE.winnerIndex !== null;
    GAME_STATE.isRolling = false;
}

function toggleVoiceAnnouncements() {
    GAME_STATE.voiceEnabled = !GAME_STATE.voiceEnabled;
    if (!GAME_STATE.voiceEnabled && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
    }
    setAudioButtons();
}

voiceBtn.addEventListener('click', toggleVoiceAnnouncements);
bgmBtn.addEventListener('click', () => {
    window.AudioSys.toggleBGM();
    setAudioButtons();
});

sfxBtn.addEventListener('click', () => {
    window.AudioSys.toggleSFX();
    setAudioButtons();
});

playerCountEl.addEventListener('change', renderPlayerSetupInputs);
startGameBtn.addEventListener('click', startGame);
resetGameBtn.addEventListener('click', resetGame);
rollDiceBtn.addEventListener('click', handleRoll);

window.addEventListener('load', () => {
    renderDiceFace(1);
    renderPlayerSetupInputs();
    updateStatusPanel();
    updateBoardTokens();
    setAudioButtons();
});
