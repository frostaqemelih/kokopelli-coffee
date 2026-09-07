(function () {
  "use strict";

  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };

  /* ============ Açılış efekti (loader) ============
     NK monogram halkası çizilir + marka adı + altın çizgi belirir
     → perde ortadan ikiye ayrılır → DOM'dan kaldırılır. */
  var loaderEl = document.getElementById("loader");
  function startHeroIntro() {
    var st = document.querySelector(".sh-stage");
    if (st) st.classList.add("is-in");
  }
  if (loaderEl) {
    var killLoader = function () {
      if (loaderEl && loaderEl.parentNode) loaderEl.parentNode.removeChild(loaderEl);
      loaderEl = null;
      if (document.body) document.body.classList.remove("loading");
      startHeroIntro();
    };
    if (reduceMotion) {
      killLoader();
    } else {
      if (document.body) document.body.classList.add("loading");
      requestAnimationFrame(function () { if (loaderEl) loaderEl.classList.add("is-ready"); });
      window.setTimeout(function () {
        if (loaderEl) loaderEl.classList.add("is-open");
        window.setTimeout(killLoader, 640);
      }, 1150);
    }
  } else {
    startHeroIntro();
  }

  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ============ Header ============ */
  var header = document.getElementById("site-header");
  if (header) {
    var onHeaderScroll = function () {
      header.classList.toggle("scrolled", window.scrollY > 8);
    };
    onHeaderScroll();
    window.addEventListener("scroll", onHeaderScroll, { passive: true });
  }

  /* ============ Mobil menü ============ */
  var navToggle = document.getElementById("nav-toggle");
  var navClose = document.getElementById("nav-close");
  var navMobile = document.getElementById("nav-mobile");
  function closeNav() {
    if (!navMobile) return;
    navMobile.classList.remove("open");
    navMobile.setAttribute("aria-hidden", "true");
    if (navToggle) navToggle.setAttribute("aria-expanded", "false");
  }
  if (navToggle && navMobile) {
    navToggle.addEventListener("click", function () {
      navMobile.classList.add("open");
      navMobile.setAttribute("aria-hidden", "false");
      navToggle.setAttribute("aria-expanded", "true");
    });
    if (navClose) navClose.addEventListener("click", closeNav);
    navMobile.querySelectorAll("a").forEach(function (a) { a.addEventListener("click", closeNav); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeNav(); });
  }

  /* ============ Başlıkları kelimelere böl (text reveal) ============ */
  document.querySelectorAll(".section-title").forEach(function (h) {
    var words = h.textContent.trim().split(/\s+/);
    h.textContent = "";
    words.forEach(function (word, i) {
      var w = document.createElement("span");
      w.className = "w";
      var inner = document.createElement("i");
      inner.textContent = word;
      inner.style.setProperty("--wi", i);
      w.appendChild(inner);
      h.appendChild(w);
      if (i < words.length - 1) h.appendChild(document.createTextNode(" "));
    });
  });

  /* ============ Scroll reveal (ilerlemeli geliştirme) ============ */
  var revealTargets = Array.prototype.slice.call(document.querySelectorAll(".reveal"));
  function armGroup(selector, dir) {
    document.querySelectorAll(selector).forEach(function (group) {
      Array.prototype.slice.call(group.children).forEach(function (child, i) {
        child.classList.add("reveal");
        if (dir) child.classList.add(dir);
        child.style.setProperty("--stagger", Math.min(i, 6));
        if (revealTargets.indexOf(child) === -1) revealTargets.push(child);
      });
    });
  }
  armGroup(".menu-col", "reveal-left");
  armGroup(".steps", "reveal-blur");
  armGroup(".lookbook", "reveal-scale");
  armGroup(".team", "reveal-blur");

  if (!reduceMotion) revealTargets.forEach(function (el) { el.classList.add("reveal-armed"); });

  function show(el) { el.classList.add("in-view"); }
  function inViewport(el) {
    var r = el.getBoundingClientRect();
    return r.top < (window.innerHeight || 0) - 40 && r.bottom > 0;
  }
  function sweep() {
    for (var i = revealTargets.length - 1; i >= 0; i--) {
      if (inViewport(revealTargets[i])) { show(revealTargets[i]); revealTargets.splice(i, 1); }
    }
  }

  if (reduceMotion || !("IntersectionObserver" in window)) {
    revealTargets.forEach(show);
    revealTargets = [];
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          show(entry.target); io.unobserve(entry.target);
          var k = revealTargets.indexOf(entry.target);
          if (k > -1) revealTargets.splice(k, 1);
        }
      });
    }, { threshold: 0.08, rootMargin: "0px 0px -50px 0px" });
    revealTargets.slice().forEach(function (el) { io.observe(el); });
    // Sağlamlık: IO tetiklenmezse scroll + zaman aşımı yedeği
    sweep();
    window.addEventListener("scroll", sweep, { passive: true });
    window.addEventListener("resize", sweep, { passive: true });
    window.setTimeout(function () {
      if (revealTargets.length) revealTargets.slice().forEach(show);
    }, 2600);
  }

  /* ============ SCROLL HERO — arka plan zoom-out + içerik süzülme ============
     Bölüm ~240vh; .sh-stage sticky. Kaydırma oranına göre arka plan
     görseli scale(1.14 → 1.0) ve içerik son %40'ta yukarı süzülür.
     Mobil / reduced-motion → CSS ile klasik hero (JS burada devre dışı). */
  var shero = document.querySelector(".scrollhero");
  var shLayer = shero && shero.querySelector(".sh-layer");
  var shContent = shero && shero.querySelector(".sh-content");
  var shHint = shero && shero.querySelector(".sh-hint");
  var heroScrubOn = shero && shLayer && !reduceMotion &&
    window.matchMedia("(min-width: 901px)").matches;
  if (heroScrubOn) {
    var scrubTick = false;
    var runScrub = function () {
      scrubTick = false;
      var total = shero.offsetHeight - window.innerHeight;
      if (total <= 0) return;
      var f = clamp(-shero.getBoundingClientRect().top / total, 0, 1);
      shLayer.style.transform = "scale(" + (1.14 - 0.14 * f).toFixed(4) + ")";
      var fade = clamp((f - 0.55) / 0.4, 0, 1);
      if (shContent) {
        shContent.style.opacity = (1 - fade).toFixed(3);
        shContent.style.transform = "translateY(" + (-fade * 46).toFixed(1) + "px)";
      }
      if (shHint) shHint.style.opacity = f > 0.04 ? "0" : "";
    };
    var onScrubScroll = function () {
      if (!scrubTick) { scrubTick = true; requestAnimationFrame(runScrub); }
    };
    runScrub();
    window.addEventListener("scroll", onScrubScroll, { passive: true });
    window.addEventListener("resize", onScrubScroll, { passive: true });
  }

  /* ============ Magnetik butonlar ============ */
  if (!reduceMotion && window.matchMedia("(pointer:fine)").matches) {
    document.querySelectorAll("[data-magnetic]").forEach(function (btn) {
      btn.addEventListener("mousemove", function (e) {
        var r = btn.getBoundingClientRect();
        var mx = e.clientX - r.left - r.width / 2;
        var my = e.clientY - r.top - r.height / 2;
        btn.style.transform = "translate(" + (mx * 0.25).toFixed(1) + "px," + (my * 0.35).toFixed(1) + "px)";
      });
      btn.addEventListener("mouseleave", function () { btn.style.transform = ""; });
    });
  }

  /* ============ Sayaçlar (Türkçe binlik ayracı) ============ */
  var counters = document.querySelectorAll("[data-count]");
  function animateCount(el) {
    var target = parseFloat(el.getAttribute("data-count"));
    if (isNaN(target)) return;
    var hasPlus = /\+/.test(el.textContent);
    var dur = 1100, start = null;
    function fmt(n) { try { return Math.round(n).toLocaleString("tr-TR"); } catch (e) { return String(Math.round(n)); } }
    function finalVal() { return fmt(target) + (hasPlus ? "+" : ""); }
    function step(ts) {
      if (start === null) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      el.textContent = fmt(target * (1 - Math.pow(1 - p, 3))) + (hasPlus ? "+" : "");
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
    /* Sağlamlık: rAF önizleme panelinde takılırsa nihai değeri garanti et */
    window.setTimeout(function () { if (el.textContent !== finalVal()) el.textContent = finalVal(); }, dur + 400);
  }
  if (counters.length && "IntersectionObserver" in window && !reduceMotion) {
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { animateCount(entry.target); cio.unobserve(entry.target); }
      });
    }, { threshold: 0.6 });
    counters.forEach(function (el) { cio.observe(el); });
  }

  /* ============ Randevu formu ============
     Form bilgileri hazır bir mesaj olarak WhatsApp'a taşınır. */
  var form = document.getElementById("contact-form");
  var successBox = document.getElementById("form-success");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var val = function (id) { var n = document.getElementById(id); return n ? n.value.trim() : ""; };
      var ad = val("ad"), telefon = val("telefon");
      if (!ad || !telefon) { document.getElementById(ad ? "telefon" : "ad").focus(); return; }
      var hizmet = val("konu"), tarih = val("tarih"), mesaj = val("mesaj");
      var lines = [
        "Merhaba, Kokopelli Coffee Co. için talebim var.",
        "Ad Soyad: " + ad,
        "Telefon: " + telefon
      ];
      if (hizmet) lines.push("Konu: " + hizmet);
      if (tarih) lines.push("Tarih / Kişi: " + tarih);
      if (mesaj) lines.push("Not: " + mesaj);
      window.open("https://wa.me/905529432416?text=" + encodeURIComponent(lines.join("\n")), "_blank", "noopener");
      if (successBox) successBox.classList.add("show");
      form.reset();
    });
  }
})();
