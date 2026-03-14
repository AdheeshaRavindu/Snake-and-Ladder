// Real blockchain contract interface.
// Set your deployed contract address below (or via window.SNAKE_LADDER_CONTRACT_ADDRESS).
const CONTRACT_ADDRESS = window.SNAKE_LADDER_CONTRACT_ADDRESS || "";

const CONTRACT_ABI = [
    "function ROLL_FEE() view returns (uint256)",
    "function rollDice() payable returns (uint256)",
    "function getPlayers() view returns (address[] memory)",
    "function getPlayer(address user) view returns (uint256 position, uint256 moves, uint256 wins, uint256 gamesPlayed, uint256 bestScore, uint256 totalScore)",
    "event DiceRolled(address indexed player, uint256 diceValue, uint256 newPosition)",
    "event GameWon(address indexed player, uint256 score, uint256 moves)"
];

function getReadContract() {
    if (!CONTRACT_ADDRESS || !ethers.utils.isAddress(CONTRACT_ADDRESS)) {
        throw new Error("Contract address is not configured. Set CONTRACT_ADDRESS in contract.js or window.SNAKE_LADDER_CONTRACT_ADDRESS.");
    }

    if (!GLOBAL_STATE.provider) {
        throw new Error("Wallet provider is not connected.");
    }

    return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, GLOBAL_STATE.provider);
}

function getWriteContract() {
    if (!CONTRACT_ADDRESS || !ethers.utils.isAddress(CONTRACT_ADDRESS)) {
        throw new Error("Contract address is not configured. Set CONTRACT_ADDRESS in contract.js or window.SNAKE_LADDER_CONTRACT_ADDRESS.");
    }

    if (!GLOBAL_STATE.signer) {
        throw new Error("Wallet signer is not connected.");
    }

    return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, GLOBAL_STATE.signer);
}

function toNumber(v) {
    return ethers.BigNumber.isBigNumber(v) ? v.toNumber() : Number(v);
}

async function txDelay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

window.BlockChainAPI = {
    // getPlayer(address)
    getPlayer: async (address) => {
        const contract = getReadContract();
        const data = await contract.getPlayer(address);

        return {
            position: toNumber(data.position),
            moves: toNumber(data.moves),
            wins: toNumber(data.wins),
            gamesPlayed: toNumber(data.gamesPlayed),
            bestScore: toNumber(data.bestScore),
            totalScore: toNumber(data.totalScore)
        };
    },

    // rollDice()
    rollDice: async () => {
        if (!GLOBAL_STATE.signer) {
            throw new Error("Wallet not connected");
        }

        const contract = getWriteContract();
        const fee = await contract.ROLL_FEE();
        gameMessages.innerText = "Awaiting transaction approval...";

        try {
            const tx = await contract.rollDice({ value: fee });

            gameMessages.innerText = "Transaction pending...";
            const receipt = await tx.wait();
            gameMessages.innerText = "Transaction successful! Rolling dice...";

            let diceValue = null;
            let newPosition = null;

            for (const log of receipt.logs) {
                try {
                    const parsed = contract.interface.parseLog(log);
                    if (parsed && parsed.name === 'DiceRolled') {
                        diceValue = toNumber(parsed.args.diceValue);
                        newPosition = toNumber(parsed.args.newPosition);
                    }
                } catch (_) {
                    // Ignore unrelated logs.
                }
            }

            if (diceValue === null || newPosition === null) {
                const player = await window.BlockChainAPI.getPlayer(GLOBAL_STATE.walletAddress);
                return {
                    diceValue: 1,
                    newPosition: player.position,
                    won: player.position === 100
                };
            }

            return {
                diceValue,
                newPosition,
                won: newPosition === 100
            };
        } catch (err) {
            console.error(err);
            throw new Error("Transaction failed or rejected.");
        }
    },

    // submitScore(score, moves)
    // Kept for backward compatibility; score updates are handled by rollDice() on-chain.
    submitScore: async () => {
        return;
    },

    // Helper for Leaderboard
    getAllPlayers: async () => {
        const contract = getReadContract();
        const addresses = await contract.getPlayers();
        const players = {};

        await Promise.all(addresses.map(async (addr) => {
            const p = await window.BlockChainAPI.getPlayer(addr);
            players[addr] = p;
        }));

        return players;
    }
};
