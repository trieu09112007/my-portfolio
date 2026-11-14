// =====================================
// PORTFOLIO - SCRIPT CHÍNH (bản tối ưu)
// =====================================

(function () {
  "use strict";

  // =====================================
  // 01. MAIN ELEMENTS
  // =====================================

  const $ = function (id) { return document.getElementById(id); };

  const content = $("content");
  const settingsBtn = $("settingsBtn");
  const panel = $("settings");
  const loadingScreen = $("intro-screen");
  const glow = $("glow");

  const reduce = matchMedia("(prefers-reduced-motion: reduce)");

  // =====================================
  // 02. INTRO SCREEN
  // =====================================

  let shown = false;

  function show() {
    if (shown) return;
    shown = true;

    content.hidden = false;
    settingsBtn.hidden = false;

    // Khởi tạo hiệu ứng xuất hiện khi cuộn
    intro();

    // Giải mã tên và gõ code ở phần hero
    startHeroEffects();

    // Bắt đầu ẩn intro
    loadingScreen.classList.add("intro-leaving");

    setTimeout(function () {
      loadingScreen.hidden = true;
      document.body.classList.remove("is-loading");
    }, 700);
  }

  addEventListener("load", function () { setTimeout(show, 1500); });

  // Phòng khi một tài nguyên ngoài (font, ảnh) tải quá lâu thì vẫn vào trang
  setTimeout(show, 6000);

  // =====================================
  // 03. SETTINGS
  // =====================================

  const settings = {
    confetti: true,
    glow: true,
    sparkle: true,
    drift: true
  };

  try {
    Object.assign(settings, JSON.parse(localStorage.getItem("fxSettings") || "{}"));
  } catch (e) {}

  function setPanel(open) {
    panel.classList.toggle("open", open);
    settingsBtn.setAttribute("aria-expanded", String(open));
  }

  function applySettings() {
    document.documentElement.classList.toggle("no-glow", !settings.glow);

    panel.querySelectorAll("input[data-key]").forEach(function (box) {
      box.checked = !!settings[box.dataset.key];
    });
  }

  applySettings();

  settingsBtn.addEventListener("click", function () {
    setPanel(!panel.classList.contains("open"));
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") setPanel(false);
  });

  panel.addEventListener("change", function (e) {
    const key = e.target.dataset.key;
    if (!key) return;

    settings[key] = e.target.checked;

    try {
      localStorage.setItem("fxSettings", JSON.stringify(settings));
    } catch (err) {}

    if (!settings.confetti) parts.length = 0;
    if (!settings.sparkle) dots.length = 0;

    applySettings();

    if (key === "drift") startBg();
    if (key === "glow") queueGlow();
  });

  // =====================================
  // 04. SCROLL REVEAL
  // =====================================

  function intro() {
    if (reduce.matches) return;
    if (content.dataset.ready) return;

    content.dataset.ready = "1";

    const io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add("in");
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.12 });

    document.querySelectorAll("main > :not(.navbar):not(.hero):not(.footer)").forEach(function (el) {
      el.classList.add("reveal");
      io.observe(el);
    });
  }

  // =====================================
  // 05. CANVAS: KÍCH THƯỚC (dùng chung)
  // =====================================

  // Canvas nền chữ và vệt sáng chỉ có alpha rất thấp nên vẽ ở 1x là đủ nét.
  // Chỉ canvas pháo giấy giữ độ nét cao.
  const fx = $("fx");
  const ctx = fx.getContext("2d");
  const tr = $("trail");
  const tctx = tr.getContext("2d");
  const bg = $("codebg");
  const bctx = bg.getContext("2d");

  let fxRatio = 1;

  function fit(canvas, c, ratio) {
    canvas.width = Math.round(innerWidth * ratio);
    canvas.height = Math.round(innerHeight * ratio);
    c.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  let lastW = 0, lastH = 0;
  let sectionBox = null;

  function resizeAll() {
    fxRatio = Math.min(devicePixelRatio || 1, 2);
    fit(fx, ctx, fxRatio);
    fit(tr, tctx, 1);
    fit(bg, bctx, 1);
    makeBits();
    sectionBox = null;
    lastW = innerWidth;
    lastH = innerHeight;
  }

  let resizeTimer = 0;

  addEventListener("resize", function () {
    // Trên điện thoại, thanh địa chỉ ẩn/hiện làm innerHeight đổi nhẹ khi cuộn.
    // Bỏ qua kiểu thay đổi đó để khỏi xóa và dựng lại canvas liên tục.
    if (innerWidth === lastW && Math.abs(innerHeight - lastH) < 150) return;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resizeAll, 120);
  });

  // =====================================
  // 06. CONFETTI EFFECT
  // =====================================

  const colors = ["#58d6a0", "#e8c878", "#239b6a", "#e7f0eb", "#ff8b75"];

  const parts = [];
  let running = false;

  function burst(x, y, n) {
    if (!settings.confetti || reduce.matches) return;
    n = n || 18;

    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 1 + Math.random() * 3;

      parts.push({
        x: x,
        y: y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s - 3,
        w: 5 + Math.random() * 6,
        h: 3 + Math.random() * 4,
        r: Math.random() * 6.28,
        vr: (Math.random() - 0.5) * 0.4,
        life: 0,
        max: 100 + Math.random() * 40,
        color: colors[Math.floor(Math.random() * colors.length)]
      });
    }

    if (!running) {
      running = true;
      requestAnimationFrame(frame);
    }
  }

  function frame() {
    ctx.setTransform(fxRatio, 0, 0, fxRatio, 0, 0);
    ctx.clearRect(0, 0, innerWidth, innerHeight);

    // Cập nhật và loại hạt đã hết đời ngay trong một vòng lặp, không tạo mảng mới
    let n = 0;

    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      if (p.life >= p.max) continue;

      p.vy += 0.25;
      p.vx *= 0.99;
      p.x += p.vx;
      p.y += p.vy;
      p.r += p.vr;
      p.life++;

      // Đặt thẳng ma trận biến đổi, nhanh hơn save/translate/rotate/restore
      const c = Math.cos(p.r) * fxRatio;
      const s = Math.sin(p.r) * fxRatio;
      ctx.setTransform(c, s, -s, c, p.x * fxRatio, p.y * fxRatio);

      ctx.globalAlpha = 1 - p.life / p.max;
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);

      parts[n++] = p;
    }

    parts.length = n;

    ctx.setTransform(fxRatio, 0, 0, fxRatio, 0, 0);
    ctx.globalAlpha = 1;

    if (n) {
      requestAnimationFrame(frame);
    } else {
      running = false;
    }
  }

  // =====================================
  // 07. CLICK EFFECT + ĐÓNG PANEL CÀI ĐẶT
  // =====================================

  document.addEventListener("pointerdown", function (e) {
    const inPanel = panel.contains(e.target) || settingsBtn.contains(e.target);

    if (!inPanel) setPanel(false);
    if (e.target.closest("#settings, #settingsBtn, #toTop, #navToggle")) return;

    burst(e.clientX, e.clientY);
  });

  // =====================================
  // 08. MOUSE GLOW (dịch chuyển bằng transform, không đổi biến CSS ở :root)
  // =====================================

  let gx = innerWidth / 2;
  let gy = innerHeight / 2;
  let glowQueued = false;

  function placeGlow() {
    glowQueued = false;
    glow.style.transform = "translate3d(" + (gx - 350) + "px," + (gy - 350) + "px,0)";
  }

  function queueGlow() {
    if (!glow || glowQueued || !settings.glow) return;
    glowQueued = true;
    requestAnimationFrame(placeGlow);
  }

  if (glow) placeGlow();

  // =====================================
  // 09. SPARKLE TRAIL
  // =====================================

  const trailColors = ["#58d6a0", "#e8c878", "#e7f0eb", "#ff8b75"];

  const dots = [];
  let trailRunning = false;

  function sparkle(e) {
    if (reduce.matches) return;
    if (!settings.sparkle || content.hidden) return;
    if (e.target.closest && e.target.closest("#settings, #settingsBtn")) return;

    // Chỉ đo một lần (và đo lại sau khi đổi kích thước), không đo ở mỗi lần rê chuột
    if (!sectionBox) {
      const sec = document.querySelector(".section");
      sectionBox = { left: sec.offsetLeft, right: sec.offsetLeft + sec.offsetWidth };
    }

    // Không tạo hiệu ứng bên trong vùng nội dung chính
    if (e.clientX > sectionBox.left && e.clientX < sectionBox.right) return;

    for (let i = 0; i < 2; i++) {
      dots.push({
        x: e.clientX + (Math.random() - 0.5) * 10,
        y: e.clientY + (Math.random() - 0.5) * 10,
        vx: (Math.random() - 0.5) * 1.2,
        vy: (Math.random() - 0.5) * 1.2 + 0.3,
        r: 2 + Math.random() * 4,
        life: 0,
        max: 45 + Math.random() * 30,
        color: trailColors[Math.floor(Math.random() * trailColors.length)]
      });
    }

    if (dots.length > 250) dots.splice(0, dots.length - 250);

    if (!trailRunning) {
      trailRunning = true;
      requestAnimationFrame(drawTrail);
    }
  }

  function drawTrail() {
    tctx.clearRect(0, 0, innerWidth, innerHeight);

    let n = 0;

    for (let i = 0; i < dots.length; i++) {
      const d = dots[i];
      if (d.life >= d.max) continue;

      d.x += d.vx;
      d.y += d.vy;
      d.life++;

      const k = Math.max(0, 1 - d.life / d.max);

      dots[n++] = d;
      if (k === 0) continue;

      tctx.globalAlpha = k * 0.8;
      tctx.fillStyle = d.color;
      tctx.beginPath();
      tctx.arc(d.x, d.y, d.r * k, 0, Math.PI * 2);
      tctx.fill();
    }

    dots.length = n;
    tctx.globalAlpha = 1;

    if (n) {
      requestAnimationFrame(drawTrail);
    } else {
      trailRunning = false;
    }
  }

  // Một listener pointermove duy nhất cho cả vầng sáng lẫn vệt lấp lánh
  addEventListener("pointermove", function (e) {
    gx = e.clientX;
    gy = e.clientY;
    queueGlow();
    sparkle(e);
  }, { passive: true });

  // =====================================
  // 10. HERO EFFECTS (gõ code + giải mã tên)
  // =====================================

  function startHeroEffects() {
    if (reduce.matches) return;

    const nameEl = document.querySelector(".hero h1");
    const codeEl = document.querySelector(".code-content");

    decodeText(nameEl, 1200);
    nameEl.addEventListener("mouseenter", function () {
      decodeText(nameEl, 900);
    });

    setTimeout(function () { typeCode(codeEl); }, 900);
  }

  // Gõ code một lần rồi giữ nguyên
  function typeCode(box) {
    if (box.dataset.typed) return;
    box.dataset.typed = "1";

    const items = [];
    const walker = document.createTreeWalker(box, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const n = walker.currentNode;
      const v = n.nodeValue;
      if (!/\S/.test(v) && v.includes("\n")) continue;   // bỏ khoảng trắng thụt dòng
      items.push({ node: n, text: v.replace(/\s+/g, " ") });
    }

    // Giữ nguyên chiều cao để trang không bị giật khi chữ chưa hiện
    box.style.minHeight = box.offsetHeight + "px";
    items.forEach(function (it) { it.node.nodeValue = ""; });

    const caret = document.createElement("span");
    caret.className = "caret";

    let k = 0;
    let c = 0;

    (function step() {
      if (k >= items.length) return;

      const it = items[k];
      c++;
      it.node.nodeValue = it.text.slice(0, c);
      it.node.parentNode.insertBefore(caret, it.node.nextSibling);

      if (c >= it.text.length) { k++; c = 0; }

      setTimeout(step, 18 + Math.random() * 30);
    })();
  }

  // Chữ xáo trộn rồi chốt dần về đúng nội dung
  function decodeText(el, duration) {
    duration = duration || 1200;
    if (el.dataset.busy) return;
    el.dataset.busy = "1";

    if (!el.getAttribute("aria-label")) {
      el.setAttribute("aria-label", el.textContent.replace(/\s+/g, " ").trim());
    }

    const glyphs = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<>/{}#;";
    const nodes = [];
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const n = walker.currentNode;
      if (/\S/.test(n.nodeValue)) nodes.push({ node: n, text: n.nodeValue.normalize("NFC") });
    }

    const total = nodes.reduce(function (s, o) { return s + o.text.length; }, 0);
    let g = 0;
    nodes.forEach(function (o) {
      o.times = Array.from(o.text, function () { return (g++ / total) * 0.6 + Math.random() * 0.4; });
    });

    const start = performance.now();
    let last = 0;

    function tick(now) {
      const p = (now - start) / duration;

      if (now - last > 45 || p >= 1) {
        last = now;
        nodes.forEach(function (o) {
          let out = "";
          for (let i = 0; i < o.text.length; i++) {
            const ch = o.text[i];
            out += (p >= o.times[i] || /\s/.test(ch))
              ? ch
              : glyphs[Math.floor(Math.random() * glyphs.length)];
          }
          o.node.nodeValue = out;
        });
      }

      if (p < 1) {
        requestAnimationFrame(tick);
      } else {
        nodes.forEach(function (o) { o.node.nodeValue = o.text; });
        delete el.dataset.busy;
      }
    }

    requestAnimationFrame(tick);
  }

  // =====================================
  // 11. CODE DRIFT BACKGROUND
  // =====================================

  // Ký tự code (mặc định) và biểu tượng bóng đá (khi ở section Ronaldo)
  const CODE_GLYPHS = ["{ }", "</>", ";", "0", "1", "()", "=>", "[]", "&&", "#", "++", "int", "if", "for", "C#", "0x1F"];
  const FOOTBALL_GLYPHS = ["⚽", "🏆", "👟", "🥅", "🏅", "7️⃣", "CR7", "SIUU", "GOAT", "★", "⚽", "🏆", "7", "⚽"];

  const FONT_CODE = "px 'JetBrains Mono', monospace";
  const FONT_BALL = "px Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif";

  let bits = [];
  let bgRunning = false;
  let bgMode = "code"; // "code" | "football"
  let bgPaused = false; // true khi đang mở game (không cần vẽ nền phía sau)

  function currentGlyphs() {
    return bgMode === "football" ? FOOTBALL_GLYPHS : CODE_GLYPHS;
  }

  function makeBit(anywhere, size) {
    const glyphs = currentGlyphs();
    return {
      x: Math.random() * innerWidth,
      y: anywhere ? Math.random() * innerHeight : innerHeight + 20,
      vy: 0.15 + Math.random() * 0.35,
      size: size || Math.round(11 + Math.random() * 9),
      alpha: 0.05 + Math.random() * 0.09,
      text: glyphs[Math.floor(Math.random() * glyphs.length)]
    };
  }

  function makeBits() {
    const count = Math.round(Math.min(40, Math.max(14, innerWidth / 38)));
    bits = Array.from({ length: count }, function () { return makeBit(true); });

    // Xếp theo cỡ chữ để khi vẽ chỉ phải đổi font vài lần mỗi khung hình
    bits.sort(function (a, b) { return a.size - b.size; });
  }

  function startBg() {
    if (bgRunning || bgPaused || !settings.drift || reduce.matches) return;
    bgRunning = true;
    requestAnimationFrame(drawBg);
  }

  function drawBg() {
    bctx.clearRect(0, 0, innerWidth, innerHeight);

    if (!settings.drift || bgPaused) {
      bgRunning = false;
      return;
    }

    const ball = bgMode === "football";

    // Màu hơi vàng hơn khi ở chế độ bóng đá
    bctx.fillStyle = ball ? "#e8c878" : "#58d6a0";

    const tail = ball ? FONT_BALL : FONT_CODE;
    let size = 0;

    for (let i = 0; i < bits.length; i++) {
      const b = bits[i];
      b.y -= b.vy;

      // Giữ nguyên cỡ chữ khi quay lại từ đáy để thứ tự xếp theo cỡ không bị phá
      if (b.y < -20) { bits[i] = makeBit(false, b.size); continue; }

      if (b.size !== size) {
        size = b.size;
        bctx.font = size + tail;
      }

      bctx.globalAlpha = b.alpha;
      bctx.fillText(b.text, b.x, b.y);
    }

    bctx.globalAlpha = 1;
    requestAnimationFrame(drawBg);
  }

  // Tạm dừng vẽ nền khi game đang mở
  const gameModal = $("gameModal");
  if (gameModal) {
    new MutationObserver(function () {
      bgPaused = !gameModal.hidden;
      if (!bgPaused) startBg();
    }).observe(gameModal, { attributes: true, attributeFilter: ["hidden"] });
  }

  // Đổi sang biểu tượng bóng đá khi cuộn tới section Ronaldo
  const ronaldoSection = $("ronaldo");
  if (ronaldoSection) {
    new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        const next = en.isIntersecting ? "football" : "code";
        if (next === bgMode) return;
        bgMode = next;

        const glyphs = currentGlyphs();
        bits.forEach(function (b) {
          if (Math.random() < 0.55) {
            b.text = glyphs[Math.floor(Math.random() * glyphs.length)];
          }
        });
      });
    }, {
      rootMargin: "-20% 0px -20% 0px",
      threshold: 0
    }).observe(ronaldoSection);
  }

  // =====================================
  // 12. KHỞI ĐỘNG
  // =====================================

  resizeAll();
  startBg();
})();
