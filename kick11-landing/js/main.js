(function () {
  'use strict';

  var WHATSAPP_NUMBER = '972553068678';

  /* ---------- Mobile nav ---------- */
  var navToggle = document.getElementById('navToggle');
  var siteNav = document.getElementById('siteNav');

  navToggle.addEventListener('click', function () {
    var isOpen = siteNav.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  });
  siteNav.querySelectorAll('a').forEach(function (a) {
    a.addEventListener('click', function () {
      siteNav.classList.remove('open');
      navToggle.setAttribute('aria-expanded', 'false');
    });
  });

  /* ---------- Carousel ---------- */
  var carousel = document.getElementById('carousel');
  var cards = Array.prototype.slice.call(carousel.querySelectorAll('.jersey-card'));
  var dotsWrap = document.getElementById('carouselDots');
  var prevBtn = document.getElementById('prevBtn');
  var nextBtn = document.getElementById('nextBtn');

  cards.forEach(function (_, i) {
    var dot = document.createElement('span');
    dot.setAttribute('role', 'button');
    dot.setAttribute('tabindex', '0');
    dot.setAttribute('aria-label', 'עבור לג\'רסי ' + (i + 1));
    dot.addEventListener('click', function () { scrollToCard(i); });
    dot.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); scrollToCard(i); }
    });
    dotsWrap.appendChild(dot);
  });
  var dots = Array.prototype.slice.call(dotsWrap.children);

  function cardStep() {
    return cards[0].getBoundingClientRect().width + 24;
  }

  function scrollToCard(index) {
    var step = cardStep();
    carousel.scrollTo({ left: -index * step, behavior: 'smooth' });
  }

  function currentIndex() {
    var step = cardStep();
    return Math.round(Math.abs(carousel.scrollLeft) / step);
  }

  function updateDots() {
    var idx = Math.min(currentIndex(), dots.length - 1);
    dots.forEach(function (d, i) { d.classList.toggle('active', i === idx); });
  }

  var scrollTimer;
  carousel.addEventListener('scroll', function () {
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(updateDots, 80);
  });

  nextBtn.addEventListener('click', function () {
    var next = Math.min(currentIndex() + 1, cards.length - 1);
    scrollToCard(next);
  });
  prevBtn.addEventListener('click', function () {
    var prev = Math.max(currentIndex() - 1, 0);
    scrollToCard(prev);
  });

  carousel.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowLeft') { e.preventDefault(); nextBtn.click(); }
    if (e.key === 'ArrowRight') { e.preventDefault(); prevBtn.click(); }
  });

  updateDots();

  /* ---------- DM / WhatsApp modal ---------- */
  var overlay = document.getElementById('modalOverlay');
  var modalJerseyName = document.getElementById('modalJerseyName');
  var whatsappLink = document.getElementById('whatsappLink');
  var lastFocused = null;

  function openModal(jersey) {
    lastFocused = document.activeElement;
    var name = jersey || 'אחת הג\'רסיות';
    modalJerseyName.textContent = name;
    var msg = jersey ? ('Hi, interested in ' + jersey) : 'Hi, I\'m interested in KICK11';
    whatsappLink.href = 'https://wa.me/' + WHATSAPP_NUMBER + '?text=' + encodeURIComponent(msg);
    overlay.classList.add('active');
    document.getElementById('modalClose').focus();
  }

  function closeModal() {
    overlay.classList.remove('active');
    if (lastFocused) lastFocused.focus();
  }

  document.querySelectorAll('.open-modal').forEach(function (btn) {
    btn.addEventListener('click', function () {
      openModal(btn.getAttribute('data-jersey') || '');
    });
  });

  document.getElementById('modalClose').addEventListener('click', closeModal);
  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) closeModal();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && overlay.classList.contains('active')) closeModal();
  });
})();
