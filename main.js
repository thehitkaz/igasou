// === 1. Firebaseの互換読み込みと設定 ===
const firebaseConfig = {
  apiKey: "AIzaSyA9Tn9x4gEDNoZjfjyI6mbQSTZXxB5h_z4",
  authDomain: "://firebaseapp.com",
  projectId: "igasou-f3e0a",
  storageBucket: "igasou-f3e0a.firebasestorage.app",
  messagingSenderId: "500173103005",
  appId: "1:500173103005:web:51d538dd7399939db75974",
  measurementId: "G-249F6M0B1J"
};

// 💡 グローバル変数から確実に初期化するため、インポートエラーが絶対に起きません
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// === 2. DOM要素とキャンバス初期化 ===
const canvas = document.getElementById("gameCanvas"), ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score"), uiEl = document.getElementById("ui");
const topScreenEl = document.getElementById("topScreen"), startBtn = document.getElementById("startBtn");
const audioInitScreen = document.getElementById("audioInitScreen"), audioInitBtn = document.getElementById("audioInitBtn");

function resizeCanvas() {
    const tw = Math.min(window.innerWidth, 800), th = Math.min(window.innerHeight, 450);
    canvas.width = tw; canvas.height = th; topScreenEl.style.width = tw + "px"; topScreenEl.style.height = th + "px";
}
resizeCanvas(); window.addEventListener("resize", resizeCanvas);

let gameState = "TITLE", score = 0, gameSpeed = 5, onlineRanking = [];
const player = { x: 100, y: 200, width: 60, height: 60, vy: 0, gravity: 0.6, jumpPower: -12, isGrounded: false, jumpCount: 0, img: new Image() };
player.img.src = "player.png";

const titleBgm = new Audio("title_bgm.mp3"); titleBgm.loop = true;
const gameBgm = new Audio("game_bgm.mp3"); gameBgm.loop = true;
const jumpSe = new Audio("jump_se.mp3"), gameoverSe = new Audio("gameover_se.mp3"), coinSe = new Audio("coin_se.mp3");

const coinImg = new Image(); coinImg.src = "coin.png";
const enemyImgs = [new Image(), new Image(), new Image(), new Image()];
enemyImgs.src = "enemy1.png"; enemyImgs.src = "enemy2.png"; enemyImgs.src = "enemy3.png"; enemyImgs.src = "enemy4.png";

let platforms = [], coins = [], enemies = [], clouds = [];
function initClouds() { clouds = []; for(let i=0; i<4; i++) clouds.push({ x: Math.random()*canvas.width, y: Math.random()*100 + 30, speed: Math.random()*0.5 + 0.2, size: Math.random()*30 + 40 }); }
function initPlatforms() { platforms = [{ x: 0, y: canvas.height - 100, width: 400, height: 100 }]; coins = []; enemies = []; initClouds(); }

audioInitBtn.addEventListener("click", () => { audioInitScreen.style.display = "none"; goToTitle(); loop(); });
function startGame() { topScreenEl.style.display = "none"; uiEl.style.display = "block"; try { titleBgm.pause(); titleBgm.currentTime = 0; gameBgm.play().catch(e => {}); } catch(e){} resetGame(); }
startBtn.addEventListener("click", (e) => { e.stopPropagation(); startGame(); });
startBtn.addEventListener("touchstart", (e) => { e.stopPropagation(); startGame(); });

function handleInput() {
    if (gameState === "PLAYING" && (player.isGrounded || player.jumpCount < 2)) { player.vy = player.jumpPower; player.isGrounded = false; player.jumpCount++; try { jumpSe.currentTime = 0; jumpSe.play().catch(e => {}); } catch(e){} }
    else if (gameState === "GAMEOVER") goToTitle();
}
window.addEventListener("keydown", (e) => { if (e.code === "Space" || e.code === "ArrowUp") handleInput(); });
window.addEventListener("touchstart", (e) => { if (gameState !== "TITLE") { e.preventDefault(); handleInput(); } }, { passive: false });
window.addEventListener("mousedown", () => { if (gameState !== "TITLE") handleInput(); });
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

async function loadOnlineRanking() {
    try {
        // 💡 互換方式（Compat）のクエリ記述に修正し、ランキングを確実に取得します
        const snap = await db.collection("leaderboard").orderBy("score", "desc").limit(10).get();
        onlineRanking = [];
        if (snap && !snap.empty) {
            snap.forEach((doc) => {
                if (doc && doc.exists) onlineRanking.push(doc.data());
            });
        }
    } catch (e) { console.error("ランキング読み込みエラー:", e); }
}

async function saveOnlineScore(finalScore) {
    const fs = Math.floor(finalScore);
    setTimeout(async () => {
        let name = prompt(`🎉ゲームオーバー！スコア: ${fs}m\nランキングに登録する名前を入力してください`, "名無しランナー");
        if (!name || name.trim() === "") name = "名無しランナー";
        try {
            await db.collection("leaderboard").add({ name: name, score: fs, date: new Date() });
            await loadOnlineRanking();
        } catch (e) { console.error("スコア保存エラー:", e); }
    }, 100);
}

function goToTitle() { gameState = "TITLE"; document.getElementById("gameTitle").textContent = "イガ走"; startBtn.textContent = "走れ!!"; uiEl.style.display = "none"; topScreenEl.style.display = "flex"; try { gameBgm.pause(); gameBgm.currentTime = 0; titleBgm.play().catch(e => {}); } catch(e){} initPlatforms(); }
function resetGame() { score = 0; gameSpeed = 5; player.x = 100; player.y = 200; player.vy = 0; player.isGrounded = false; player.jumpCount = 0; initPlatforms(); gameState = "PLAYING"; }
function isColliding(r1, r2) { return r1.x < r2.x + r2.width && r1.x + r1.width > r2.x && r1.y < r2.y + r2.height && r1.y + r1.height > r2.y; }
function triggerGameOver() { gameState = "GAMEOVER"; uiEl.style.display = "none"; try { gameBgm.pause(); gameoverSe.currentTime = 0; gameoverSe.play().catch(e => {}); } catch(e){} saveOnlineScore(score); }

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
    if (gameState === "GAMEOVER") {
        ctx.fillStyle = "rgba(0, 0, 0, 0.75)"; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#ff4757"; ctx.font = "bold 26px sans-serif"; ctx.textAlign = "center"; ctx.fillText("GAME OVER", canvas.width / 2, 40);
        ctx.fillStyle = "white"; ctx.font = "bold 16px sans-serif"; ctx.fillText(`今回のスコア: ${Math.floor(score)}m`, canvas.width / 2, 70); ctx.fillText("🏆 全世界オンライン TOP 10 🏆", canvas.width / 2, 110);
        ctx.font = "14px monospace";
        onlineRanking.forEach((item, index) => {
            const y = 140 + index * 23; let b = `${index + 1}位`; if (index === 0) b = "🥇1位"; if (index === 1) b = "🥈2位"; if (index === 2) b = "🥉3位";
            ctx.textAlign = "right"; ctx.fillText(`${b}  ${item.name}`, canvas.width / 2 - 20, y);
            ctx.textAlign = "left"; ctx.fillText(` : ${item.score}m`, canvas.width / 2 - 10, y);
        });
        ctx.fillStyle = "#fffa65"; ctx.font = "bold 14px sans-serif"; ctx.textAlign = "center"; 
        ctx.fillText("画面をタップ / クリックでタイトルへ", canvas.width / 2, canvas.height - 20);
    }
}
function loop() { update(); draw(); requestAnimationFrame(loop); }
loadOnlineRanking();
