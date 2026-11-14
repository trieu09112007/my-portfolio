// =====================================
// NAVBAR + NÚT LÊN ĐẦU TRANG
// =====================================
(function () {
  "use strict";

  const navToggle = document.getElementById("navToggle");
  const navLinks = document.getElementById("navLinks");
  const toTop = document.getElementById("toTop");
  if (!navToggle || !navLinks || !toTop) return;

  const reduce = matchMedia("(prefers-reduced-motion: reduce)");

  // ----- Mở / đóng menu trên màn hình hẹp -----
  function setNav(open) {
    navLinks.classList.toggle("open", open);
    navToggle.setAttribute("aria-expanded", String(open));
    navToggle.setAttribute("aria-label", open ? "Đóng menu" : "Mở menu");
  }

  navToggle.addEventListener("click", function () {
    setNav(!navLinks.classList.contains("open"));
  });

  // Chọn một mục thì đóng menu
  navLinks.addEventListener("click", function (e) {
    if (e.target.closest("a")) setNav(false);
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") setNav(false);
  });

  document.addEventListener("pointerdown", function (e) {
    if (!e.target.closest(".navbar")) setNav(false);
  });

  // Rộng ra bản desktop thì trả menu về trạng thái đóng
  matchMedia("(min-width: 1000px)").addEventListener("change", function () {
    setNav(false);
  });

  // ----- Tô sáng mục đang xem -----
  const spyLinks = new Map();
  navLinks.querySelectorAll("a[href^='#']").forEach(function (a) {
    spyLinks.set(a.getAttribute("href").slice(1), a);
  });

  const spy = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (!en.isIntersecting) return;
      spyLinks.forEach(function (a, id) {
        const on = id === en.target.id;
        a.classList.toggle("active", on);
        if (on) a.setAttribute("aria-current", "true");
        else a.removeAttribute("aria-current");
      });
    });
  }, { rootMargin: "-45% 0px -50% 0px" });

  spyLinks.forEach(function (a, id) {
    const el = document.getElementById(id);
    if (el) spy.observe(el);
  });

  const home = document.getElementById("home");   // về đầu trang thì bỏ tô sáng
  if (home) spy.observe(home);

  // ----- Nút lên đầu trang: hiện sau khi cuộn qua màn hình đầu tiên -----
  let shown = false;
  let queued = false;

  function check() {
    queued = false;
    const want = scrollY > 700;
    if (want !== shown) {
      shown = want;
      toTop.classList.toggle("show", want);
    }
  }

  addEventListener("scroll", function () {
    if (queued) return;
    queued = true;
    requestAnimationFrame(check);
  }, { passive: true });

  function goTop() {
    scrollTo({ top: 0, behavior: reduce.matches ? "auto" : "smooth" });
  }

  toTop.addEventListener("click", goTop);

  // Logo góc trái: bấm để về đầu trang
  const logo = document.querySelector(".navbar .intro-logo-up");
  if (logo) {
    logo.setAttribute("role", "link");
    logo.setAttribute("tabindex", "0");
    logo.setAttribute("aria-label", "Về đầu trang");
    logo.addEventListener("click", function () { setNav(false); goTop(); });
    logo.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setNav(false); goTop(); }
    });
  }
})();