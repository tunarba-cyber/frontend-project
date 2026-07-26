(() => {
  "use strict";

  const burgerBtn   = document.getElementById("burgerBtn");
  const navLinks    = document.getElementById("navLinks");
  const navBackdrop = document.getElementById("navBackdrop");

  if (!burgerBtn || !navLinks || !navBackdrop) return;

  function closeNav() {
    burgerBtn.classList.remove("is-open");
    burgerBtn.setAttribute("aria-expanded", "false");
    navLinks.classList.remove("is-open");
    navBackdrop.classList.remove("is-open");
  }

  function openNav() {
    burgerBtn.classList.add("is-open");
    burgerBtn.setAttribute("aria-expanded", "true");
    navLinks.classList.add("is-open");
    navBackdrop.classList.add("is-open");
  }

  burgerBtn.addEventListener("click", () => {
    if (navLinks.classList.contains("is-open")) {
      closeNav();
    } else {
      openNav();
    }
  });

  navBackdrop.addEventListener("click", closeNav);

  navLinks.querySelectorAll("a").forEach(link => {
    link.addEventListener("click", closeNav);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && navLinks.classList.contains("is-open")) closeNav();
  });
})();