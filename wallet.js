const GLOBAL_STATE = {
    walletAddress: null,
    provider: null,
    signer: null,
    connected: false
};

const connectBtn = document.getElementById('connectBtn');
const gameMessages = document.getElementById('gameMessages');
const rollDiceBtn = document.getElementById('rollDiceBtn');

async function connectWallet() {
    try {
        if (!window.ethereum) {
            gameMessages.innerText = "Error: Please install MetaMask or Web3 Wallet.";
            return;
        }

        // Request account access first using standard EIP-1193 method
        await window.ethereum.request({ method: 'eth_requestAccounts' });

        // Connect Ethers provider
        GLOBAL_STATE.provider = new ethers.providers.Web3Provider(window.ethereum);

        GLOBAL_STATE.signer = GLOBAL_STATE.provider.getSigner();
        GLOBAL_STATE.walletAddress = await GLOBAL_STATE.signer.getAddress();
        GLOBAL_STATE.connected = true;

        // UI Updates
        connectBtn.innerText = "Connected";
        connectBtn.classList.add('glow-btn');
        rollDiceBtn.disabled = false;

        const shortAddr = GLOBAL_STATE.walletAddress.substring(0, 6) + "..." + GLOBAL_STATE.walletAddress.substring(38);
        gameMessages.innerText = `Welcome, ${shortAddr}! Ready to roll.`;

        // Triggers rendering UI logic dependent on wallet (Profile, Leaderboard init)
        if (window.onWalletConnected) {
            window.onWalletConnected(GLOBAL_STATE.walletAddress);
        }

    } catch (error) {
        console.error("Wallet Connection Error:", error);
        gameMessages.innerText = "Failed to connect wallet.";
    }
}

connectBtn.addEventListener('click', connectWallet);

// Also listen to account changes
if (window.ethereum) {
    window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length === 0) {
            GLOBAL_STATE.connected = false;
            connectBtn.innerText = "Connect Wallet";
            rollDiceBtn.disabled = true;
            if (window.onWalletDisconnected) window.onWalletDisconnected();
        } else {
            connectWallet();
        }
    });
}
