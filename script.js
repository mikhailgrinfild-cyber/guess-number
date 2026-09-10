// Инициализация Telegram Web App
const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();

// Элементы
const guessInput = document.getElementById('guessInput');
const checkBtn = document.getElementById('checkBtn');
const restartBtn = document.getElementById('restartBtn');
const hintEl = document.getElementById('hint');
const attemptsEl = document.getElementById('attempts');

// Состояние игры
let secretNumber = 0;
let attempts = 0;
let gameOver = false;

// Запуск новой игры
function startNewGame() {
    secretNumber = Math.floor(Math.random() * 100) + 1;
    attempts = 0;
    gameOver = false;
    
    attemptsEl.textContent = '0';
    hintEl.textContent = 'Введи число и нажми "Проверить"';
    hintEl.className = 'hint';
    guessInput.value = '';
    guessInput.disabled = false;
    guessInput.focus();
    checkBtn.style.display = 'block';
    restartBtn.style.display = 'none';
    
    // Вибрация (если поддерживается)
    if (tg.HapticFeedback) {
        tg.HapticFeedback.impactOccurred('light');
    }
}

// Проверка числа
function checkGuess() {
    if (gameOver) return;
    
    const guess = parseInt(guessInput.value);
    
    // Валидация
    if (!guess || guess < 1 || guess > 100) {
        hintEl.textContent = '⚠️ Введи число от 1 до 100!';
        hintEl.className = 'hint warning';
        shakeInput();
        return;
    }
    
    attempts++;
    attemptsEl.textContent = attempts;
    
    // Вибрация
    if (tg.HapticFeedback) {
        tg.HapticFeedback.impactOccurred('medium');
    }
    
    // Проверка
    if (guess === secretNumber) {
        // Победа!
        gameOver = true;
        hintEl.textContent = `🎉 Победа! Ты угадал за ${attempts} ${getAttemptWord(attempts)}!`;
        hintEl.className = 'hint success';
        guessInput.disabled = true;
        checkBtn.style.display = 'none';
        restartBtn.style.display = 'block';
        
        // Вибрация успеха
        if (tg.HapticFeedback) {
            tg.HapticFeedback.notificationOccurred('success');
        }
        
        // Отправляем результат в бот
        tg.sendData(JSON.stringify({
            action: 'win',
            number: secretNumber,
            attempts: attempts
        }));
        
    } else if (guess < secretNumber) {
        hintEl.textContent = `📈 Больше! Число больше ${guess}`;
        hintEl.className = 'hint';
        shakeInput();
        
    } else {
        hintEl.textContent = `📉 Меньше! Число меньше ${guess}`;
        hintEl.className = 'hint';
        shakeInput();
    }
    
    guessInput.value = '';
    guessInput.focus();
}

// Склонение слова "попытка"
function getAttemptWord(n) {
    const lastDigit = n % 10;
    const lastTwoDigits = n % 100;
    
    if (lastTwoDigits >= 11 && lastTwoDigits <= 14) return 'попыток';
    if (lastDigit === 1) return 'попытку';
    if (lastDigit >= 2 && lastDigit <= 4) return 'попытки';
    return 'попыток';
}

// Анимация тряски поля ввода
function shakeInput() {
    guessInput.style.animation = 'shake 0.3s';
    setTimeout(() => {
        guessInput.style.animation = '';
    }, 300);
}

// Обработчики
checkBtn.addEventListener('click', checkGuess);
restartBtn.addEventListener('click', startNewGame);

guessInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        checkGuess();
    }
});

// Запуск
startNewGame();

// Добавляем CSS-анимацию shake
const style = document.createElement('style');
style.textContent = `
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-8px); }
        75% { transform: translateX(8px); }
    }
`;
document.head.appendChild(style);