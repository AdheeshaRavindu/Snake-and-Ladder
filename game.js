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
        // Wait for blockchain simulated transaction
        const diceValue = await window.BlockChainAPI.rollDice();

        diceCube.classList.remove('spinning');
        diceCube.textContent = diceValue.toString();

        moveCount++;
        moveCountEl.innerText = moveCount.toString();

        // Move Base
        playerPosition += diceValue;
        if (playerPosition > 100) playerPosition = 100;

        updateTokenPosition(playerPosition);
        messages.innerText = `Rolled a ${diceValue}! Moved to ${playerPosition}.`;

        // Check Snake or Ladder after 500ms (to let slide finish)
        await txDelay(600);

        if (snakes[playerPosition]) {
            messages.innerText = "Oh no! You hit a snake. Sliding down...";
            window.AudioSys.snake();
            playerPosition = snakes[playerPosition];
            updateTokenPosition(playerPosition);
            await txDelay(600);
        } else if (ladders[playerPosition]) {
            messages.innerText = "Nice! You found a ladder. Climbing up...";
            window.AudioSys.ladder();
            playerPosition = ladders[playerPosition];
            updateTokenPosition(playerPosition);
            await txDelay(600);
        }

        // Check Game End
        if (playerPosition === 100) {
            gameActive = false;
            window.AudioSys.win();
            const finalScore = calculateScore(moveCount);
            currentScoreEl.innerText = finalScore.toString();

            messages.innerText = "Congratulations! You reached 100. Saving score...";
            await window.BlockChainAPI.submitScore(finalScore, moveCount);

            // Trigger refresh local UI components
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

    await handleRoll();
});

// Start player at position 1 visually
window.addEventListener('load', () => {
    updateTokenPosition(1);
    // Hide Token initially before wallet connect
    const playerToken = document.getElementById('playerToken');
    if (playerToken) playerToken.style.opacity = '0';
});
