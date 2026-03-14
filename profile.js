const profileView = document.getElementById('profileView');
const profileContent = document.getElementById('profileContent');
const profileWarning = document.getElementById('profileWarning');

const profileAddress = document.getElementById('profileAddress');
const profileWins = document.getElementById('profileWins');
const profileGames = document.getElementById('profileGames');
const profileBestScore = document.getElementById('profileBestScore');

async function refreshProfile() {
    if (!GLOBAL_STATE.connected) return;

    try {
        const player = await window.BlockChainAPI.getPlayer(GLOBAL_STATE.walletAddress);

        profileAddress.innerText = GLOBAL_STATE.walletAddress;
        profileWins.innerText = player.wins.toString();
        profileGames.innerText = player.gamesPlayed.toString();
        profileBestScore.innerText = player.bestScore.toString();

        profileWarning.classList.remove('active');
        profileContent.classList.add('active');

        // Ensure player token is shown on board
        const token = document.getElementById('playerToken');
        if (token) token.style.opacity = '1';

    } catch (err) {
        console.error("Failed to load profile:", err);
    }
}

window.refreshProfile = refreshProfile;

// Hooks invoked from wallet.js
window.onWalletConnected = async (address) => {
    await refreshProfile();
    await window.refreshLeaderboard();
};

window.onWalletDisconnected = () => {
    profileContent.classList.remove('active');
    profileWarning.classList.add('active');

    const token = document.getElementById('playerToken');
    if (token) token.style.opacity = '0'; // Hide from board
};
