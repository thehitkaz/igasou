// === 5. ステージ・オブジェクトの生成処理 ===
function initClouds() { 
    clouds = []; 
    for(let i=0; i<4; i++) {
        clouds.push({ x: Math.random()*canvas.width, y: Math.random()*100 + 30, speed: Math.random()*0.5 + 0.2, size: Math.random()*30 + 40 }); 
    }
}

function initPlatforms() { 
    platforms = [{ x: 0, y: canvas.height - 100, width: 400, height: 100 }]; 
    coins = []; 
    enemies = []; 
    initClouds(); 
}

function generatePlatform() {
    if (!platforms.length) return;
    const last = platforms[platforms.length - 1];
    const gap = Math.random() * 100 + 120;
    const width = Math.random() * 150 + 150;
    const y = Math.random() * 130 + canvas.height - 180;
    const newPlat = { x: last.x + last.width + gap, y: y, width: width, height: canvas.height - y };
    platforms.push(newPlat);
    
    if (Math.random() < 0.3) {
        coins.push({ x: newPlat.x + newPlat.width / 2 - 15, y: newPlat.y - 40, width: 30, height: 30, alive: true });
    }
    if (Math.random() < 0.2) {
        let type = Math.floor(Math.random() * 4); 
        if (score < 100 && type === 3) type = 0;
        let ey = newPlat.y - 40, ew = 40, eh = 40;
        if (type === 1) ey = newPlat.y - 80; 
        if (type === 3) { ew = 65; eh = 65; ey = newPlat.y - 65; }
        enemies.push({ type: type, x: newPlat.x + newPlat.width / 2 - ew / 2, y: ey, baseY: ey, width: ew, height: eh, angle: 0, triggered: false });
    }
}
// === 6. イベントリスナーと画面遷移（エラー完全無視版） ===
audioInitBtn.addEventListener("click", () => { 
    audioInitScreen.style.display = "none"; 
    // 💡 音楽ファイルが無くてもエラーにせず無視する
    try {
        titleBgm.play().catch(e => console.log("BGM再生制限を回避しました"));
    } catch(e) {}
    goToTitle(); 
    loop(); 
});

function startGame() { 
    topScreenEl.style.display = "none"; 
    uiEl.style.display = "block"; 
    try {
        titleBgm.pause(); 
        titleBgm.currentTime = 0; 
        gameBgm.play().catch(e => {}); 
    } catch(e) {}
    resetGame(); 
}

startBtn.addEventListener("click", (e) => { e.stopPropagation(); startGame(); });
startBtn.addEventListener("touchstart", (e) => { e.stopPropagation(); startGame(); });

// === 7. 操作入力とゲーム管理 ===
function handleInput() {
    if (gameState === "PLAYING" && (player.isGrounded || player.jumpCount < 2)) { 
        player.vy = player.jumpPower; 
        player.isGrounded = false; 
        player.jumpCount++; 
        try {
            jumpSe.currentTime = 0; 
            jumpSe.play().catch(e => {}); 
        } catch(e) {}
    }
    else if (gameState === "GAMEOVER") {
        goToTitle();
    }
}

window.addEventListener("keydown", (e) => { if (e.code === "Space" || e.code === "ArrowUp") handleInput(); });
window.addEventListener("touchstart", (e) => { if (gameState !== "TITLE") { e.preventDefault(); handleInput(); } }, { passive: false });
window.addEventListener("mousedown", () => { if (gameState !== "TITLE") handleInput(); });
async function loadOnlineRanking() {
    try {
        const q = query(collection(db, "leaderboard"), orderBy("score", "desc"), limit(10));
        const snap = await getDocs(q); 
        onlineRanking = [];
        if (snap && !snap.empty) {
            snap.forEach((doc) => {
                if (doc && doc.data) {
                    onlineRanking.push(doc.data());
                }
            });
        }
    } catch (e) { 
        console.error("ランキングの読み込みに失敗しましたが、ゲームは続行します:", e); 
    }
}

async function saveOnlineScore(finalScore) {
    const fs = Math.floor(finalScore);
    setTimeout(async () => {
        let name = prompt(`🎉ゲームオーバー！スコア: ${fs}m\nランキングに登録する名前を入力してください`, "名無しランナー");
        if (!name || name.trim() === "") name = "名無しランナー";
        try {
            await addDoc(collection(db, "leaderboard"), { name: name, score: fs, date: new Date() });
            await loadOnlineRanking();
        } catch (e) { 
            console.error("スコアの保存に失敗しました:", e); 
        }
    }, 100);
}

function goToTitle() { 
    gameState = "TITLE"; 
    document.getElementById("gameTitle").textContent = "イガ走"; 
    startBtn.textContent = "走れ!!"; 
    uiEl.style.display = "none"; 
    topScreenEl.style.display = "flex"; 
    try {
        gameBgm.pause(); 
        gameBgm.currentTime = 0; 
        titleBgm.play().catch(e => {}); 
    } catch(e) {}
    initPlatforms(); 
}

function resetGame() { 
    score = 0; 
    gameSpeed = 5; 
    player.x = 100; 
    player.y = 200; 
    player.vy = 0; 
    player.isGrounded = false; 
    player.jumpCount = 0; 
    initPlatforms(); 
    gameState = "PLAYING"; 
}

function triggerGameOver() { 
    gameState = "GAMEOVER"; 
    uiEl.style.display = "none"; 
    try {
        gameBgm.pause(); 
        gameoverSe.currentTime = 0; 
        gameoverSe.play().catch(e => {}); 
    } catch(e) {}
    saveOnlineScore(score); 
}
