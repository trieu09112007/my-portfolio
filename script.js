// =====================================
// 01. MAIN ELEMENTS
// =====================================

const login = document.getElementById("login");
const content = document.getElementById("content");

const settingsBtn = document.getElementById("settingsBtn");
const panel = document.getElementById("settings");

// =====================================
// 02. INTRO SCREEN
// =====================================
const loadingScreen = document.getElementById("intro-screen");

function show() {
  content.hidden = false;
  settingsBtn.hidden = false;

  // Khởi tạo hiệu ứng xuất hiện khi cuộn
  intro();

  // Bắt đầu ẩn intro
  loadingScreen.classList.add("intro-leaving");

  setTimeout(() => {
    loadingScreen.hidden = true;
    document.body.classList.remove("is-loading");
  }, 700);
}

window.addEventListener("load", () => {
  setTimeout(show, 1500);
});

// =====================================
// 03. SETTINGS
// =====================================

const settings = {
  confetti: true,
  glow: true,
  sparkle: true
};

try {
  Object.assign(
    settings,
    JSON.parse(localStorage.getItem("fxSettings") || "{}")
  );
} catch (e) {}

function setPanel(open) {

  panel.classList.toggle("open", open);

  settingsBtn.setAttribute(
    "aria-expanded",
    String(open)
  );

}

function applySettings() {

  document.documentElement.classList.toggle(
    "no-glow",
    !settings.glow
  );

  panel.querySelectorAll("input[data-key]").forEach(box => {

    box.checked = !!settings[box.dataset.key];

  });

}

applySettings();

settingsBtn.addEventListener("click", function () {

  setPanel(!panel.classList.contains("open"));

});

document.addEventListener("keydown", function (e) {

  if (e.key === "Escape") {
    setPanel(false);
  }

});

document.addEventListener("pointerdown", function (e) {

  if (!panel.contains(e.target) && !settingsBtn.contains(e.target)) {
    setPanel(false);
  }

});

panel.addEventListener("change", function (e) {

  const key = e.target.dataset.key;

  if (!key) return;

  settings[key] = e.target.checked;

  try {

    localStorage.setItem(
      "fxSettings",
      JSON.stringify(settings)
    );

  } catch (err) {}

  if (!settings.confetti) parts = [];

  if (!settings.sparkle) dots = [];

  applySettings();

});

// =====================================
// 04. SCROLL REVEAL
// =====================================

function intro() {

  if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return;
  }

  if (content.dataset.ready) return;

  content.dataset.ready = "1";

  const io = new IntersectionObserver(function (entries) {

    entries.forEach(function (en) {

      if (en.isIntersecting) {

        en.target.classList.add("in");

        io.unobserve(en.target);

      }

    });

  }, {
    threshold: 0.12
  });

  document.querySelectorAll(
    "main > :not(.navbar):not(.hero):not(.footer)"
  ).forEach(function (el) {

    el.classList.add("reveal");

    io.observe(el);

  });

}

// Khôi phục phiên đăng nhập

try {

  if (sessionStorage.getItem("ok") === "1") {
    show();
  }

} catch (e) {}

// =====================================
// 05. CONFETTI EFFECT
// =====================================

const fx = document.getElementById("fx");
const ctx = fx.getContext("2d");

const colors = [
  "#58d6a0",
  "#e8c878",
  "#239b6a",
  "#e7f0eb",
  "#ff8b75"
];

const reduce = matchMedia(
  "(prefers-reduced-motion: reduce)"
);

let parts = [];
let running = false;

function resize() {

  const ratio = Math.min(devicePixelRatio || 1, 2);

  fx.width = innerWidth * ratio;
  fx.height = innerHeight * ratio;

  fx.style.width = innerWidth + "px";
  fx.style.height = innerHeight + "px";

  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

}

resize();

addEventListener("resize", resize);

function burst(x, y, n = 18) {

  if (!settings.confetti || reduce.matches) return;

  for (let i = 0; i < n; i++) {

    const a = Math.random() * Math.PI * 2;
    const s = 1 + Math.random() * 3;

    parts.push({

      x,
      y,

      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s - 3,

      w: 5 + Math.random() * 6,
      h: 3 + Math.random() * 4,

      r: Math.random() * 6.28,
      vr: (Math.random() - 0.5) * 0.4,

      life: 0,
      max: 100 + Math.random() * 40,

      color: colors[
        Math.floor(Math.random() * colors.length)
      ]

    });

  }

  if (!running) {

    running = true;

    requestAnimationFrame(frame);

  }

}

function frame() {

  ctx.clearRect(0, 0, innerWidth, innerHeight);

  parts = parts.filter(p => p.life < p.max);

  for (const p of parts) {

    p.vy += 0.25;
    p.vx *= 0.99;

    p.x += p.vx;
    p.y += p.vy;

    p.r += p.vr;
    p.life++;

    ctx.save();

    ctx.translate(p.x, p.y);
    ctx.rotate(p.r);

    ctx.globalAlpha = 1 - p.life / p.max;

    ctx.fillStyle = p.color;

    ctx.fillRect(
      -p.w / 2,
      -p.h / 2,
      p.w,
      p.h
    );

    ctx.restore();

  }

  if (parts.length) {

    requestAnimationFrame(frame);

  } else {

    running = false;

  }

}

// =====================================
// 06. CLICK EFFECT
// =====================================

document.addEventListener("pointerdown", function (e) {

  if (e.target.closest("#settings, #settingsBtn")) return;

  burst(e.clientX, e.clientY);

});

// =====================================
// 07. MOUSE GLOW
// =====================================

addEventListener("pointermove", function (e) {

  document.documentElement.style.setProperty(
    "--mx",
    e.clientX + "px"
  );

  document.documentElement.style.setProperty(
    "--my",
    e.clientY + "px"
  );

});

// =====================================
// 08. SPARKLE TRAIL
// =====================================

const tr = document.getElementById("trail");
const tctx = tr.getContext("2d");

const trailColors = [
  "#58d6a0",
  "#e8c878",
  "#e7f0eb",
  "#ff8b75"
];

let dots = [];
let trailRunning = false;

function resizeTrail() {

  const ratio = Math.min(devicePixelRatio || 1, 2);

  tr.width = innerWidth * ratio;
  tr.height = innerHeight * ratio;

  tr.style.width = innerWidth + "px";
  tr.style.height = innerHeight + "px";

  tctx.setTransform(ratio, 0, 0, ratio, 0, 0);

}

resizeTrail();

addEventListener("resize", resizeTrail);

addEventListener("pointermove", function (e) {

  if (reduce.matches) return;

  if (!settings.sparkle || content.hidden) return;

  if (
    e.target.closest &&
    e.target.closest("#settings, #settingsBtn")
  ) return;

  const box = content.getBoundingClientRect();

  // Không tạo hiệu ứng bên trong vùng nội dung chính

  if (
    e.clientX > box.left &&
    e.clientX < box.right
  ) return;

  for (let i = 0; i < 2; i++) {

    dots.push({

      x: e.clientX + (Math.random() - 0.5) * 10,
      y: e.clientY + (Math.random() - 0.5) * 10,

      vx: (Math.random() - 0.5) * 1.2,
      vy: (Math.random() - 0.5) * 1.2 + 0.3,

      r: 2 + Math.random() * 4,

      life: 0,
      max: 45 + Math.random() * 30,

      color: trailColors[
        Math.floor(Math.random() * trailColors.length)
      ]

    });

  }

  if (dots.length > 250) {

    dots.splice(0, dots.length - 250);

  }

  if (!trailRunning) {

    trailRunning = true;

    requestAnimationFrame(drawTrail);

  }

});

function drawTrail() {

  tctx.clearRect(0, 0, innerWidth, innerHeight);

  dots = dots.filter(d => d.life < d.max);

  for (const d of dots) {

    d.x += d.vx;
    d.y += d.vy;

    d.life++;

    const k = Math.max(
      0,
      1 - d.life / d.max
    );

    if (k === 0) continue;

    tctx.globalAlpha = k * 0.8;
    tctx.fillStyle = d.color;

    tctx.beginPath();

    tctx.arc(
      d.x,
      d.y,
      d.r * k,
      0,
      Math.PI * 2
    );

    tctx.fill();

  }

  tctx.globalAlpha = 1;

  if (dots.length) {

    requestAnimationFrame(drawTrail);

  } else {

    trailRunning = false;

  }

}
