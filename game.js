// =====================================
// MINI TOWER DEFENSE
// =====================================

(function () {
  "use strict";

  // ----- Cấu hình (chỉnh số ở đây để cân bằng game) -----
  const COLS = 16, ROWS = 10, CELL = 40;
  const W = COLS * CELL, H = ROWS * CELL;

  // Đường đi của quái: danh sách [cột, hàng], chỉ đi ngang hoặc dọc
  const WAYPOINTS = [[-1, 1], [3, 1], [3, 6], [8, 6], [8, 2], [12, 2], [12, 7], [16, 7]];

  const TOWERS = {
    arrow:  { cost: 50,  range: 100, damage: 8,  rate: 0.7, color: "#58d6a0" },
    cannon: { cost: 100, range: 80,  damage: 20, rate: 1.8, color: "#c792ea", splash: 42 }
  };

  const ENEMIES = {
    grunt: { hp: 34,  speed: 52,  reward: 8,  r: 8,  color: "#f16b65" },
    fast:  { hp: 15,  speed: 120, reward: 7,  r: 6,  color: "#e8c878" },
    tank:  { hp: 120, speed: 34,  reward: 20, r: 11, color: "#82aaff" }
  };

  // Mỗi đợt là danh sách [loại quái, số lượng]
  const WAVES = [
    [["grunt", 6]],
    [["grunt", 8]],
    [["grunt", 6], ["fast", 6]],
    [["tank", 3], ["grunt", 8]],
    [["fast", 12]],
    [["tank", 5], ["grunt", 10]],
    [["fast", 10], ["tank", 5]],
    [["tank", 8], ["fast", 12], ["grunt", 10]]
  ];

  const START_GOLD = 150, START_LIVES = 10, WAVE_BONUS = 30, HP_GROWTH = 0.2;

  // ----- Phần tử trên trang -----
  const $ = function (id) { return document.getElementById(id); };
  const modal = $("gameModal"), openBtn = $("openGame"), closeBtn = $("closeGame");
  const cv = $("tdCanvas"), startBtn = $("tdStart"), msgEl = $("tdMsg");
  if (!modal || !openBtn || !cv) return;

  const ctx = cv.getContext("2d");
  const hud = { gold: $("tdGold"), lives: $("tdLives"), wave: $("tdWave"), score: $("tdScore"), best: $("tdBest") };
  const towerBtns = document.querySelectorAll(".td-tower");

  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  cv.width = W * ratio;
  cv.height = H * ratio;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

  // ----- Đường đi -----
  const pts = WAYPOINTS.map(function (p) {
    return { x: p[0] * CELL + CELL / 2, y: p[1] * CELL + CELL / 2 };
  });

  const blocked = new Set();
  for (let i = 0; i < WAYPOINTS.length - 1; i++) {
    let c = WAYPOINTS[i][0], r = WAYPOINTS[i][1];
    const c2 = WAYPOINTS[i + 1][0], r2 = WAYPOINTS[i + 1][1];
    const dc = Math.sign(c2 - c), dr = Math.sign(r2 - r);
    while (c !== c2 || r !== r2) { blocked.add(c + "," + r); c += dc; r += dr; }
    blocked.add(c2 + "," + r2);
  }

  // ----- Trạng thái -----
  let state, gold, lives, wave, score, towers, enemies, effects, queue, spawnTimer;
  let selected = "arrow", hover = null, best = 0, running = false, last = 0;
  try { best = Number(localStorage.getItem("tdBest")) || 0; } catch (e) {}

  const HINT = "Chọn tháp rồi bấm vào ô trống để đặt. Đừng đặt lên đường đi của quái.";

  // Chỉ ghi vào DOM khi giá trị thật sự đổi (tránh ghi lại mỗi khung hình)
  function setText(el, v) {
    v = String(v);
    if (el._v !== v) { el._v = v; el.textContent = v; }
  }

  function say(text) { setText(msgEl, text); }

  function reset() {
    state = "ready"; gold = START_GOLD; lives = START_LIVES; wave = 0; score = 0;
    towers = []; enemies = []; effects = []; queue = []; spawnTimer = 0;
    startBtn.textContent = "Bắt đầu đợt 1";
    say(HINT);
    updateHud();
  }

  function updateHud() {
    setText(hud.gold, gold);
    setText(hud.lives, lives);
    setText(hud.wave, wave + "/" + WAVES.length);
    setText(hud.score, score);
    setText(hud.best, best);
    startBtn.disabled = state === "wave";
  }

  // ----- Luồng đợt quái -----
  function startWave() {
    if (state !== "ready") return;
    queue = [];
    WAVES[wave].forEach(function (g) { for (let i = 0; i < g[1]; i++) queue.push(g[0]); });
    wave++;
    state = "wave";
    spawnTimer = 0.4;
    say("Đợt " + wave + " bắt đầu!");
    updateHud();
  }

  function spawn(type) {
    const d = ENEMIES[type];
    const hp = d.hp * (1 + (wave - 1) * HP_GROWTH);
    enemies.push({ x: pts[0].x, y: pts[0].y, seg: 0, travel: 0, hp: hp, max: hp,
                   speed: d.speed, reward: d.reward, r: d.r, color: d.color, gone: false });
  }

  function move(e, dt) {
    let d = e.speed * dt;
    while (d > 0 && e.seg < pts.length - 1) {
      const t = pts[e.seg + 1];
      const dx = t.x - e.x, dy = t.y - e.y;
      const dist = Math.hypot(dx, dy);
      if (dist <= d) { e.x = t.x; e.y = t.y; e.seg++; e.travel += dist; d -= dist; }
      else { e.x += dx / dist * d; e.y += dy / dist * d; e.travel += d; d = 0; }
    }
  }

  function shoot(t, target) {
    const d = t.def;
    if (d.splash) {
      enemies.forEach(function (e) {
        if (Math.hypot(e.x - target.x, e.y - target.y) <= d.splash) e.hp -= d.damage;
      });
      effects.push({ kind: "boom", x: target.x, y: target.y, r: d.splash, life: 0.25, max: 0.25 });
    } else {
      target.hp -= d.damage;
      effects.push({ kind: "line", x1: t.x, y1: t.y, x2: target.x, y2: target.y, color: d.color, life: 0.1, max: 0.1 });
    }
  }

  function tickEffects(dt) {
    effects.forEach(function (f) { f.life -= dt; });
    effects = effects.filter(function (f) { return f.life > 0; });
  }

  function finish(result) {
    state = result;
    if (result === "won") score += lives * 20;
    if (score > best) {
      best = score;
      try { localStorage.setItem("tdBest", String(best)); } catch (e) {}
    }
    startBtn.textContent = "Chơi lại";
    say(result === "won" ? "Bạn đã bảo vệ căn cứ! Điểm: " + score : "Căn cứ đã thất thủ. Điểm: " + score);
  }

  function update(dt) {
    if (state === "won" || state === "lost") { tickEffects(dt); return; }

    if (state === "wave" && queue.length) {
      spawnTimer -= dt;
      if (spawnTimer <= 0) { spawn(queue.shift()); spawnTimer = 0.85; }
    }

    enemies.forEach(function (e) {
      move(e, dt);
      if (e.seg >= pts.length - 1) { e.gone = true; lives--; }
    });

    towers.forEach(function (t) {
      t.cool -= dt;
      if (t.cool > 0) return;
      let target = null;
      enemies.forEach(function (e) {
        if (e.gone || e.hp <= 0) return;
        if (Math.hypot(e.x - t.x, e.y - t.y) <= t.def.range && (!target || e.travel > target.travel)) target = e;
      });
      if (!target) return;
      t.cool = t.def.rate;
      t.angle = Math.atan2(target.y - t.y, target.x - t.x);
      shoot(t, target);
    });

    enemies.forEach(function (e) {
      if (!e.gone && e.hp <= 0) { e.gone = true; gold += e.reward; score += 10; }
    });
    enemies = enemies.filter(function (e) { return !e.gone; });
    tickEffects(dt);

    if (lives <= 0) {
      lives = 0;
      finish("lost");
    } else if (state === "wave" && !queue.length && !enemies.length) {
      gold += WAVE_BONUS;
      score += 100;
      if (wave >= WAVES.length) {
        finish("won");
      } else {
        state = "ready";
        startBtn.textContent = "Bắt đầu đợt " + (wave + 1);
        say("Đợt " + wave + " hoàn thành! +" + WAVE_BONUS + " vàng.");
      }
    }
    updateHud();
  }

  // ----- Đặt tháp -----
  function isFree(c, r) {
    return !blocked.has(c + "," + r) && !towers.some(function (t) { return t.c === c && t.r === r; });
  }

  function build(c, r) {
    if (state === "won" || state === "lost") return;
    if (c < 0 || r < 0 || c >= COLS || r >= ROWS) return;
    if (blocked.has(c + "," + r)) { say("Không thể đặt tháp trên đường đi."); return; }
    if (!isFree(c, r)) { say("Ô này đã có tháp."); return; }
    const def = TOWERS[selected];
    if (gold < def.cost) { say("Không đủ vàng (cần " + def.cost + ")."); return; }
    gold -= def.cost;
    towers.push({ c: c, r: r, x: c * CELL + CELL / 2, y: r * CELL + CELL / 2, def: def, cool: 0, angle: 0 });
    updateHud();
  }

  function select(type) {
    selected = type;
    towerBtns.forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.tower === type)); });
  }

  // ----- Vẽ -----
  const TAU = Math.PI * 2;

  function draw() {
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#0a110e";
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = "rgba(88,214,160,0.05)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let c = 1; c < COLS; c++) { ctx.moveTo(c * CELL, 0); ctx.lineTo(c * CELL, H); }
    for (let r = 1; r < ROWS; r++) { ctx.moveTo(0, r * CELL); ctx.lineTo(W, r * CELL); }
    ctx.stroke();

    // đường đi
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    pts.forEach(function (p, i) { if (i) ctx.lineTo(p.x, p.y); else ctx.moveTo(p.x, p.y); });
    ctx.strokeStyle = "#16231e";
    ctx.lineWidth = CELL - 6;
    ctx.stroke();
    ctx.strokeStyle = "rgba(88,214,160,0.18)";
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 8]);
    ctx.stroke();
    ctx.setLineDash([]);

    // cửa vào và căn cứ
    ctx.fillStyle = "rgba(88,214,160,0.55)";
    ctx.fillRect(0, 1 * CELL + 2, 5, CELL - 4);
    ctx.fillStyle = "rgba(241,107,101,0.6)";
    ctx.fillRect(W - 5, 7 * CELL + 2, 5, CELL - 4);

    // xem trước vị trí đặt
    if (hover && state !== "won" && state !== "lost" &&
        hover.c >= 0 && hover.r >= 0 && hover.c < COLS && hover.r < ROWS) {
      const ok = isFree(hover.c, hover.r);
      const def = TOWERS[selected];
      const cx = hover.c * CELL + CELL / 2, cy = hover.r * CELL + CELL / 2;
      ctx.fillStyle = ok ? "rgba(88,214,160,0.10)" : "rgba(241,107,101,0.10)";
      ctx.beginPath(); ctx.arc(cx, cy, def.range, 0, TAU); ctx.fill();
      ctx.strokeStyle = ok ? "rgba(88,214,160,0.5)" : "rgba(241,107,101,0.5)";
      ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = ok ? "rgba(88,214,160,0.22)" : "rgba(241,107,101,0.22)";
      ctx.fillRect(hover.c * CELL + 1, hover.r * CELL + 1, CELL - 2, CELL - 2);
    }

    // tháp
    towers.forEach(function (t) {
      ctx.save();
      ctx.translate(t.x, t.y);
      ctx.fillStyle = "#101c17";
      ctx.strokeStyle = t.def.color;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, 13, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.rotate(t.angle);
      ctx.fillStyle = t.def.color;
      ctx.fillRect(0, t.def.splash ? -3.5 : -2, t.def.splash ? 18 : 15, t.def.splash ? 7 : 4);
      ctx.restore();
    });

    // quái
    enemies.forEach(function (e) {
      ctx.fillStyle = e.color;
      ctx.beginPath(); ctx.arc(e.x, e.y, e.r, 0, TAU); ctx.fill();
      const w = 20, p = Math.max(0, e.hp / e.max), y = e.y - e.r - 7;
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.fillRect(e.x - w / 2, y, w, 3);
      ctx.fillStyle = "#58d6a0";
      ctx.fillRect(e.x - w / 2, y, w * p, 3);
    });

    // hiệu ứng bắn
    effects.forEach(function (f) {
      const a = Math.max(0, f.life / f.max);
      ctx.globalAlpha = a;
      if (f.kind === "line") {
        ctx.strokeStyle = f.color; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(f.x1, f.y1); ctx.lineTo(f.x2, f.y2); ctx.stroke();
      } else {
        ctx.fillStyle = "#c792ea";
        ctx.beginPath(); ctx.arc(f.x, f.y, f.r * (1.1 - a * 0.5), 0, TAU); ctx.fill();
      }
    });
    ctx.globalAlpha = 1;

    if (state === "won" || state === "lost") {
      ctx.fillStyle = "rgba(8,13,12,0.72)";
      ctx.fillRect(0, 0, W, H);
      ctx.textAlign = "center";
      ctx.fillStyle = state === "won" ? "#58d6a0" : "#f16b65";
      ctx.font = "800 34px 'Be Vietnam Pro', sans-serif";
      ctx.fillText(state === "won" ? "CHIẾN THẮNG!" : "THẤT BẠI", W / 2, H / 2 - 6);
      ctx.fillStyle = "#b9c8c0";
      ctx.font = "14px 'JetBrains Mono', monospace";
      ctx.fillText("Điểm: " + score, W / 2, H / 2 + 24);
      ctx.textAlign = "start";
    }
  }

  // ----- Vòng lặp, mở và đóng -----
  function loop(now) {
    if (!running) return;
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    update(dt);
    draw();
    requestAnimationFrame(loop);
  }

  function open() {
    modal.hidden = false;
    document.body.style.overflow = "hidden";
    running = true;
    last = performance.now();
    requestAnimationFrame(loop);
    startBtn.focus();
  }

  function close() {
    modal.hidden = true;
    document.body.style.overflow = "";
    running = false;
    openBtn.focus();
  }

  function cellFromEvent(e) {
    const rect = cv.getBoundingClientRect();
    return {
      c: Math.floor((e.clientX - rect.left) * W / rect.width / CELL),
      r: Math.floor((e.clientY - rect.top) * H / rect.height / CELL)
    };
  }

  openBtn.addEventListener("click", open);
  closeBtn.addEventListener("click", close);
  modal.addEventListener("pointerdown", function (e) { if (e.target === modal) close(); });

  cv.addEventListener("pointermove", function (e) { hover = cellFromEvent(e); });
  cv.addEventListener("pointerleave", function () { hover = null; });
  cv.addEventListener("pointerdown", function (e) {
    hover = cellFromEvent(e);
    build(hover.c, hover.r);
  });

  towerBtns.forEach(function (b) {
    b.addEventListener("click", function () { select(b.dataset.tower); });
  });

  startBtn.addEventListener("click", function () {
    if (state === "won" || state === "lost") reset();
    else startWave();
  });

  document.addEventListener("keydown", function (e) {
    if (modal.hidden) return;
    if (e.key === "Escape") close();
    else if (e.key === "1") select("arrow");
    else if (e.key === "2") select("cannon");
  });

  select("arrow");
  reset();
})();
