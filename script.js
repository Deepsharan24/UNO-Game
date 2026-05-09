const COLORS = ['red', 'blue', 'green', 'yellow'];
const VALUES = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'skip', 'reverse', 'draw2'];
const WILD_TYPES = ['wild', 'draw4'];

let deck = [];
let discardPile = [];
let playerHand = [];
let computerHand = [];
let currentPlayer = 'player'; // 'player' or 'computer'
let currentColor = '';

// DOM Elements
const playerHandEl = document.getElementById('player-hand');
const computerHandEl = document.getElementById('computer-hand');
const discardPileEl = document.getElementById('discard-pile');
const drawPileEl = document.getElementById('draw-pile');
const colorIndicatorEl = document.getElementById('current-color-indicator');
const turnIndicatorEl = document.getElementById('turn-indicator');
const computerCardCountEl = document.getElementById('computer-card-count');
const unoBtn = document.getElementById('uno-btn');

// Modals
const startScreenModal = document.getElementById('start-screen-modal');
const playerNameInput = document.getElementById('player-name-input');
const startGameBtn = document.getElementById('start-game-btn');
const playerNameDisplay = document.getElementById('player-name-display');
const playerAvatar = document.getElementById('player-avatar');
const colorPickerModal = document.getElementById('color-picker-modal');
const gameOverModal = document.getElementById('game-over-modal');
const gameOverTitle = document.getElementById('game-over-title');
const gameOverMessage = document.getElementById('game-over-message');
const restartBtn = document.getElementById('restart-btn');

// Audio
const bgMusic = document.getElementById('bg-music');
const cardPlaySound = document.getElementById('card-play-sound');
const cardDrawSound = document.getElementById('card-draw-sound');
const sfxToggle = document.getElementById('sfx-toggle');
const winSound = document.getElementById('win-sound');
const lossSound = document.getElementById('loss-sound');
const confettiCanvas = document.getElementById('confetti-canvas');
const ctx = confettiCanvas.getContext('2d');

const spotifyInput = document.getElementById('spotify-input');
const loadSpotifyBtn = document.getElementById('load-spotify-btn');
const spotifyIframeContainer = document.getElementById('spotify-iframe-container');
const bgGlow = document.getElementById('dynamic-bg-glow');
const particlesContainer = document.getElementById('particles-container');

let confettiParticles = [];
let confettiAnimationId = null;

let isMusicPlaying = false;
let isSfxPlaying = false;
let pendingWildCard = null;
let playerCalledUno = false;
let computerCalledUno = false;

// Initialize Game
function initGame() {
    if (confettiAnimationId) cancelAnimationFrame(confettiAnimationId);
    if (ctx) ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    
    deck = createDeck();
    shuffleDeck(deck);
    
    playerHand = [];
    computerHand = [];
    discardPile = [];
    playerCalledUno = false;
    computerCalledUno = false;

    // Deal 7 cards each
    for (let i = 0; i < 7; i++) {
        playerHand.push(deck.pop());
        computerHand.push(deck.pop());
    }

    // First card to discard pile (cannot be a wild card for simplicity)
    let firstCard = deck.pop();
    while (firstCard.color === 'wild') {
        deck.unshift(firstCard);
        firstCard = deck.pop();
    }
    discardPile.push(firstCard);
    currentColor = firstCard.color;

    currentPlayer = 'player';
    
    updateUI();
    updateTurnIndicator();
    
    gameOverModal.classList.add('hidden');
}

function createDeck() {
    let newDeck = [];
    // Colored cards
    for (const color of COLORS) {
        // One 0
        newDeck.push({ color, type: 'number', value: '0' });
        // Two of 1-9, skip, reverse, draw2
        for (let i = 0; i < 2; i++) {
            for (let v = 1; v <= 9; v++) {
                newDeck.push({ color, type: 'number', value: v.toString() });
            }
            newDeck.push({ color, type: 'action', value: 'skip' });
            newDeck.push({ color, type: 'action', value: 'reverse' });
            newDeck.push({ color, type: 'action', value: 'draw2' });
        }
    }
    // Wild cards
    for (let i = 0; i < 4; i++) {
        newDeck.push({ color: 'wild', type: 'wild', value: 'wild' });
        newDeck.push({ color: 'wild', type: 'wild', value: 'draw4' });
    }
    return newDeck;
}

function shuffleDeck(deckToShuffle) {
    for (let i = deckToShuffle.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deckToShuffle[i], deckToShuffle[j]] = [deckToShuffle[j], deckToShuffle[i]];
    }
}

function getCardSymbol(card) {
    if (card.value === 'skip') return '⊘';
    if (card.value === 'reverse') return '⇄';
    if (card.value === 'draw2') return '+2';
    if (card.value === 'draw4') return '+4';
    if (card.value === 'wild') return 'W';
    return card.value;
}

function createCardElement(card, index, isPlayer) {
    const el = document.createElement('div');
    el.className = `card ${card.color === 'wild' ? 'wild-card' : card.color}`;
    
    const symbol = getCardSymbol(card);
    
    el.innerHTML = `
        <div class="card-inner">
            <span class="card-corner top-left">${symbol}</span>
            <span class="card-value">${symbol}</span>
            <span class="card-corner bottom-right">${symbol}</span>
        </div>
    `;

    el.style.zIndex = index;

    if (isPlayer) {
        if (!isPlayable(card) || currentPlayer !== 'player') {
            el.classList.add('disabled');
        } else {
            el.addEventListener('click', () => attemptPlayCard(index, 'player'));
        }
    }

    return el;
}

function renderHand(hand, container, isPlayer) {
    container.innerHTML = '';
    hand.forEach((card, index) => {
        if (!isPlayer) {
            // Render back of card for computer
            const el = document.createElement('div');
            el.className = 'card back';
            el.innerHTML = `<div class="card-inner"><span class="uno-text">UNO</span></div>`;
            
            el.style.zIndex = index;
            
            container.appendChild(el);
        } else {
            container.appendChild(createCardElement(card, index, true));
        }
    });
}

function renderDiscardPile() {
    discardPileEl.innerHTML = '';
    // Show only top 3 cards for performance and visual effect
    const startIdx = Math.max(0, discardPile.length - 3);
    for (let i = startIdx; i < discardPile.length; i++) {
        const card = discardPile[i];
        const el = document.createElement('div');
        el.className = `card ${card.color === 'wild' ? 'wild-card' : card.color}`;
        const symbol = getCardSymbol(card);
        el.innerHTML = `
            <div class="card-inner">
                <span class="card-corner top-left">${symbol}</span>
                <span class="card-value">${symbol}</span>
                <span class="card-corner bottom-right">${symbol}</span>
            </div>
        `;
        
        // Random slight rotation for discarded cards
        const rot = (Math.random() * 20 - 10);
        el.style.transform = `rotate(${rot}deg)`;
        el.style.position = 'absolute';
        
        if (i === discardPile.length - 1) {
            el.classList.add('card-animate');
            el.style.setProperty('--rot', `${rot}deg`);
        }
        
        discardPileEl.appendChild(el);
    }
}

function updateUI() {
    renderHand(playerHand, playerHandEl, true);
    renderHand(computerHand, computerHandEl, false);
    renderDiscardPile();
    
    computerCardCountEl.innerText = `Cards: ${computerHand.length}`;
    
    colorIndicatorEl.className = `color-indicator ${currentColor}`;
    colorIndicatorEl.style.backgroundColor = `var(--${currentColor})`;
    
    if (bgGlow) {
        bgGlow.className = `glow-${currentColor}`;
    }
    
    // Update UNO button state
    if (currentPlayer === 'player' && playerHand.length === 2 && isPlayableAny(playerHand)) {
        // Can call UNO before playing the 2nd to last card
        unoBtn.classList.remove('disabled');
    } else if (playerHand.length === 1 && !playerCalledUno) {
        unoBtn.classList.remove('disabled');
    } else {
        unoBtn.classList.add('disabled');
    }
}

function updateTurnIndicator() {
    if (currentPlayer === 'player') {
        turnIndicatorEl.innerText = "Your Turn!";
        turnIndicatorEl.style.color = "#4CAF50";
    } else {
        turnIndicatorEl.innerText = "Computer's Turn...";
        turnIndicatorEl.style.color = "#FF9800";
    }
}

function playAudio(audioEl) {
    if (isSfxPlaying) {
        audioEl.currentTime = 0;
        audioEl.volume = 0.5;
        audioEl.play().catch(e => console.log('Audio play failed:', e));
    }
}

function isPlayable(card) {
    const topCard = discardPile[discardPile.length - 1];
    
    if (card.color === 'wild') return true;
    if (card.color === currentColor) return true;
    if (card.value === topCard.value) return true;
    
    return false;
}

function isPlayableAny(hand) {
    return hand.some(card => isPlayable(card));
}

function drawCard(player, count = 1) {
    for (let i = 0; i < count; i++) {
        if (deck.length === 0) {
            // Reshuffle discard pile
            const topCard = discardPile.pop();
            deck = discardPile;
            shuffleDeck(deck);
            discardPile = [topCard];
            
            if (deck.length === 0) break; // still empty?
        }
        
        const card = deck.pop();
        if (player === 'player') {
            playerHand.push(card);
            playerCalledUno = false;
        } else {
            computerHand.push(card);
            computerCalledUno = false;
        }
    }
    playAudio(cardDrawSound);
    updateUI();
}

function attemptPlayCard(index, player) {
    if (currentPlayer !== player) return;
    
    const hand = player === 'player' ? playerHand : computerHand;
    const card = hand[index];
    
    if (!isPlayable(card)) return;
    
    // Play the card
    hand.splice(index, 1);
    discardPile.push(card);
    playAudio(cardPlaySound);
    
    if (card.color === 'wild') {
        if (player === 'player') {
            pendingWildCard = card;
            colorPickerModal.classList.remove('hidden');
            return; // Wait for color selection
        } else {
            // Computer picks a color (most common color in its hand)
            currentColor = chooseComputerColor();
            handleCardEffect(card, player);
            return;
        }
    } else {
        currentColor = card.color;
        handleCardEffect(card, player);
    }
}

function chooseComputerColor() {
    const counts = { red: 0, blue: 0, green: 0, yellow: 0 };
    computerHand.forEach(c => {
        if (c.color !== 'wild') counts[c.color]++;
    });
    let max = -1;
    let bestColor = 'red';
    for (const [color, count] of Object.entries(counts)) {
        if (count > max) {
            max = count;
            bestColor = color;
        }
    }
    return bestColor;
}

function handleCardEffect(card, player) {
    let nextPlayer = player === 'player' ? 'computer' : 'player';
    let skipNext = false;
    
    if (['skip', 'reverse', 'draw2', 'draw4', 'wild'].includes(card.value)) {
        document.body.classList.remove('shake');
        void document.body.offsetWidth;
        document.body.classList.add('shake');
    }
    
    if (card.value === 'skip' || card.value === 'reverse') {
        // In 2 player game, reverse acts exactly like skip
        skipNext = true;
    } else if (card.value === 'draw2') {
        drawCard(nextPlayer, 2);
        skipNext = true;
    } else if (card.value === 'draw4') {
        drawCard(nextPlayer, 4);
        skipNext = true;
    }
    
    checkWinCondition();
    
    if (!skipNext) {
        currentPlayer = nextPlayer;
    }
    
    updateUI();
    updateTurnIndicator();
    
    if (currentPlayer === 'computer' && computerHand.length > 0) {
        setTimeout(computerTurn, 1500);
    }
}

// Color picker buttons
document.querySelectorAll('.color-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        currentColor = e.target.getAttribute('data-color');
        colorPickerModal.classList.add('hidden');
        handleCardEffect(pendingWildCard, 'player');
    });
});

function computerTurn() {
    if (currentPlayer !== 'computer') return;
    
    // Check if forgot to call UNO logic (simulate 10% chance)
    if (computerHand.length === 1 && Math.random() > 0.1) {
        computerCalledUno = true;
        // visual indication could be added here
    }
    
    // Find playable cards
    const playableIndices = [];
    computerHand.forEach((card, index) => {
        if (isPlayable(card)) playableIndices.push(index);
    });
    
    if (playableIndices.length > 0) {
        // Pick a card (prefer non-wilds if possible)
        let chosenIndex = playableIndices[0];
        for (let idx of playableIndices) {
            if (computerHand[idx].color !== 'wild') {
                chosenIndex = idx;
                break;
            }
        }
        attemptPlayCard(chosenIndex, 'computer');
    } else {
        // Draw a card
        drawCard('computer', 1);
        
        // If the drawn card is playable, play it (optional rule, let's keep it simple and just end turn)
        currentPlayer = 'player';
        updateUI();
        updateTurnIndicator();
    }
}

function fireConfetti() {
    confettiCanvas.width = window.innerWidth;
    confettiCanvas.height = window.innerHeight;
    confettiParticles = [];
    const colors = ['#ff5555', '#5555ff', '#55aa55', '#ffaa00'];
    for (let i = 0; i < 150; i++) {
        confettiParticles.push({
            x: Math.random() * confettiCanvas.width,
            y: Math.random() * confettiCanvas.height - confettiCanvas.height,
            w: Math.random() * 10 + 5,
            h: Math.random() * 10 + 5,
            dx: Math.random() * 4 - 2,
            dy: Math.random() * 5 + 2,
            rot: Math.random() * 360,
            color: colors[Math.floor(Math.random() * colors.length)]
        });
    }
    
    function render() {
        ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
        confettiParticles.forEach(p => {
            p.y += p.dy;
            p.x += p.dx;
            p.rot += p.dx * 2;
            if (p.y > confettiCanvas.height) {
                p.y = -20;
                p.x = Math.random() * confettiCanvas.width;
            }
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rot * Math.PI / 180);
            ctx.fillStyle = p.color;
            ctx.fillRect(-p.w/2, -p.h/2, p.w, p.h);
            ctx.restore();
        });
        confettiAnimationId = requestAnimationFrame(render);
    }
    render();
}

function checkWinCondition() {
    if (playerHand.length === 0) {
        gameOverTitle.innerText = "You Win!";
        gameOverTitle.style.color = "#4CAF50";
        gameOverMessage.innerText = "Congratulations, you beat the computer.";
        gameOverModal.classList.remove('hidden');
        currentPlayer = null; // stop game
        playAudio(winSound);
        fireConfetti();
    } else if (computerHand.length === 0) {
        gameOverTitle.innerText = "You Lose!";
        gameOverTitle.style.color = "#F44336";
        gameOverMessage.innerText = "The computer played all its cards.";
        gameOverModal.classList.remove('hidden');
        currentPlayer = null; // stop game
        playAudio(lossSound);
    }
    
    // Penalize if 1 card left and didn't call UNO (simplified: player must call BEFORE playing 2nd to last, or immediately after if computer catches)
    // For simplicity, we just rely on the button state.
}

drawPileEl.addEventListener('click', () => {
    if (currentPlayer === 'player') {
        drawCard('player', 1);
        currentPlayer = 'computer';
        updateUI();
        updateTurnIndicator();
        setTimeout(computerTurn, 1500);
    }
});

unoBtn.addEventListener('click', () => {
    if (!unoBtn.classList.contains('disabled')) {
        playerCalledUno = true;
        unoBtn.classList.add('disabled');
        unoBtn.innerText = "CALLED!";
        setTimeout(() => unoBtn.innerText = "UNO!", 2000);
    }
});

restartBtn.addEventListener('click', () => {
    initGame();
});

sfxToggle.addEventListener('click', () => {
    if (isSfxPlaying) {
        sfxToggle.innerText = "🔇 SFX";
        isSfxPlaying = false;
    } else {
        sfxToggle.innerText = "🔊 SFX";
        isSfxPlaying = true;
        playAudio(cardPlaySound);
    }
});

startGameBtn.addEventListener('click', () => {
    const name = playerNameInput.value.trim() || 'Player';
    playerNameDisplay.innerText = name;
    playerAvatar.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`;
    
    startScreenModal.classList.add('hidden');
    
    sfxToggle.innerText = "🔊 SFX";
    isSfxPlaying = true;
    
    initGame();
});

const internalMusicBtn = document.getElementById('internal-music-btn');
const musicDivider = document.getElementById('music-divider');

if (internalMusicBtn) {
    internalMusicBtn.addEventListener('click', () => {
        if (isMusicPlaying) {
            bgMusic.pause();
            internalMusicBtn.innerText = "▶️ Play Default (The Weeknd Vibe)";
            isMusicPlaying = false;
        } else {
            bgMusic.volume = 0.3;
            bgMusic.play().catch(e => console.log('Audio play failed:', e));
            internalMusicBtn.innerText = "⏸️ Pause Default Music";
            isMusicPlaying = true;
        }
    });
}

if (loadSpotifyBtn) {
    loadSpotifyBtn.addEventListener('click', () => {
        const url = spotifyInput.value.trim();
        if (url) {
            const regex = /spotify\.com\/(playlist|album|track)\/([a-zA-Z0-9]+)/;
            const match = url.match(regex);
            if (match) {
                const type = match[1];
                const id = match[2];
                spotifyIframeContainer.innerHTML = `<iframe style="border-radius:12px" src="https://open.spotify.com/embed/${type}/${id}?utm_source=generator&theme=0" width="100%" height="152" frameBorder="0" allowfullscreen="" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>`;
                spotifyIframeContainer.style.display = 'block';
                spotifyInput.style.display = 'none';
                loadSpotifyBtn.style.display = 'none';
                
                if (isMusicPlaying) {
                    bgMusic.pause();
                    isMusicPlaying = false;
                }
                if (internalMusicBtn) internalMusicBtn.style.display = 'none';
                if (musicDivider) musicDivider.style.display = 'none';
            } else {
                alert('Please enter a valid Spotify link!');
            }
        }
    });
}

function createParticles() {
    if (!particlesContainer) return;
    for(let i=0; i<40; i++) {
        const p = document.createElement('div');
        p.className = 'particle';
        p.style.left = Math.random() * 100 + 'vw';
        p.style.animationDuration = (Math.random() * 4 + 3) + 's';
        p.style.animationDelay = (Math.random() * 5) + 's';
        p.style.width = (Math.random() * 6 + 2) + 'px';
        p.style.height = p.style.width;
        particlesContainer.appendChild(p);
    }
}
createParticles();
