const leaderboardBody = document.getElementById('leaderboardBody');

async function refreshLeaderboard() {
    try {
        const players = await window.BlockChainAPI.getAllPlayers();

        // Convert object to array
        const playerArray = Object.keys(players).map(addr => ({
            address: addr,
            ...players[addr]
        }));

        // Sort by bestScore (descending)
        playerArray.sort((a, b) => b.bestScore - a.bestScore);

        leaderboardBody.innerHTML = '';

        if (playerArray.length === 0) {
            leaderboardBody.innerHTML = '<tr><td colspan="3" style="text-align:center">No players yet.</td></tr>';
            return;
        }

        // Render top 10 players
        playerArray.slice(0, 10).forEach((p, index) => {
            const tr = document.createElement('tr');

            const shortAddr = p.address.substring(0, 6) + "..." + p.address.substring(p.address.length - 4);

            tr.innerHTML = `
                <td>#${index + 1}</td>
                <td>${shortAddr}</td>
                <td>${p.bestScore}</td>
            `;
            leaderboardBody.appendChild(tr);
        });

    } catch (err) {
        console.error("Error loading leaderboard:", err);
    }
}

window.refreshLeaderboard = refreshLeaderboard;

// Load when wallet connects or independently when page loads
window.addEventListener('load', refreshLeaderboard);
