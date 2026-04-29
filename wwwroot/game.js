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
const ASTEROID_BASE_SPEED = 1.5;

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
    
    // Criar asteroides
    asteroids = [];
    for (let i = 0; i < ASTEROID_COUNT; i++) {
        createAsteroid();
    }
    
    // Reset frame
    frame = 0;
    
    // Esconder modal
    document.getElementById('gameOverModal').style.display = 'none';
    
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
    document.getElementById('score').textContent = Math.floor(score);
}

// Atualizar ranking
async function loadRanking() {
    try {
        const response = await fetch('/score');
        const ranking = await response.json();
        
        const rankingList = document.getElementById('rankingList');
        if (ranking.length === 0) {
            rankingList.innerHTML = '<div class="ranking-placeholder">Sem pontuações ainda</div>';
            return;
        }
        
        rankingList.innerHTML = ranking.map(item => `
            <div class="ranking-item">
                <span>${item.position}º ${item.playerName}</span>
                <span>${item.score}</span>
            </div>
        `).join('');
    } catch (error) {
        console.error('Erro ao carregar ranking:', error);
        document.getElementById('rankingList').innerHTML = '<div class="ranking-placeholder">Erro ao carregar</div>';
    }
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
    document.getElementById('finalScore').textContent = finalScore;
    document.getElementById('gameOverModal').style.display = 'flex';
    
    // Tentar salvar se houver nome
    const saveScoreAndRestart = () => {
        const playerName = document.getElementById('playerName').value.trim();
        if (playerName) {
            saveScore(playerName, finalScore);
        }
        document.getElementById('restartBtn').removeEventListener('click', saveScoreAndRestart);
        document.getElementById('playerName').removeEventListener('keypress', onEnterPress);
        init();
        gameLoop();
    };
    
    const onEnterPress = (e) => {
        if (e.key === 'Enter') {
            saveScoreAndRestart();
        }
    };
    
    document.getElementById('restartBtn').removeEventListener('click', saveScoreAndRestart);
    document.getElementById('restartBtn').addEventListener('click', saveScoreAndRestart);
    document.getElementById('playerName').removeEventListener('keypress', onEnterPress);
    document.getElementById('playerName').addEventListener('keypress', onEnterPress);
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
        }
    }
    
    // Aumentar pontuação baseada no tempo
    score += 0.1;
    updateScoreDisplay();
    
    // Verificar colisão
    checkCollision();
    
    // Aumentar dificuldade gradualmente
    frame++;
    if (frame % 600 === 0 && ASTEROID_BASE_SPEED < 5) {
        // A cada 10 segundos aumenta a velocidade base (opcional)
        for (let a of asteroids) {
            a.speed += 0.2;
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
    
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    
    // Efeito de thrust (chama)
    if (thrusting) {
        ctx.beginPath();
        ctx.moveTo(-8, 0);
        ctx.lineTo(-15, -4);
        ctx.lineTo(-15, 4);
        ctx.fillStyle = '#ff6600';
        ctx.fill();
        
        // Chama neon
        ctx.beginPath();
        ctx.moveTo(-12, 0);
        ctx.lineTo(-18, -2);
        ctx.lineTo(-18, 2);
        ctx.fillStyle = '#ffaa00';
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
        const radiusVariation = a.radius * (0.7 + Math.sin(angle * 3) * 0.15);
        const x = Math.cos(angle) * radiusVariation;
        const y = Math.sin(angle) * radiusVariation;
        
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.closePath();
    
    // Gradiente roxo/ciano
    const gradient = ctx.createLinearGradient(-a.radius, -a.radius, a.radius, a.radius);
    gradient.addColorStop(0, '#8a2be2');
    gradient.addColorStop(1, '#4a0080');
    ctx.fillStyle = gradient;
    ctx.fill();
    
    ctx.strokeStyle = '#00f3ff';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Detalhes
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
        const angle = Math.random() * Math.PI * 2;
        const rad = a.radius * 0.3;
        const x = Math.cos(angle) * rad;
        const y = Math.sin(angle) * rad;
        ctx.moveTo(x, y);
        ctx.lineTo(x + 3, y + 3);
    }
    ctx.stroke();
    
    ctx.restore();
}

// Desenhar estrelas (efeito de fundo)
const stars = [];
for (let i = 0; i < 200; i++) {
    stars.push({
        x: Math.random() * WIDTH,
        y: Math.random() * HEIGHT,
        size: Math.random() * 2,
        alpha: Math.random() * 0.5 + 0.3
    });
}

function drawStars() {
    for (let star of stars) {
        ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha})`;
        ctx.fillRect(star.x, star.y, star.size, star.size);
    }
}

// Desenhar efeito de partículas (rastro)
let particles = [];
function addParticle(x, y) {
    if (!gameRunning) return;
    particles.push({
        x: x,
        y: y,
        life: 1,
        size: 2
    });
}

function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].life -= 0.03;
        particles[i].size *= 0.98;
        if (particles[i].life <= 0) {
            particles.splice(i, 1);
        }
    }
}

function drawParticles() {
    for (let p of particles) {
        ctx.fillStyle = `rgba(0, 243, 255, ${p.life * 0.8})`;
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
}

// Efeito de rastro da nave
function addTrail() {
    if (thrusting && gameRunning) {
        addParticle(ship.x - Math.cos(ship.angle) * 10, ship.y - Math.sin(ship.angle) * 10);
    }
}

// Renderização principal
function render() {
    // Limpar canvas com efeito de rastro suave
    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    
    // Desenhar estrelas
    drawStars();
    
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
    
    // Efeito de grid neon
    ctx.strokeStyle = 'rgba(0, 243, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i < WIDTH; i += 50) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, HEIGHT);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(WIDTH, i);
        ctx.stroke();
    }
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
}

function handleKeyUp(e) {
    if (keys.hasOwnProperty(e.key)) {
        keys[e.key] = false;
        e.preventDefault();
    }
}

// Prevenir scroll com setas
window.addEventListener('keydown', handleKeyDown);
window.addEventListener('keyup', handleKeyUp);

// Iniciar jogo
init();
gameLoop();

// Carregar ranking imediatamente
loadRanking();

// Refresh ranking a cada 10 segundos
setInterval(loadRanking, 10000);
