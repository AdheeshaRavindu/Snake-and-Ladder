# Snake-and-Ladder-Web3

## Real smart contract mode

Scores and leaderboard are now read from and written to a deployed smart contract.

1. Deploy `SnakeAndLadder.sol` to your target chain.
2. Open `contract.js` and set `CONTRACT_ADDRESS` to the deployed address.
3. Make sure MetaMask is connected to the same chain/network as the deployed contract.

After this, rolls, wins, games played, best score, total score, and leaderboard entries are persisted on-chain.

## Custom snake and ladder audio

Place your own audio files here:

- `assets/audio/snake.mp3`
- `assets/audio/ladder.mp3`

Playback priority is:

1. Local file (`assets/audio/*.mp3`)
2. YouTube clip (if configured and playable)
3. Built-in synthesized fallback tone