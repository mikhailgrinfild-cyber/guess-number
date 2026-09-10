const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();

const BOARD_SIZE = 10;
const MINES_COUNT = 10;

let board = [];
let revealed = [];
let flagged = [];
let mines = [];
let gameOver = false;
let win = false;
let startTime = null;
let timerInterval = null;
let flagsCount = 0;
let longPressTimer = null;

const boardEl = document.getElementById('board');
const minesCountEl = document.getElementById('minesCount');
const flagsCountEl = document.getElementById('flagsCount');
const timerEl = document.getElementById('timer');
const restartBtn = document.getElementById('restartBtn');

function initGame() {
    board = Array(BOARD_SIZE).fill().map(() => Array(BOARD_SIZE).fill(0));
    revealed = Array(BOARD_SIZE).fill().map(() => Array(BOARD_SIZE).fill(false));
    flagged = Array(BOARD_SIZE).fill().map(() => Array(BOARD_SIZE).fill(false));
    mines = [];
    gameOver = false;
    win = false;
    flagsCount = 0;
    startTime = null;
    
    if (timerInterval) clearInterval(timerInterval);
    timerEl.textContent = '0';
    flagsCountEl.textContent = '0';
    
    // Размещаем мины
    let placed = 0;
    while (placed < MINES_COUNT) {
        const r = Math.floor(Math.random() * BOARD_SIZE);
        const c = Math.floor(Math.random() * BOARD_SIZE);
        if (board[r][c] !== -1) {
            board[r][c] = -1;
            mines.push([r, c]);
            placed++;
        }
    }
    
    // Считаем числа
    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            if (board[r][c] === -1) continue;
            let count = 0;
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    const nr = r + dr, nc = c + dc;
                    if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE) {
                        if (board[nr][nc] === -1) count++;
                    }
                }
            }
            board[r][c] = count;
        }
    }
    
    renderBoard();
    minesCountEl.textContent = MINES_COUNT;
}

function renderBoard() {
    boardEl.innerHTML = '';
    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.r = r;
            cell.dataset.c = c;
            
            if (revealed[r][c]) {
                cell.classList.add('opened');
                if (board[r][c] === -1) {
                    cell.classList.add('mine');
                    cell.textContent = '💣';
                } else if (board[r][c] > 0) {
                    cell.textContent = board[r][c];
                    cell.classList.add('n' + board[r][c]);
                } else {
                    cell.classList.add('empty');
                }
            } else if (flagged[r][c]) {
                cell.classList.add('flag');
                cell.textContent = '🚩';
            }
            
            // Обработчики
            cell.addEventListener('click', (e) => {
                e.preventDefault();
                if (longPressTimer) {
                    clearTimeout(longPressTimer);
                    longPressTimer = null;
                    return;
                }
                handleClick(r, c);
            });
            
            cell.addEventListener('touchstart', (e) => {
                longPressTimer = setTimeout(() => {
                    handleRightClick(r, c);
                    longPressTimer = null;
                }, 500);
            });
            
            cell.addEventListener('touchend', () => {
                if (longPressTimer) {
                    clearTimeout(longPressTimer);
                    longPressTimer = null;
                }
            });
            
            cell.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                handleRightClick(r, c);
            });
            
            boardEl.appendChild(cell);
        }
    }
}

function startTimer() {
    if (startTime) return;
    startTime = Date.now();
    timerInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        timerEl.textContent = elapsed;
    }, 1000);
}

function handleClick(r, c) {
    if (gameOver || revealed[r][c] || flagged[r][c]) return;
    
    if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
    
    if (!startTime) startTimer();
    
    if (board[r][c] === -1) {
        // Попали на мину
        gameOver = true;
        revealAllMines();
        if (timerInterval) clearInterval(timerInterval);
        if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('error');
        showResult(false);
        return;
    }
    
    revealCell(r, c);
    renderBoard();
    checkWin();
}

function revealCell(r, c) {
    if (r < 0 || r >= BOARD_SIZE || c < 0 || c >= BOARD_SIZE) return;
    if (revealed[r][c] || flagged[r][c]) return;
    
    revealed[r][c] = true;
    
    if (board[r][c] === 0) {
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue;
                revealCell(r + dr, c + dc);
            }
        }
    }
}

function handleRightClick(r, c) {
    if (gameOver || revealed[r][c]) return;
    
    if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('medium');
    
    if (!startTime) startTimer();
    
    flagged[r][c] = !flagged[r][c];
    flagsCount += flagged[r][c] ? 1 : -1;
    flagsCountEl.textContent = flagsCount;
    
    renderBoard();
    checkWin();
}

function revealAllMines() {
    for (const [r, c] of mines) {
        revealed[r][c] = true;
    }
}

function checkWin() {
    if (gameOver) return;
    
    let unrevealedSafe = 0;
    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            if (!revealed[r][c] && board[r][c] !== -1) unrevealedSafe++;
        }
    }
    
    if (unrevealedSafe === 0) {
        gameOver = true;
        win = true;
        if (timerInterval) clearInterval(timerInterval);
        if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
        showResult(true);
        
        // Отправляем в бот
        const time = Math.floor((Date.now() - startTime) / 1000);
        tg.sendData(JSON.stringify({
            action: 'win',
            time: time,
            game: 'minesweeper'
        }));
    }
}

function showResult(isWin) {
    const overlay = document.createElement('div');
    overlay.className = isWin ? 'win-overlay' : 'lose-overlay';
    
    const time = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;
    
    overlay.innerHTML = `
        <div class="result-card">
            <h2>${isWin ? '🎉 Победа!' : '💥 Бум!'}</h2>
            <p>${isWin ? `Ты обезвредил все мины за ${time} сек!` : 'Ты наступил на мину!'}</p>
            <button class="btn-primary" onclick="this.closest('.win-overlay, .lose-overlay').remove(); initGame();">
                🔄 Играть снова
            </button>
        </div>
    `;
    
    document.body.appendChild(overlay);
}

restartBtn.addEventListener('click', () => {
    if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
    initGame();
});

initGame();