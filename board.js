const boardContainer = document.getElementById('gameBoard');

const snakes = {
    27: 10,
    47: 26,
    61: 40,
    74: 53,
    88: 67,
    97: 79
};

const ladders = {
    3: 16,
    8: 30,
    21: 42,
    28: 55,
    36: 57,
    51: 72
};

function generateBoard() {
    boardContainer.innerHTML = '';

    for (let row = 0; row < 10; row++) {
        for (let col = 0; col < 10; col++) {
            let currentSquare;
            if (row % 2 === 0) {
                currentSquare = 100 - (row * 10) - col;
            } else {
                currentSquare = 100 - (row * 10) - (9 - col);
            }

            const square = document.createElement('div');
            square.className = 'square';
            square.id = `square-${currentSquare}`;
            square.textContent = currentSquare;
            boardContainer.appendChild(square);
        }
    }

    const tokenLayer = document.createElement('div');
    tokenLayer.id = 'tokenLayer';
    tokenLayer.className = 'token-layer';
    boardContainer.appendChild(tokenLayer);
}

function getBoardMetrics() {
    const boardSize = boardContainer.clientWidth || 500;
    return {
        boardSize,
        blockSize: boardSize / 10
    };
}

function getPositionCoords(square) {
    const boundedSquare = Math.min(100, Math.max(1, square));
    const { blockSize } = getBoardMetrics();
    const zeroIndexed = boundedSquare - 1;
    let row = Math.floor(zeroIndexed / 10);
    let col = zeroIndexed % 10;

    if (row % 2 !== 0) {
        col = 9 - col;
    }

    return {
        x: col * blockSize + (blockSize / 2),
        y: (9 - row) * blockSize + (blockSize / 2)
    };
}

function getSnakeCurvePoints(startSquare, endSquare) {
    const start = getPositionCoords(startSquare);
    const end = getPositionCoords(endSquare);
    const { boardSize } = getBoardMetrics();
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const lateralBend = Math.max(24, boardSize * 0.095);
    const verticalLift = Math.max(18, boardSize * 0.07);
    const tailDip = Math.max(20, boardSize * 0.075);

    return {
        start,
        c1: {
            x: start.x + dx * 0.2 + (dy > 0 ? -lateralBend : lateralBend),
            y: start.y + dy * 0.15 - verticalLift
        },
        c2: {
            x: start.x + dx * 0.7 + (dy > 0 ? lateralBend * 1.15 : -(lateralBend * 1.15)),
            y: start.y + dy * 0.85 + tailDip
        },
        end
    };
}

function getBezierPoint(t, p0, p1, p2, p3) {
    const oneMinusT = 1 - t;
    const x = (oneMinusT ** 3) * p0.x
        + 3 * (oneMinusT ** 2) * t * p1.x
        + 3 * oneMinusT * (t ** 2) * p2.x
        + (t ** 3) * p3.x;
    const y = (oneMinusT ** 3) * p0.y
        + 3 * (oneMinusT ** 2) * t * p1.y
        + 3 * oneMinusT * (t ** 2) * p2.y
        + (t ** 3) * p3.y;

    return { x, y };
}

function createLadderSvg(startSquare, endSquare) {
    const start = getPositionCoords(startSquare);
    const end = getPositionCoords(endSquare);
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const length = Math.hypot(dx, dy);

    if (length === 0) return '';

    const unitX = dx / length;
    const unitY = dy / length;
    const perpX = -unitY;
    const perpY = unitX;
    const railOffset = 9;
    const rungCount = Math.max(4, Math.floor(length / 38));

    const leftStart = { x: start.x + perpX * railOffset, y: start.y + perpY * railOffset };
    const leftEnd = { x: end.x + perpX * railOffset, y: end.y + perpY * railOffset };
    const rightStart = { x: start.x - perpX * railOffset, y: start.y - perpY * railOffset };
    const rightEnd = { x: end.x - perpX * railOffset, y: end.y - perpY * railOffset };

    let rungs = '';
    for (let i = 1; i < rungCount; i++) {
        const t = i / rungCount;
        const centerX = start.x + dx * t;
        const centerY = start.y + dy * t;
        const rungHalf = 10;
        rungs += `
            <line x1="${centerX + perpX * rungHalf}" y1="${centerY + perpY * rungHalf}"
                  x2="${centerX - perpX * rungHalf}" y2="${centerY - perpY * rungHalf}"
                  stroke="#f7e0a3" stroke-width="4" stroke-linecap="round" opacity="0.95" />`;
    }

    return `
        <g filter="url(#softShadow)">
            <line x1="${leftStart.x}" y1="${leftStart.y}" x2="${leftEnd.x}" y2="${leftEnd.y}"
                  stroke="url(#ladderRail)" stroke-width="6" stroke-linecap="round" />
            <line x1="${rightStart.x}" y1="${rightStart.y}" x2="${rightEnd.x}" y2="${rightEnd.y}"
                  stroke="url(#ladderRail)" stroke-width="6" stroke-linecap="round" />
            ${rungs}
        </g>`;
}

function createSnakeSvg(startSquare, endSquare) {
    const { start, c1, c2, end } = getSnakeCurvePoints(startSquare, endSquare);
    const { boardSize } = getBoardMetrics();
    const shadowWidth = Math.max(10, boardSize * 0.036);
    const bodyWidth = Math.max(8, boardSize * 0.028);
    const markWidth = Math.max(2, boardSize * 0.007);
    const headRx = Math.max(8, boardSize * 0.026);
    const headRy = Math.max(6, boardSize * 0.02);
    const snoutRx = Math.max(4, boardSize * 0.014);
    const snoutRy = Math.max(3, boardSize * 0.011);
    const eyeR = Math.max(1.2, boardSize * 0.0032);
    const tongueReach = Math.max(14, boardSize * 0.045);
    const tailR = Math.max(3, boardSize * 0.01);

    const headAngle = Math.atan2(c1.y - start.y, c1.x - start.x) * (180 / Math.PI);
    const bodyPath = `M ${start.x} ${start.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${end.x} ${end.y}`;

    return `
        <g class="snake-group" data-snake-id="${startSquare}-${endSquare}" filter="url(#softShadow)">
            <path class="snake-shadow" d="${bodyPath}" fill="none" stroke="#1a3a24" stroke-width="${shadowWidth}" stroke-linecap="round" />
            <path class="snake-main" d="${bodyPath}" fill="none" stroke="url(#snakeBody)" stroke-width="${bodyWidth}" stroke-linecap="round" />
            <path class="snake-marks" d="${bodyPath}" fill="none" stroke="#b8f5a2" stroke-width="${markWidth}" stroke-linecap="round" stroke-dasharray="1 15" opacity="0.8" />
            <g class="snake-head" transform="translate(${start.x}, ${start.y}) rotate(${headAngle})">
                <ellipse cx="0" cy="0" rx="${headRx}" ry="${headRy}" fill="#70d36f" />
                <ellipse cx="${headRx * 0.62}" cy="0" rx="${snoutRx}" ry="${snoutRy}" fill="#9ef28f" />
                <circle cx="${headRx * 0.3}" cy="${-headRy * 0.3}" r="${eyeR}" fill="#0d1117" />
                <path d="M ${headRx} 0 Q ${headRx + tongueReach * 0.45} 2 ${headRx + tongueReach} 0 Q ${headRx + tongueReach * 0.45} -2 ${headRx} 0" fill="#ff7b7b" />
            </g>
            <circle cx="${end.x}" cy="${end.y}" r="${tailR}" fill="#6ecf6f" opacity="0.9" />
        </g>`;
}

function drawConnections() {
    const { boardSize } = getBoardMetrics();
    const existingOverlay = boardContainer.querySelector('.board-overlay');
    if (existingOverlay) existingOverlay.remove();

    const snakeMarkup = Object.keys(snakes)
        .map((fromSquare) => createSnakeSvg(Number(fromSquare), snakes[fromSquare]))
        .join('');

    const ladderMarkup = Object.keys(ladders)
        .map((fromSquare) => createLadderSvg(Number(fromSquare), ladders[fromSquare]))
        .join('');

    boardContainer.insertAdjacentHTML('beforeend', `
        <svg class="board-overlay" width="100%" height="100%" viewBox="0 0 ${boardSize} ${boardSize}"
             style="position:absolute; top:0; left:0; pointer-events:none; z-index:5;">
            <defs>
                <linearGradient id="ladderRail" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="#fff2c4" />
                    <stop offset="100%" stop-color="#d79a35" />
                </linearGradient>
                <linearGradient id="snakeBody" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="#9cf17d" />
                    <stop offset="55%" stop-color="#43aa57" />
                    <stop offset="100%" stop-color="#265e36" />
                </linearGradient>
                <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="8" stdDeviation="7" flood-color="rgba(0,0,0,0.35)" />
                </filter>
            </defs>
            ${ladderMarkup}
            ${snakeMarkup}
        </svg>
    `);
}

function renderPlayerTokens(players) {
    const tokenLayer = document.getElementById('tokenLayer');
    if (!tokenLayer) return;

    tokenLayer.innerHTML = '';
    const offsets = [
        { x: 0, y: 0 },
        { x: -10, y: -10 },
        { x: 10, y: -10 },
        { x: -10, y: 10 },
        { x: 10, y: 10 }
    ];

    players.forEach((player, index) => {
        const coords = getPositionCoords(player.position || 1);
        const offset = offsets[index] || offsets[0];
        const token = document.createElement('div');

        token.className = 'player-token';
        token.dataset.playerId = String(player.id);
        token.style.left = `${coords.x + offset.x}px`;
        token.style.top = `${coords.y + offset.y}px`;
        token.style.opacity = '1';
        token.style.background = `radial-gradient(circle at 30% 30%, #ffffff 0%, ${player.color} 38%, #10243d 100%)`;
        token.style.boxShadow = `0 0 16px ${player.color}`;
        token.title = player.name;
        token.innerHTML = `<span class="token-label">${index + 1}</span>`;

        tokenLayer.appendChild(token);
    });
}

function getTokenOffset(playerId) {
    const offsets = [
        { x: 0, y: 0 },
        { x: -10, y: -10 },
        { x: 10, y: -10 },
        { x: -10, y: 10 },
        { x: 10, y: 10 },
        { x: 0, y: -14 },
        { x: -14, y: 0 },
        { x: 14, y: 0 }
    ];

    return offsets[playerId] || offsets[0];
}

function animateSpecialMove(playerId, moveType, fromSquare, toSquare, duration = 900) {
    const token = document.querySelector(`.player-token[data-player-id="${playerId}"]`);
    if (!token) return Promise.resolve();

    const offset = getTokenOffset(playerId);
    const startTime = performance.now();
    const snakeGroup = moveType === 'snake'
        ? document.querySelector(`.snake-group[data-snake-id="${fromSquare}-${toSquare}"]`)
        : null;

    if (snakeGroup) {
        snakeGroup.classList.add('snake-active');
    }

    return new Promise((resolve) => {
        function step(now) {
            const progress = Math.min((now - startTime) / duration, 1);
            let point;

            if (moveType === 'snake') {
                const curve = getSnakeCurvePoints(fromSquare, toSquare);
                point = getBezierPoint(progress, curve.start, curve.c1, curve.c2, curve.end);
            } else {
                const start = getPositionCoords(fromSquare);
                const end = getPositionCoords(toSquare);
                point = {
                    x: start.x + ((end.x - start.x) * progress),
                    y: start.y + ((end.y - start.y) * progress)
                };
            }

            token.style.left = `${point.x + offset.x}px`;
            token.style.top = `${point.y + offset.y}px`;

            if (progress < 1) {
                requestAnimationFrame(step);
            } else {
                if (snakeGroup) {
                    snakeGroup.classList.remove('snake-active');
                }
                resolve();
            }
        }

        requestAnimationFrame(step);
    });
}

let resizeFrame = null;

function scheduleBoardRedraw() {
    if (resizeFrame !== null) {
        cancelAnimationFrame(resizeFrame);
    }

    resizeFrame = requestAnimationFrame(() => {
        drawConnections();
        resizeFrame = null;
    });
}

window.addEventListener('DOMContentLoaded', () => {
    generateBoard();
    drawConnections();
});

window.addEventListener('resize', scheduleBoardRedraw);

window.renderPlayerTokens = renderPlayerTokens;
window.animateSpecialMove = animateSpecialMove;
