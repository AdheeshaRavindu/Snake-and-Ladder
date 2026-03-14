const boardContainer = document.getElementById('gameBoard');
const START_X = 5;
const START_Y = 5;

// Board dimensions: 10x10, so 100 squares total
// Bottom-left starts at 1, bottom-right 10.
// Then going up like a snake: 11 is right to left
// Row 1 (y=9, Bottom): 1 -> 10  (left to right)
// Row 2 (y=8): 11 -> 20 (right to left)

function generateBoard() {
    boardContainer.innerHTML = '<div id="playerToken" class="player-token"></div>';

    for (let row = 0; row < 10; row++) {
        for (let col = 0; col < 10; col++) {
            let currentSquare;
            if (row % 2 === 0) {
                currentSquare = 100 - (row * 10) - col;
            } else {
                currentSquare = 100 - (row * 10) - (9 - col);
            }

            const div = document.createElement("div");
            div.classList.add("square");
            div.id = `square-${currentSquare}`;
            div.textContent = currentSquare;

            boardContainer.appendChild(div);
        }
    }
}

// Logic Mapping for Snakes & Ladders
const snakes = {
    12: 2,
    13: 3,
    14: 4,
    99: 54,
    87: 24,
    62: 18,
    48: 26
};

const ladders = {
    16: 36,
    17: 37,
    8: 98,
    7: 98,
    6: 98,
    5: 98,
    4: 98,
    3: 22,
    15: 44,
    40: 65,
    71: 92
};

// Calculate X,Y (in pixels) for smooth animation over grid
// Width of board: 500px -> each block 50px
const BLOCK_SIZE = 50;

function getPositionCoords(square) {
    if (square < 1) square = 1;
    if (square > 100) square = 100;

    const zeroIndexed = square - 1;
    let row = Math.floor(zeroIndexed / 10);
    let col = zeroIndexed % 10;

    // Reverse col direction for odd rows
    if (row % 2 !== 0) {
        col = 9 - col;
    }

    // Grid coordinates: origin bottom-left
    // CSS Top translates to (9 - row)
    const x = col * BLOCK_SIZE + (BLOCK_SIZE / 2);
    const y = (9 - row) * BLOCK_SIZE + (BLOCK_SIZE / 2);

    return { x, y };
}

// Draw visual hints (SVG connecting lines)
function drawConnections() {
    let svgStr = `<svg width="100%" height="100%" style="position:absolute; top:0; left:0; pointer-events:none; z-index:5;">`;

    // Draw snakes and ladders connecting lines
    for (let p in snakes) {
        const p1 = getPositionCoords(parseInt(p));
        const p2 = getPositionCoords(snakes[p]);
        svgStr += `<line x1="${p1.x}" y1="${p1.y}" x2="${p2.x}" y2="${p2.y}" stroke="#f85149" stroke-width="3" stroke-dasharray="5,5" opacity="0.6"/>`;
    }

    for (let p in ladders) {
        const p1 = getPositionCoords(parseInt(p));
        const p2 = getPositionCoords(ladders[p]);
        svgStr += `<line x1="${p1.x}" y1="${p1.y}" x2="${p2.x}" y2="${p2.y}" stroke="#2ea043" stroke-width="4" opacity="0.8"/>`;
    }

    svgStr += `</svg>`;
    boardContainer.insertAdjacentHTML('beforeend', svgStr);
}

window.addEventListener('DOMContentLoaded', () => {
    generateBoard();
    drawConnections();
});
