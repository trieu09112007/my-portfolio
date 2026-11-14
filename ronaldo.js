// =====================================
// WORLD 01: CRISTIANO RONALDO
// =====================================

(function () {
  "use strict";

  const inner = document.getElementById("crInner");
  if (!inner) return;

  const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ----- 1. Màu nhấn đổi theo câu lạc bộ khi cuộn -----
  const eras = document.querySelectorAll(".cr-era");
  const eraObs = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (!en.isIntersecting) return;
      eras.forEach(function (e) { e.classList.toggle("active", e === en.target); });
      inner.style.setProperty("--cr", en.target.dataset.color);
    });
  }, { rootMargin: "-45% 0px -45% 0px" });
  eras.forEach(function (e) { eraObs.observe(e); });

  // ----- 2. Số liệu đếm lên -----
  function countUp(b) {
    const end = Number(b.dataset.count);
    const suffix = b.dataset.suffix || "";
    const t0 = performance.now();
    (function tick(now) {
      const p = Math.min(1, (now - t0) / 1400);
      b.textContent = Math.round(end * (1 - Math.pow(1 - p, 3))) + suffix;
      if (p < 1) requestAnimationFrame(tick);
    })(t0);
  }

  if (!calm) {
    const statObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        statObs.unobserve(en.target);
        countUp(en.target);
      });
    }, { threshold: 0.6 });

    document.querySelectorAll(".cr-stat b").forEach(function (b) {
      b.textContent = "0" + (b.dataset.suffix || "");
      statObs.observe(b);
    });
  }

  // ----- 3. Ảnh: ẩn khung chưa có ảnh -----
  document.querySelectorAll("figure[data-photo] img").forEach(function (img) {
    const fig = img.closest("figure");
    function missing() { fig.classList.add("missing"); }
    img.addEventListener("error", missing);
    if (img.complete && img.naturalWidth === 0) missing();
  });

  // ----- 4. Bấm ảnh trong thư viện để phóng to -----
  const dlg = document.getElementById("crLightbox");
  if (dlg && typeof dlg.showModal === "function") {
    const big = dlg.querySelector("img");
    const cap = dlg.querySelector("figcaption");

    function openShot(fig) {
      const img = fig.querySelector("img");
      big.src = img.currentSrc || img.src;
      big.alt = img.alt;
      cap.textContent = fig.querySelector("figcaption").textContent;
      dlg.showModal();
    }

    document.querySelectorAll(".cr-shot").forEach(function (fig) {
      fig.tabIndex = 0;
      fig.setAttribute("role", "button");
      fig.addEventListener("click", function () { openShot(fig); });
      fig.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openShot(fig); }
      });
    });

    dlg.addEventListener("click", function (e) {
      if (e.target === dlg || e.target.closest(".cr-lb-close")) dlg.close();
    });
  }
})();
