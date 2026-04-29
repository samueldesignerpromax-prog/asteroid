// Configuração do Canvas
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Dimensões do jogo
const WIDTH = 900;
const HEIGHT = 600;

// Estado do jogo
let gameRunning = true;
let score = 0;
let frame = 0;

// Nave
const ship = {
    x: WIDTH / 2,
    y: HEIGHT / 2,
    angle: -Math.PI / 2, // Apontando para cima
    velocity: { x: 0, y: 0 },
    rotationSpeed: 0.1,
    acceleration: 0.2,
    friction: 0.98,
    radius: 15
};

// Asteroides
let asteroids = [];
const ASTEROID_COUNT = 6;
let ASTEROID_BASE_SPEED = 1.5;

// Teclas pressionadas
const keys = {
    ArrowLeft: false,
    ArrowRight: false,
    ArrowUp: false
};

// Controle de throttle para aceleração
let thrusting = false;

// Inicialização
function init() {
    gameRunning = true;
    score = 0;
    updateScoreDisplay();
    
    // Reset nave
    ship.x = WIDTH / 2;
    ship.y = HEIGHT / 2;
    ship.angle = -Math.PI / 2;
    ship.velocity = { x: 0, y: 0 };
    
    // Reset velocidade base
    ASTEROID_BASE_SPEED = 1.5;
    
    // Criar asteroides
    asteroids = [];
    for (let i = 0; i < ASTEROID_COUNT; i++) {
        createAsteroid();
    }
    
    // Reset frame
    frame = 0;
    
    // Limpar partículas
    particles = [];
    
    // Esconder modal
    const modal = document.getElementById('gameOverModal');
    if (modal) {
        modal.style.display = 'none';
    }
    
    // Carregar ranking
    loadRanking();
}

// Criar um novo asteroide
function createAsteroid() {
    const size = 25 + Math.random() * 15;
    asteroids.push({
        x: Math.random() * WIDTH,
        y: -size,
        radius: size,
        speed: ASTEROID_BASE_SPEED + Math.random() * 2,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.05
    });
}

// Atualizar pontuação na tela
function updateScoreDisplay() {
    const scoreElement = document.getElementById('score');
    if (scoreElement) {
        scoreElement.textContent = Math.floor(score);
    }
}

// Atualizar ranking
async function loadRanking() {
    try {
        const response = await fetch('/score');
        if (!response.ok) throw new Error('Erro ao carregar ranking');
        
        const ranking = await response.json();
        
        const rankingList = document.getElementById('rankingList');
        if (!rankingList) return;
        
        if (ranking.length === 0) {
            rankingList.innerHTML = '<div class="ranking-placeholder">Sem pontuações ainda</div>';
            return;
        }
        
        rankingList.innerHTML = ranking.map(item => `
            <div class="ranking-item">
                <span>${item.position}º ${escapeHtml(item.playerName)}</span>
                <span>${item.score}</span>
            </div>
        `).join('');
    } catch (error) {
        console.error('Erro ao carregar ranking:', error);
        const rankingList = document.getElementById('rankingList');
        if (rankingList) {
            rankingList.innerHTML = '<div class="ranking-placeholder">Erro ao carregar</div>';
        }
    }
}

// Função auxiliar para escapar HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Salvar pontuação
async function saveScore(playerName, finalScore) {
    try {
        const response = await fetch('/score', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                playerName: playerName,
                score: Math.floor(finalScore)
            })
        });
        
        if (response.ok) {
            await loadRanking();
        } else {
            console.error('Erro ao salvar pontuação');
        }
    } catch (error) {
        console.error('Erro ao salvar pontuação:', error);
    }
}

// Game Over
function gameOver() {
    if (!gameRunning) return;
    
    gameRunning = false;
    const finalScore = Math.floor(score);
    const finalScoreElement = document.getElementById('finalScore');
    if (finalScoreElement) {
        finalScoreElement.textContent = finalScore;
    }
    
    const modal = document.getElementById('gameOverModal');
    if (modal) {
        modal.style.display = 'flex';
    }
    
    // Função para salvar e reiniciar
    const saveScoreAndRestart = () => {
        const playerNameInput = document.getElementById('playerName');
        const playerName = playerNameInput ? playerNameInput.value.trim() : '';
        
        if (playerName) {
            saveScore(playerName, finalScore);
        }
        
        // Remover event listeners para evitar duplicação
        const restartBtn = document.getElementById('restartBtn');
        if (restartBtn) {
            restartBtn.removeEventListener('click', saveScoreAndRestart);
        }
        
        const nameInput = document.getElementById('playerName');
        if (nameInput) {
            nameInput.removeEventListener('keypress', onEnterPress);
        }
        
        init();
    };
    
    const onEnterPress = (e) => {
        if (e.key === 'Enter') {
            saveScoreAndRestart();
        }
    };
    
    const restartBtn = document.getElementById('restartBtn');
    if (restartBtn) {
        restartBtn.removeEventListener('click', saveScoreAndRestart);
        restartBtn.addEventListener('click', saveScoreAndRestart);
    }
    
    const playerNameInput = document.getElementById('playerName');
    if (playerNameInput) {
        playerNameInput.removeEventListener('keypress', onEnterPress);
        playerNameInput.addEventListener('keypress', onEnterPress);
        // Focar no input automaticamente
        playerNameInput.focus();
    }
}

// Colisão entre nave e asteroide
function checkCollision() {
    for (let i = 0; i < asteroids.length; i++) {
        const a = asteroids[i];
        const dx = ship.x - a.x;
        const dy = ship.y - a.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < ship.radius + a.radius) {
            gameOver();
            return true;
        }
    }
    return false;
}

// Atualizar lógica do jogo
function update() {
    if (!gameRunning) return;
    
    // Movimento da nave - rotação
    if (keys.ArrowLeft) {
        ship.angle -= ship.rotationSpeed;
    }
    if (keys.ArrowRight) {
        ship.angle += ship.rotationSpeed;
    }
    
    // Aceleração
    if (keys.ArrowUp) {
        ship.velocity.x += Math.cos(ship.angle) * ship.acceleration;
        ship.velocity.y += Math.sin(ship.angle) * ship.acceleration;
        thrusting = true;
    } else {
        thrusting = false;
    }
    
    // Aplicar atrito
    ship.velocity.x *= ship.friction;
    ship.velocity.y *= ship.friction;
    
    // Limitar velocidade máxima
    const maxSpeed = 8;
    if (Math.abs(ship.velocity.x) > maxSpeed) ship.velocity.x = Math.sign(ship.velocity.x) * maxSpeed;
    if (Math.abs(ship.velocity.y) > maxSpeed) ship.velocity.y = Math.sign(ship.velocity.y) * maxSpeed;
    
    // Atualizar posição
    ship.x += ship.velocity.x;
    ship.y += ship.velocity.y;
    
    // Wrapping (teleporte nas bordas)
    if (ship.x < 0) ship.x = WIDTH;
    if (ship.x > WIDTH) ship.x = 0;
    if (ship.y < 0) ship.y = HEIGHT;
    if (ship.y > HEIGHT) ship.y = 0;
    
    // Atualizar asteroides
    for (let i = 0; i < asteroids.length; i++) {
        const a = asteroids[i];
        a.y += a.speed;
        a.rotation += a.rotationSpeed;
        
        // Resetar asteroides que saíram da tela
        if (a.y - a.radius > HEIGHT) {
            asteroids[i] = {
                x: Math.random() * WIDTH,
                y: -a.radius,
                radius: a.radius,
                speed: ASTEROID_BASE_SPEED + Math.random() * 2,
                rotation: Math.random() * Math.PI * 2,
                rotationSpeed: (Math.random() - 0.5) * 0.05
            };
            // Pontuação extra por sobreviver a um asteroide
            score += 5;
        }
    }
    
    // Aumentar pontuação baseada no tempo
    score += 0.2;
    updateScoreDisplay();
    
    // Verificar colisão
    checkCollision();
    
    // Aumentar dificuldade gradualmente
    frame++;
    if (frame % 900 === 0) { // A cada ~15 segundos (60fps)
        ASTEROID_BASE_SPEED = Math.min(5, ASTEROID_BASE_SPEED + 0.3);
        // Aumentar velocidade de todos os asteroides existentes
        for (let a of asteroids) {
            a.speed = ASTEROID_BASE_SPEED + (Math.random() * 2);
        }
    }
}

// Desenhar nave
function drawShip() {
    ctx.save();
    ctx.translate(ship.x, ship.y);
    ctx.rotate(ship.angle);
    
    // Desenhar nave triangular
    ctx.beginPath();
    ctx.moveTo(15, 0);
    ctx.lineTo(-10, -8);
    ctx.lineTo(-5, 0);
    ctx.lineTo(-10, 8);
    ctx.closePath();
    
    // Gradiente neon
    const gradient = ctx.createLinearGradient(-10, -8, 15, 0);
    gradient.addColorStop(0, '#00f3ff');
    gradient.addColorStop(1, '#bf00ff');
    ctx.fillStyle = gradient;
    ctx.fill();
    
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    
    // Brilho externo
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#00f3ff';
    ctx.fill();
    ctx.shadowBlur = 0;
    
    // Efeito de thrust (chama)
    if (thrusting) {
        ctx.beginPath();
        ctx.moveTo(-8, 0);
        ctx.lineTo(-16, -5);
        ctx.lineTo(-16, 5);
        ctx.fillStyle = '#ff6600';
        ctx.fill();
        
        // Chama neon
        ctx.beginPath();
        ctx.moveTo(-12, 0);
        ctx.lineTo(-20, -3);
        ctx.lineTo(-20, 3);
        ctx.fillStyle = '#ffaa00';
        ctx.fill();
        
        // Chama interna
        ctx.beginPath();
        ctx.moveTo(-14, 0);
        ctx.lineTo(-18, -2);
        ctx.lineTo(-18, 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
    }
    
    ctx.restore();
}

// Desenhar asteroide com estilo neon
function drawAsteroid(a) {
    ctx.save();
    ctx.translate(a.x, a.y);
    ctx.rotate(a.rotation);
    
    // Desenhar asteroide irregular
    ctx.beginPath();
    const points = 8;
    for (let i = 0; i < points; i++) {
        const angle = (i / points) * Math.PI * 2;
        const radiusVariation = a.radius * (0.7 + Math.sin(angle * 3) * 0.15 + Math.cos(angle * 5) * 0.1);
        const x = Math.cos(angle) * radiusVariation;
        const y = Math.sin(angle) * radiusVariation;
        
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.closePath();
    
    // Gradiente roxo/ciano
    const gradient = ctx.createLinearGradient(-a.radius, -a.radius, a.radius, a.radius);
    gradient.addColorStop(0, '#8a2be2');
    gradient.addColorStop(0.6, '#4a0080');
    gradient.addColorStop(1, '#2a0040');
    ctx.fillStyle = gradient;
    ctx.fill();
    
    ctx.strokeStyle = '#00f3ff';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Brilho neon
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#bf00ff';
    ctx.stroke();
    ctx.shadowBlur = 0;
    
    // Detalhes/crateras
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const rad = a.radius * 0.4;
        const x = Math.cos(angle) * rad;
        const y = Math.sin(angle) * rad;
        ctx.moveTo(x, y);
        ctx.lineTo(x + 4, y + 3);
    }
    ctx.strokeStyle = '#00f3ff';
    ctx.lineWidth = 1;
    ctx.stroke();
    
    ctx.restore();
}

// Desenhar estrelas (efeito de fundo)
let stars = [];
function initStars() {
    stars = [];
    for (let i = 0; i < 200; i++) {
        stars.push({
            x: Math.random() * WIDTH,
            y: Math.random() * HEIGHT,
            size: Math.random() * 2 + 0.5,
            alpha: Math.random() * 0.5 + 0.3,
            twinkle: Math.random() * Math.PI * 2
        });
    }
}

function drawStars() {
    for (let star of stars) {
        const twinkleAlpha = star.alpha + Math.sin(Date.now() * 0.001 * star.twinkle) * 0.2;
        ctx.fillStyle = `rgba(255, 255, 255, ${Math.max(0.1, Math.min(0.8, twinkleAlpha))})`;
        ctx.fillRect(star.x, star.y, star.size, star.size);
    }
}

// Sistema de partículas
let particles = [];

function addParticle(x, y, color = '#00f3ff') {
    if (!gameRunning) return;
    particles.push({
        x: x,
        y: y,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        life: 1,
        size: Math.random() * 3 + 1,
        color: color
    });
}

function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.02;
        p.size *= 0.98;
        
        if (p.life <= 0 || p.size < 0.1) {
            particles.splice(i, 1);
        }
    }
}

function drawParticles() {
    for (let p of particles) {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life * 0.8;
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;
}

// Efeito de rastro da nave
function addTrail() {
    if (thrusting && gameRunning) {
        const trailX = ship.x - Math.cos(ship.angle) * 12;
        const trailY = ship.y - Math.sin(ship.angle) * 12;
        addParticle(trailX, trailY, '#00f3ff');
        
        // Adicionar partícula adicional para efeito mais intenso
        if (Math.random() > 0.5) {
            addParticle(trailX + (Math.random() - 0.5) * 5, 
                       trailY + (Math.random() - 0.5) * 5, 
                       '#ff6600');
        }
    }
}

// Renderização principal
function render() {
    // Limpar canvas com efeito de rastro suave
    ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    
    // Desenhar estrelas
    drawStars();
    
    // Desenhar grid neon sutil
    ctx.strokeStyle = 'rgba(0, 243, 255, 0.03)';
    ctx.lineWidth = 1;
    for (let i = 0; i < WIDTH; i += 50) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, HEIGHT);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i % HEIGHT);
        ctx.lineTo(WIDTH, i % HEIGHT);
        ctx.stroke();
    }
    
    // Desenhar asteroides
    for (let a of asteroids) {
        drawAsteroid(a);
    }
    
    // Desenhar partículas
    drawParticles();
    
    // Desenhar nave
    drawShip();
    
    // Adicionar rastro
    addTrail();
    updateParticles();
    
    // Desenhar efeito de mira/centro (opcional)
    ctx.beginPath();
    ctx.arc(ship.x, ship.y, ship.radius + 2, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(0, 243, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();
}

// Game Loop
let animationId = null;

function gameLoop() {
    update();
    render();
    animationId = requestAnimationFrame(gameLoop);
}

// Eventos de teclado
function handleKeyDown(e) {
    if (keys.hasOwnProperty(e.key)) {
        keys[e.key] = true;
        e.preventDefault();
    }
    // Prevenir espaço de rolar a página
    if (e.key === ' ') {
        e.preventDefault();
    }
}

function handleKeyUp(e) {
    if (keys.hasOwnProperty(e.key)) {
        keys[e.key] = false;
        e.preventDefault();
    }
}

// Prevenir scroll com setas e espaço
window.addEventListener('keydown', handleKeyDown);
window.addEventListener('keyup', handleKeyUp);

// Prevenir contexto de clique direito no canvas
canvas.addEventListener('contextmenu', (e) => e.preventDefault());

// Inicializar estrelas
initStars();

// Iniciar jogo
init();
gameLoop();

// Carregar ranking imediatamente
loadRanking();

// Refresh ranking a cada 10 segundos
setInterval(loadRanking, 10000);

// Adicionar evento para foco no canvas
canvas.addEventListener('click', () => {
    canvas.focus();
});

// Log de inicialização
console.log('Asteroids Neon Game Inicializado! 🚀');
