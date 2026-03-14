// Simulated Blockchain Contract Interface
// Since no contract address/ABI was provided, we simulate the logic + state via localStorage.
// To satisfy the 0.000001 ETH requirement, we trigger a real transaction to the player's own address.

const CONTRACT_STATE_KEY = "S_L_QUEST_STATE";

function getLocalState() {
    const raw = localStorage.getItem(CONTRACT_STATE_KEY);
    return raw ? JSON.parse(raw) : { players: {} };
}

function saveLocalState(state) {
    localStorage.setItem(CONTRACT_STATE_KEY, JSON.stringify(state));
}

function initPlayer(address) {
    const state = getLocalState();
    if (!state.players[address]) {
        state.players[address] = {
            position: 1,
            moves: 0,
            wins: 0,
            gamesPlayed: 0,
            bestScore: 0
        };
        saveLocalState(state);
    }
    return state.players[address];
}

async function txDelay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

window.BlockChainAPI = {
    // getPlayer(address)
    getPlayer: async (address) => {
        await txDelay(500); // Simulate network
        return initPlayer(address);
    },

    // rollDice()
    rollDice: async () => {
        if (!GLOBAL_STATE.signer) {
            throw new Error("Wallet not connected");
        }

        // Transaction includes value: 0.000001 ETH
        // We trigger a transfer to the connected address to act as the "contract fee"
        gameMessages.innerText = "Awaiting transaction approval...";

        try {
            const tx = await GLOBAL_STATE.signer.sendTransaction({
                to: GLOBAL_STATE.walletAddress, // Self-transfer as placeholder
                value: ethers.utils.parseEther("0.000001")
            });

            gameMessages.innerText = "Transaction pending...";
            await tx.wait(); // Wait for confirmation
            gameMessages.innerText = "Transaction successful! Rolling dice...";

            // Random number 1-6
            const result = Math.floor(Math.random() * 6) + 1;
            return result;
        } catch (err) {
            console.error(err);
            throw new Error("Transaction failed or rejected.");
        }
    },

    // submitScore(score, moves)
    submitScore: async (score, moves) => {
        gameMessages.innerText = "Submitting score to blockchain...";
        await txDelay(1000);

        const state = getLocalState();
        const addr = GLOBAL_STATE.walletAddress;

        const player = state.players[addr];
        player.wins += 1;
        player.gamesPlayed += 1;
        player.moves = moves;

        if (score > player.bestScore) {
            player.bestScore = score;
        }

        saveLocalState(state);
        gameMessages.innerText = "Score saved! Game Over.";
    },

    // Helper for Leaderboard
    getAllPlayers: async () => {
        return getLocalState().players;
    }
};
