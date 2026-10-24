// === 1. DOM要素とキャンバス初期化 ===
const canvas = document.getElementById("gameCanvas"), ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score"), uiEl = document.getElementById("ui");
const topScreenEl = document.getElementById("topScreen"), startBtn = document.getElementById("startBtn");
const audioInitScreen = document.getElementById("audioInitScreen"), audioInitBtn = document.getElementById("audioInitBtn");

function resizeCanvas() {
    const tw = Math.min(window.innerWidth, 800), th = Math.min(window.innerHeight, 450);
    canvas.width = tw; canvas.height = th; topScreenEl.style.width = tw + "px"; topScreenEl.style.height = th + "px";
}
resizeCanvas(); window.addEventListener("resize", resizeCanvas);

// ゲーム状態管理用の変数
let gameState = "TITLE", score = 0, gameSpeed = 5;
const player = { x: 100, y: 200, width: 60, height: 60, vy: 0, gravity: 0.6, jumpPower: -12, isGrounded: false, jumpCount: 0, img: new Image() };
player.img.src = "player.png";

// 音源のアセット
const titleBgm = new Audio("title_bgm.mp3"); titleBgm.loop = true;
const gameBgm = new Audio("game_bgm.mp3"); gameBgm.loop = true;
const jumpSe = new Audio("jump_se.mp3"), gameoverSe = new Audio("gameover_se.mp3"), coinSe = new Audio("coin_se.mp3");

// 画像のアセット
const coinImg = new Image(); coinImg.src = "coin.png";
const enemyImgs = [new Image(), new Image(), new Image(), new Image()];
enemyImgs[0].src = "enemy1.png"; enemyImgs[1].src = "enemy2.png"; enemyImgs[2].src = "enemy3.png"; enemyImgs[3].src = "enemy4.png";

let platforms = [], coins = [], enemies = [], clouds = [];

// 演出用の雲の初期化
function initClouds() { clouds = []; for(let i=0; i<4; i++) clouds.push({ x: Math.random()*canvas.width, y: Math.random()*100 + 30, speed: Math.random()*0.5 + 0.2, size: Math.random()*30 + 40 }); }

// ステージの初期化
function initPlatforms() { platforms = [{ x: 0, y: canvas.height - 100, width: 400, height: 100 }]; coins = []; enemies = []; initClouds(); }

// 最初のオーディオ有効化ボタンを押した時の処理
if (audioInitBtn) {
    audioInitBtn.addEventListener("click", () => { audioInitScreen.style.display = "none"; goToTitle(); loop(); });
} else {
    // もしHTMLにaudioInitScreenがない場合はそのままタイトルへ移行してループを開始
    window.addEventListener("load", () => { goToTitle(); loop(); });
}

// ゲーム開始処理
function startGame() { topScreenEl.style.display = "none"; uiEl.style.display = "block"; try { titleBgm.pause(); titleBgm.currentTime = 0; gameBgm.play().catch(e => {}); } catch(e){} resetGame(); }
startBtn.addEventListener("click", (e) => { e.stopPropagation(); startGame(); });
startBtn.addEventListener("touchstart", (e) => { e.stopPropagation(); startGame(); });

// 操作入力処理（2段ジャンプ対応）
function handleInput() {
    if (gameState === "PLAYING" && (player.isGrounded || player.jumpCount < 2)) { player.vy = player.jumpPower; player.isGrounded = false; player.jumpCount++; try { jumpSe.currentTime = 0; jumpSe.play().catch(e => {}); } catch(e){} }
    else if (gameState === "GAMEOVER") goToTitle();
}
window.addEventListener("keydown", (e) => { if (e.code === "Space" || e.code === "ArrowUp") handleInput(); });
window.addEventListener("touchstart", (e) => { if (gameState !== "TITLE") { e.preventDefault(); handleInput(); } }, { passive: false });
window.addEventListener("mousedown", () => { if (gameState !== "TITLE") handleInput(); });

// 地形・コイン・敵の自動生成
function generatePlatform() {
    if (!platforms.length) return;
    const last = platforms[platforms.length - 1];
    const gap = Math.random() * 100 + 120, width = Math.random() * 150 + 150, y = Math.random() * 130 + canvas.height - 180;
    const newPlat = { x: last.x + last.width + gap, y: y, width: width, height: canvas.height - y };
    platforms.push(newPlat);
    if (Math.random() < 0.3) coins.push({ x: newPlat.x + newPlat.width / 2 - 15, y: newPlat.y - 40, width: 30, height: 30, alive: true });
    if (Math.random() < 0.2) {
        let type = Math.floor(Math.random() * 4); if (score < 100 && type === 3) type = 0;
        let ey = newPlat.y - 40, ew = 40, eh = 40;
        if (type === 1) ey = newPlat.y - 80; if (type === 3) { ew = 65; eh = 65; ey = newPlat.y - 65; }
        enemies.push({ type: type, x: newPlat.x + newPlat.width / 2 - ew / 2, y: ey, baseY: ey, width: ew, height: eh, angle: 0, triggered: false });
    }
}

// タイトル画面へ戻る処理
function goToTitle() { gameState = "TITLE"; document.getElementById("gameTitle").textContent = "イガ走"; startBtn.textContent = "走れ!!"; uiEl.style.display = "none"; topScreenEl.style.display = "flex"; try { gameBgm.pause(); gameBgm.currentTime = 0; titleBgm.play().catch(e => {}); } catch(e){} initPlatforms(); }

// ゲームのリセット処理
function resetGame() { score = 0; gameSpeed = 5; player.x = 100; player.y = 200; player.vy = 0; player.isGrounded = false; player.jumpCount = 0; initPlatforms(); gameState = "PLAYING"; }

// 衝突判定の共通関数
function isColliding(r1, r2) { return r1.x < r2.x + r2.width && r1.x + r1.width > r2.x && r1.y < r2.y + r2.height && r1.y + r1.height > r2.y; }

// ゲームオーバー処理（Firebaseへ送信していたアラートやプロンプトを削除）
function triggerGameOver() { 
    gameState = "GAMEOVER"; 
    uiEl.style.display = "none"; 
    try { 
        gameBgm.pause(); 
        gameoverSe.currentTime = 0; 
        gameoverSe.play().catch(e => {}); 
    } catch(e){} 
}

// 物理計算と状態の更新
function update() {
    clouds.forEach(c => { c.x -= c.speed; if(c.x + c.size * 2 < 0) { c.x = canvas.width; c.y = Math.random()*100 + 30; } });
    if (gameState !== "PLAYING") return;
    score += 0.1; scoreEl.innerText = Math.floor(score); gameSpeed = 5 + Math.floor(score / 50);
    player.vy += player.gravity; player.y += player.vy;
    let onPlatform = false;
    if (platforms.length > 0 && platforms[0].x + platforms[0].width < 0) platforms.shift();
    while (platforms.length < 5) generatePlatform();
    platforms.forEach(plat => { plat.x -= gameSpeed; if (player.x < plat.x + plat.width && player.x + player.width > plat.x && player.y + player.height >= plat.y && player.y + player.height - player.vy <= plat.y + 12) { player.y = plat.y - player.height; player.vy = 0; onPlatform = true; player.jumpCount = 0; } });
    player.isGrounded = onPlatform;
    coins.forEach(coin => { coin.x -= gameSpeed; if (coin.alive && isColliding(player, coin)) { coin.alive = false; score += 15; try { coinSe.currentTime = 0; coinSe.play().catch(e => {}); } catch(e){} } });
    coins = coins.filter(c => c.x + c.width > 0);
    enemies.forEach(enemy => { enemy.x -= gameSpeed; if (enemy.type === 1) { enemy.angle += 0.04; enemy.y = enemy.baseY + Math.sin(enemy.angle) * 25; } else if (enemy.type === 2) { if (!enemy.triggered && enemy.x - player.x < 250) enemy.triggered = true; if (enemy.triggered) enemy.x -= 1.5; } if (isColliding(player, enemy)) triggerGameOver(); });
    enemies = enemies.filter(e => e.x + e.width > 0);
    if (player.y > canvas.height) triggerGameOver();
}

// ゲーム画面の描画
function draw() {
    ctx.fillStyle = "#87CEEB"; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
    clouds.forEach(c => { ctx.beginPath(); ctx.arc(c.x, c.y, c.size * 0.4, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(c.x + c.size * 0.3, c.y - c.size * 0.1, c.size * 0.5, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(c.x + c.size * 0.6, c.y, c.size * 0.4, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(c.x, c.y - c.size * 0.1, c.size * 0.6, c.size * 0.4); });
    ctx.fillStyle = "#2ed573"; platforms.forEach(plat => { ctx.fillRect(plat.x, plat.y, plat.width, plat.height); ctx.fillStyle = "#8B4513"; ctx.fillRect(plat.x, plat.y + 15, plat.width, plat.height - 15); ctx.fillStyle = "#2ed573"; });
    if (gameState !== "TITLE") { 
        coins.forEach(coin => { 
            if (coin.alive) {
                if (coinImg.complete && coinImg.naturalWidth !== 0) ctx.drawImage(coinImg, coin.x, coin.y, coin.width, coin.height);
                else { ctx.fillStyle = "#ffd32a"; ctx.beginPath(); ctx.arc(coin.x + 15, coin.y + 15, 12, 0, Math.PI * 2); ctx.fill(); }
            }
        }); 
        enemies.forEach(enemy => { 
            const img = enemyImgs[enemy.type];
            if (img && img.complete && img.naturalWidth !== 0) ctx.drawImage(img, enemy.x, enemy.y, enemy.width, enemy.height);
            else { ctx.fillStyle = enemy.type === 3 ? "#f15bb5" : "#ff4d4d"; ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height); }
        }); 
        if (player.img.complete && player.img.naturalWidth !== 0) ctx.drawImage(player.img, player.x, player.y, player.width, player.height);
        else { ctx.fillStyle = "#ff4757"; ctx.fillRect(player.x, player.y, player.width, player.height); }
    }
    
    // ゲームオーバー画面（オンラインランキングのテキスト表示を廃止し、今回のスコアのみすっきり表示）
    if (gameState === "GAMEOVER") {
        ctx.fillStyle = "rgba(0, 0, 0, 0.75)"; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#ff4757"; ctx.font = "bold 32px sans-serif"; ctx.textAlign = "center"; ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2 - 30);
        ctx.fillStyle = "white"; ctx.font = "bold 22px sans-serif"; ctx.fillText(`今回のスコア: ${Math.floor(score)}m`, canvas.width / 2, canvas.height / 2 + 20);
        ctx.fillStyle = "#fffa65"; ctx.font = "bold 16px sans-serif"; ctx.textAlign = "center"; ctx.fillText("画面をタップ / クリックでタイトルへ", canvas.width / 2, canvas.height - 40);
    }
}

// ゲームの無限ループ処理
function loop() { update(); draw(); requestAnimationFrame(loop); }
