// === 1. DOM要素とキャンバス初期化 ===
const canvas = document.getElementById("gameCanvas"), ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score"), uiEl = document.getElementById("ui");
const topScreenEl = document.getElementById("topScreen"), startBtn = document.getElementById("startBtn");
const audioInitScreen = document.getElementById("audioInitScreen"), audioInitBtn = document.getElementById("audioInitBtn");
const gameTitleEl = document.getElementById("gameTitle");
const rankingListEl = document.getElementById("rankingList"); 
const rankingContainer = document.getElementById("rankingContainer");
const instructionContainer = document.getElementById("instructionContainer");

function resizeCanvas() {
    const tw = Math.min(window.innerWidth, 800), th = Math.min(window.innerHeight, 450);
    canvas.width = tw; canvas.height = th; 
    topScreenEl.style.width = tw + "px"; topScreenEl.style.height = th + "px";
    audioInitScreen.style.width = tw + "px"; audioInitScreen.style.height = th + "px";
}
resizeCanvas(); window.addEventListener("resize", resizeCanvas);

// ゲーム状態管理用の変数
let gameState = "BEFORE_LOAD", score = 0, gameSpeed = 5;
let localRanking = localStorage.getItem("igasou_ranking") ? JSON.parse(localStorage.getItem("igasou_ranking")) : [];

// プレイヤーオブジェクト
const player = { 
    x: 100, 
    y: 200, 
    width: 60, 
    height: 60, 
    vy: 0, 
    gravity: 0.6, 
    jumpPower: -12, 
    isGrounded: false, 
    jumpCount: 0, 
    img: new Image()
};
player.img.src = "player.png"; 

// 音源のアセット
const titleBgm = new Audio("title_bgm.mp3"); titleBgm.loop = true;
const gameBgm = new Audio("game_bgm.mp3"); gameBgm.loop = true;
const jumpSe = new Audio("jump_se.mp3"), gameoverSe = new Audio("gameover_se.mp3"), coinSe = new Audio("coin_se.mp3");

// 【コイン音対策】連続獲得音声プール
const coinAudioPool = [];
for (let i = 0; i < 5; i++) { coinAudioPool.push(new Audio("coin_se.mp3")); }
let poolIndex = 0;

// 画像のアセット
const coinImg = new Image(); coinImg.src = "coin.png";
const enemyImgs = [new Image(), new Image(), new Image(), new Image()];

enemyImgs[0].src = "enemy1.png"; 
enemyImgs[1].src = "enemy2.png"; 
enemyImgs[2].src = "enemy3.png"; 
enemyImgs[3].src = "enemy4.png";

let platforms = [], coins = [], enemies = [], clouds = [];
let spawnTimer = 0;

function initClouds() { clouds = []; for(let i=0; i<4; i++) clouds.push({ x: Math.random()*canvas.width, y: Math.random()*100 + 30, speed: Math.random()*0.5 + 0.2, size: Math.random()*30 + 40 }); }

function initPlatforms() { 
    platforms = [{ x: 0, y: canvas.height - 100, width: canvas.width + 100, height: 100 }]; 
    coins = []; 
    enemies = []; 
    initClouds(); 
}

function updateRankingUI() {
    rankingListEl.innerHTML = "";
    for (let i = 0; i < 10; i++) {
        const item = localRanking[i];
        const li = document.createElement("li");
        if (item) {
            li.innerHTML = `<span style="font-weight:bold; color:#fff;">${item.name}</span> - <span style="color:#ffeb3b;">${item.score}m</span>`;
        } else {
            li.innerHTML = `<span style="color:#666;">------</span>`;
        }
        rankingListEl.appendChild(li);
    }
}

// === 2. ゲーム制御関数 ===

function goToTitle() {
    gameState = "TITLE";
    topScreenEl.style.display = "flex";
    uiEl.style.display = "none";
    rankingContainer.style.display = "none"; 
    instructionContainer.style.display = "block"; 
    gameTitleEl.innerHTML = "イガ走";
    startBtn.textContent = "走れ!!";
    
    try {
        gameBgm.pause();
        gameBgm.currentTime = 0;
        titleBgm.play().catch(e => {});
    } catch(e){}
    resetGame();
}

function resetGame() {
    score = 0;
    gameSpeed = 5;
    spawnTimer = 0;
    player.x = 100;
    player.y = canvas.height - 200;
    player.vy = 0;
    player.jumpCount = 0;
    player.isGrounded = false;
    initPlatforms();
}

function gameOver() {
    gameState = "GAMEOVER";
    topScreenEl.style.display = "flex";
    rankingContainer.style.display = "block"; 
    instructionContainer.style.display = "none"; 
    
    const isRankIn = localRanking.length < 10 || score > localRanking[localRanking.length - 1].score;

    if (isRankIn) {
        gameTitleEl.innerHTML = `RANK IN!<br><span style="font-size: 32px; color: #ffeb3b; text-shadow: 2px 2px 0px #000;">${score}m</span>`;
        
        setTimeout(() => {
            let userName = prompt("🏆 ランクインしました！名前を入力してください（10文字まで）:", "ななしのランナー");
            if (userName === null || userName.trim() === "") userName = "ななし";
            userName = userName.substring(0, 10);

            localRanking.push({ name: userName, score: score });
            localRanking.sort((a, b) => b.score - a.score);
            localRanking = localRanking.slice(0, 10);
            localStorage.setItem("igasou_ranking", JSON.stringify(localRanking));

            updateRankingUI();
        }, 500);

    } else {
        gameTitleEl.innerHTML = `GAME OVER<br><span style="font-size: 24px; color: #fff; text-shadow: 1px 1px 0px #000;">SCORE: ${score}m</span>`;
    }
    
    updateRankingUI(); 
    startBtn.textContent = "タイトルに戻る";
    try {
        gameBgm.pause();
        gameoverSe.play().catch(e => {});
    } catch(e){}
}

audioInitBtn.addEventListener("click", () => {
    audioInitScreen.style.display = "none";
    goToTitle();
    requestAnimationFrame(loop);
});

window.addEventListener("load", () => {
    resizeCanvas();
    initPlatforms();
});
let btnCooldown = false;

function handleBtnAction() {
    if (btnCooldown) return;

    if (gameState === "TITLE") {
        topScreenEl.style.display = "none"; 
        uiEl.style.display = "block"; 
        try { 
            titleBgm.pause(); 
            titleBgm.currentTime = 0; 
            gameBgm.play().catch(e => {}); 
        } catch(e){} 
        resetGame();
        gameState = "PLAYING";
    } else if (gameState === "GAMEOVER") {
        btnCooldown = true;
        goToTitle();
        setTimeout(() => {
            btnCooldown = false;
        }, 300);
    }
}

startBtn.addEventListener("click", (e) => { e.stopPropagation(); handleBtnAction(); });
startBtn.addEventListener("touchstart", (e) => { e.stopPropagation(); handleBtnAction(); });

function handleInput() {
    if (gameState === "PLAYING" && (player.isGrounded || player.jumpCount < 2)) { 
        player.vy = player.jumpPower; 
        player.isGrounded = false; 
        player.jumpCount++; 
        try { 
            if (jumpSe.readyState >= 2) { jumpSe.currentTime = 0; }
            jumpSe.play().catch(e => {}); 
        } catch(e){} 
    }
}
window.addEventListener("keydown", (e) => { if (e.code === "Space" || e.code === "ArrowUp") handleInput(); });
window.addEventListener("touchstart", (e) => { if (gameState !== "TITLE" && gameState !== "BEFORE_LOAD") { e.preventDefault(); handleInput(); } }, { passive: false });
window.addEventListener("mousedown", () => { if (gameState !== "TITLE" && gameState !== "BEFORE_LOAD") handleInput(); });

function checkCollision(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
}

// === 3. メインループ・ランダム生成ロジック ===

function update() {
    if (gameState !== "PLAYING" && gameState !== "TITLE") return;

    spawnTimer++; 

    if (gameState === "PLAYING") {
        if (spawnTimer % 30 === 0) {
            score++;
            scoreEl.textContent = score;
            if (score > 0 && score % 150 === 0) gameSpeed += 0.5;
        }
    }

    player.vy += player.gravity;
    player.y += player.vy;

    if (player.y > canvas.height) {
        gameOver();
    }

    for (let cloud of clouds) {
        cloud.x -= cloud.speed;
        if (cloud.x + cloud.size < 0) cloud.x = canvas.width + Math.random() * 50;
    }

    player.isGrounded = false;

    for (let pf of platforms) {
        if (gameState === "PLAYING") pf.x -= gameSpeed;

        if (player.x + player.width > pf.x && player.x < pf.x + pf.width) {
            if (player.y + player.height >= pf.y && player.y + player.height - player.vy <= pf.y + 12) {
                player.y = pf.y - player.height;
                player.vy = 0;
                player.isGrounded = true;
                player.jumpCount = 0;
            }
        }
    }

    if (gameState === "PLAYING") {
        // 🛠️【バグ完全消去】 配列の [0] 番目（最古の足場）の座標を正しく見るように修正しました！
        if (platforms.length > 0 && platforms[0].x + platforms[0].width < 0) {
            platforms.shift();
        }

        let lastPf = platforms[platforms.length - 1];
        if (lastPf && lastPf.x + lastPf.width < canvas.width + 300) {
            const gap = Math.random() * 80 + 70; 
            const nextWidth = Math.random() * 200 + 200; 
            
            let nextY = lastPf.y + (Math.random() * 140 - 70);
            nextY = Math.max(canvas.height - 200, Math.min(canvas.height - 70, nextY));

            const newPf = { x: lastPf.x + lastPf.width + gap, y: nextY, width: nextWidth, height: 180 };
            platforms.push(newPf);

            if (Math.random() < 0.4) {
                const enemyType = Math.floor(Math.random() * enemyImgs.length);
                const enemySize = (enemyType === 3) ? 55 : 40;
                const spawnX = newPf.x + (Math.random() * (nextWidth - 100) + 50); 
                const spawnY = newPf.y - enemySize; 

                enemies.push({ 
                    x: spawnX, 
                    y: spawnY, 
                    baseY: spawnY, 
                    width: enemySize, 
                    height: enemySize, 
                    type: enemyType,
                    angle: 0,
                    relativeX: spawnX - newPf.x
                });
            }

            if (Math.random() < 0.5) {
                const coinX = newPf.x + (nextWidth / 2);
                const coinY = newPf.y - 70 - Math.random() * 40;
                coins.push({ x: coinX, y: coinY, width: 30, height: 30, active: true });
            }
        }

        for (let i = enemies.length - 1; i >= 0; i--) {
            const enemy = enemies[i];
            
            switch (enemy.type) {
                case 0:
                    enemy.x -= gameSpeed;
                    break;
                case 1:
                    enemy.x -= gameSpeed; 
                    enemy.angle += 0.05;
                    enemy.y = enemy.baseY - Math.sin(enemy.angle) * 30;
                    break;
                case 2:
                    enemy.x -= gameSpeed; 
                    const distance = enemy.x - player.x;
                    if (distance > 0 && distance < 250) {
                        enemy.x -= 2.5; 
                    }
                    break;
                case 3:
                    enemy.x -= gameSpeed; 
                    break;
            }

            if (checkCollision(player, enemy)) {
                gameOver();
            }
            if (enemy.x + enemy.width < 0) enemies.splice(i, 1);
        }

        for (let i = coins.length - 1; i >= 0; i--) {
            coins[i].x -= gameSpeed;
            if (coins[i].active && checkCollision(player, coins[i])) {
                coins[i].active = false;
                
                score += 10;
                scoreEl.textContent = score;

                try {
                    coinAudioPool[poolIndex].currentTime = 0;
                    coinAudioPool[poolIndex].play().catch(e => {});
                    poolIndex = (poolIndex + 1) % coinAudioPool.length;
                } catch(e){}
            }
            if (coins[i].x + coins[i].width < 0) coins.splice(i, 1);
        }
    }
}

function draw() {
    ctx.fillStyle = "#87CEEB";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let cloud of clouds) {
        ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
        ctx.beginPath();
        ctx.arc(cloud.x, cloud.y, cloud.size * 0.4, 0, Math.PI * 2);
        ctx.arc(cloud.x + cloud.size * 0.3, cloud.y - cloud.size * 0.1, cloud.size * 0.35, 0, Math.PI * 2);
        ctx.arc(cloud.x + cloud.size * 0.6, cloud.y, cloud.size * 0.3, 0, Math.PI * 2);
        ctx.fill();
    }

    for (let pf of platforms) {
        ctx.fillStyle = "#2ed573"; 
        ctx.fillRect(pf.x, pf.y, pf.width, 15);
        ctx.fillStyle = "#747d8c"; 
        ctx.fillRect(pf.x, pf.y + 15, pf.width, pf.height);
    }

    for (let coin of coins) {
        if (coin.active) ctx.drawImage(coinImg, coin.x, coin.y, coin.width, coin.height);
    }

    for (let enemy of enemies) {
        ctx.drawImage(enemyImgs[enemy.type], enemy.x, enemy.y, enemy.width, enemy.height);
    }

    if (gameState === "PLAYING") {
        ctx.drawImage(player.img, player.x, player.y, player.width, player.height);
    }
}

function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}
