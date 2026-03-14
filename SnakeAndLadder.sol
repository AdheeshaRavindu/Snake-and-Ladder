// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract SnakeAndLadder {
    uint256 public constant ROLL_FEE = 0.000001 ether;

    struct Player {
        uint256 position;
        uint256 moves;
        uint256 wins;
        uint256 gamesPlayed;
        uint256 bestScore;
    }

    mapping(address => Player) public players;

    event DiceRolled(address indexed player, uint256 diceValue, uint256 newPosition);
    event GameWon(address indexed player, uint256 score, uint256 moves);

    // Core dice roll function
    function rollDice() external payable returns (uint256) {
        require(msg.value == ROLL_FEE, "Must pay exactly 0.000001 ether");

        Player storage player = players[msg.sender];

        // Initialize or restart player position
        if (player.position == 0 || player.position == 100) {
            player.position = 1;
            player.moves = 0;
            // Note: games played is incremented at the end of the game
        }
        
        // Basic PRNG for dice roll (1 to 6)
        // Warning: block.prevrandao/timestamp is pseudo-random and not secure for high stakes
        uint256 diceValue = (uint256(keccak256(abi.encodePacked(block.timestamp, block.prevrandao, msg.sender))) % 6) + 1;
        
        player.moves += 1;
        
        uint256 currentPos = player.position + diceValue;
        
        // Cap position at exactly 100
        if (currentPos > 100) {
            currentPos = 100; 
        }
        
        // Check for snakes and ladders interactions
        currentPos = applyBoardRules(currentPos);
        
        player.position = currentPos;
        
        emit DiceRolled(msg.sender, diceValue, currentPos);

        // Check for win condition
        if (currentPos == 100) {
            handleWin(msg.sender);
        }

        return diceValue;
    }

    // Handles ladder climbs and snake slides
    function applyBoardRules(uint256 pos) internal pure returns (uint256) {
        // Ladders configuration
        if (pos == 3) return 22;
        if (pos == 15) return 44;
        if (pos == 40) return 65;
        if (pos == 71) return 92;
        
        // Snakes configuration
        if (pos == 99) return 54;
        if (pos == 87) return 24;
        if (pos == 62) return 18;
        if (pos == 48) return 26;
        
        return pos;
    }

    // Determine score based on move count limits
    function calculateScore(uint256 moves) internal pure returns (uint256) {
        if (moves <= 20) return 1000;
        if (moves <= 30) return 800;
        if (moves <= 40) return 600;
        if (moves <= 60) return 400;
        return 200;
    }

    // Updates profile mapping metrics when game is completely finished
    function handleWin(address playerAddr) internal {
        Player storage player = players[playerAddr];
        
        uint256 score = calculateScore(player.moves);
        
        if (score > player.bestScore) {
            player.bestScore = score;
        }
        
        player.wins += 1;
        player.gamesPlayed += 1;
        
        emit GameWon(playerAddr, score, player.moves);
    }
    
    // External viewer returns all player profile data
    function getPlayer(address user) external view returns (
        uint256 position,
        uint256 moves,
        uint256 wins,
        uint256 gamesPlayed,
        uint256 bestScore
    ) {
        Player memory p = players[user];
        return (p.position, p.moves, p.wins, p.gamesPlayed, p.bestScore);
    }
}
