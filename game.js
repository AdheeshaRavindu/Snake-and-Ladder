let playerPosition = 1;
let moveCount = 0;
let isRolling = false;
let gameActive = false;

const moveCountEl = document.getElementById('moveCount');
const currentScoreEl = document.getElementById('currentScore');
const diceBtn = document.getElementById('rollDiceBtn');
const diceCube = document.getElementById('diceCube');
const messages = document.getElementById('gameMessages');
const bgmBtn = document.getElementById('toggleBgmBtn');
const sfxBtn = document.getElementById('toggleSfxBtn');

// Initialize toggles
bgmBtn.addEventListener('click', () => {
    const active = window.AudioSys.toggleBGM();
    bgmBtn.style.opacity = active ? '1' : '0.5';
});

sfxBtn.addEventListener('click', () => {
    const active = window.AudioSys.toggleSFX();
    sfxBtn.style.opacity = active ? '1' : '0.5';
});

function enableAllSoundsForNewGame() {
    window.AudioSys.sfxEnabled = true;
    window.AudioSys.bgmEnabled = true;
    window.AudioSys.startBGM();
    bgmBtn.style.opacity = '1';
    sfxBtn.style.opacity = '1';
}

function updateTokenPosition(square) {
    const playerToken = document.getElementById('playerToken');
    if (!playerToken) return;

    if (square < 1) square = 1;
    if (square > 100) square = 100;

    // Calculate new Coords
    const targetCellCoords = getPositionCoords(square);

    // Convert zero-indexed grid to percentages/pixels
    playerToken.style.left = `${targetCellCoords.x}px`;
    playerToken.style.top = `${targetCellCoords.y}px`;
    playerToken.style.opacity = '1';
}

function calculateScore(moves) {
    if (moves <= 20) return 1000;
    if (moves <= 30) return 800;
    if (moves <= 40) return 600;
    if (moves <= 60) return 400;
    return 200;
}

async function handleRoll() {
    if (isRolling || !GLOBAL_STATE.connected) return;
    isRolling = true;

    // Spin Dice Animation
    diceCube.classList.add('spinning');
    window.AudioSys.roll();

    try {
        // Execute on-chain roll transaction and fetch parsed on-chain result.
        const rollResult = await window.BlockChainAPI.rollDice();
        const diceValue = rollResult.diceValue;
        const chainPosition = rollResult.newPosition;

        diceCube.classList.remove('spinning');
        diceCube.textContent = diceValue.toString();

        moveCount++;
        moveCountEl.innerText = moveCount.toString();

        const rawTarget = Math.min(playerPosition + diceValue, 100);
        const movedBySnake = chainPosition < rawTarget;
        const movedByLadder = chainPosition > rawTarget;

        playerPosition = chainPosition;

        updateTokenPosition(playerPosition);
        messages.innerText = `Rolled a ${diceValue}! Moved to ${playerPosition}.`;

        if (movedBySnake) {
            messages.innerText = "Oh no! You hit a snake. Sliding down...";
            window.AudioSys.snake();
            await txDelay(600);
        } else if (movedByLadder) {
            messages.innerText = "Nice! You found a ladder. Climbing up...";
            window.AudioSys.ladder();
            await txDelay(600);
        }

        // Check Game End
        if (rollResult.won || playerPosition === 100) {
            gameActive = false;
            window.AudioSys.win();
            const finalScore = calculateScore(moveCount);
            currentScoreEl.innerText = finalScore.toString();

            messages.innerText = "Congratulations! You reached 100.";

            // Trigger refresh on-chain UI components
            if (window.refreshProfile) window.refreshProfile();
            if (window.refreshLeaderboard) window.refreshLeaderboard();

            // Allow Reset
            messages.innerText = "Game Over. Click Roll Dice to play again.";
        }

    } catch (err) {
        diceCube.classList.remove('spinning');
        messages.innerText = "Transaction failed or wallet rejected.";
        console.error("Roll error", err);
    } finally {
        isRolling = false;
    }
}

// Ensure game logic is hooked
diceBtn.addEventListener('click', async () => {
    if (playerPosition === 100) {
        // Reset Game
        playerPosition = 1;
        moveCount = 0;
        moveCountEl.innerText = '0';
        currentScoreEl.innerText = '0';
        updateTokenPosition(playerPosition);
    }

    // Ensure sound defaults are re-enabled when a new run starts.
    if (moveCount === 0 && playerPosition === 1) {
        enableAllSoundsForNewGame();
    }

    await handleRoll();
});

// Start player at position 1 visually
window.addEventListener('load', () => {
    updateTokenPosition(1);
    // Hide Token initially before wallet connect
    const playerToken = document.getElementById('playerToken');
    if (playerToken) playerToken.style.opacity = '0';
});
