/**
 * 1RS Tattoo Studio — Main UI Logic
 * Sticky header, ScrollSpy, Scroll Reveal, Hero Stats Animation, Lightbox, FAQ, Booking Form
 */

document.addEventListener('DOMContentLoaded', () => {
  // =========================================================================
  // 1. STICKY HEADER & SCROLLSPY
  // =========================================================================
  const header = document.querySelector('.site-header');
  const navLinks = document.querySelectorAll('.nav-menu .nav-link');
  const sections = document.querySelectorAll('section[id]');

  function onScroll() {
    const scrollY = window.scrollY;

    // Header blur & padding transition
    if (scrollY > 30) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }

    // ScrollSpy: highlight active link in header
    let currentSectionId = '';
    sections.forEach(section => {
      const top = section.offsetTop - 120;
      const height = section.offsetHeight;
      if (scrollY >= top && scrollY < top + height) {
        currentSectionId = section.getAttribute('id');
      }
    });

    navLinks.forEach(link => {
      link.classList.remove('active');
      const href = link.getAttribute('href');
      if (href === `#${currentSectionId}`) {
        link.classList.add('active');
      }
    });

    // Floating Dock visibility:
    // 1. Hidden on Hero section (top 260px) so it NEVER covers the main CTA buttons on mobile!
    // 2. Hidden in Try-on section so it NEVER covers camera/upload buttons or handles!
    // 3. Visible everywhere else (About, Masters, Portfolio, Calculator, FAQ, Contact)
    const floatingDock = document.querySelector('.floating-quick-dock');
    if (floatingDock) {
      if (scrollY < 260 || currentSectionId === 'tryon') {
        floatingDock.classList.add('dock-hidden');
      } else {
        floatingDock.classList.remove('dock-hidden');
      }
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // =========================================================================
  // 2. MOBILE DRAWER TOGGLE
  // =========================================================================
  const mobileToggle = document.querySelector('.mobile-toggle');
  const mobileDrawer = document.querySelector('.mobile-drawer');
  const mobileNavLinks = document.querySelectorAll('.mobile-nav-link');

  if (mobileToggle && mobileDrawer) {
    mobileToggle.addEventListener('click', () => {
      const isOpen = mobileDrawer.classList.contains('open');
      mobileToggle.classList.toggle('active', !isOpen);
      mobileDrawer.classList.toggle('open', !isOpen);
      document.body.style.overflow = !isOpen ? 'hidden' : '';
    });

    mobileNavLinks.forEach(link => {
      link.addEventListener('click', () => {
        mobileToggle.classList.remove('active');
        mobileDrawer.classList.remove('open');
        document.body.style.overflow = '';
      });
    });
  }

  // Smooth Scroll to Top on Brand Logo Click
  const brandLogos = document.querySelectorAll('.brand-logo');
  brandLogos.forEach(logo => {
    logo.addEventListener('click', (e) => {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });

  // =========================================================================
  // 3. SCROLL REVEAL ANIMATIONS (IntersectionObserver)
  // =========================================================================
  const revealElements = document.querySelectorAll(
    '.reveal, .standard-card, .master-card, .review-card, .calc-step-box, .calc-result-box, .contact-detail-item, .faq-item'
  );

  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          observer.unobserve(entry.target);
        }
      });
    }, {
      rootMargin: '0px 0px -40px 0px',
      threshold: 0.08
    });

    revealElements.forEach((el, index) => {
      el.classList.add('reveal');
      // Apply subtle stagger to children in grids
      if (index % 4 === 1) el.classList.add('reveal-delay-1');
      if (index % 4 === 2) el.classList.add('reveal-delay-2');
      if (index % 4 === 3) el.classList.add('reveal-delay-3');
      revealObserver.observe(el);
    });
  } else {
    // Fallback for older browsers
    revealElements.forEach(el => el.classList.add('in-view'));
  }

  // =========================================================================
  // 4. ANIMATED STATS COUNTER IN HERO
  // =========================================================================
  const statItems = document.querySelectorAll('.hero-stat-item .stat-value');
  let statsAnimated = false;

  function animateStats() {
    if (statsAnimated) return;
    statsAnimated = true;

    statItems.forEach(item => {
      const text = item.textContent.trim();
      const match = text.match(/([\d\.]+)/);
      if (!match) return;

      const targetNum = parseFloat(match[1]);
      const suffix = text.replace(match[1], '');
      const isFloat = match[1].includes('.');
      const startTime = performance.now();
      const duration = 1600;

      function updateCounter(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // Easing: easeOutCubic
        const ease = 1 - Math.pow(1 - progress, 3);
        const currentVal = (targetNum * ease);

        const formatted = isFloat ? currentVal.toFixed(1) : Math.floor(currentVal);
        item.innerHTML = `${formatted}<span>${suffix}</span>`;

        if (progress < 1) {
          requestAnimationFrame(updateCounter);
        } else {
          const finalVal = isFloat ? targetNum.toFixed(1) : targetNum;
          item.innerHTML = `${finalVal}<span>${suffix}</span>`;
        }
      }

      requestAnimationFrame(updateCounter);
    });
  }

  // Trigger stats counter
  setTimeout(animateStats, 300);

  // =========================================================================
  // 5. PORTFOLIO FILTERS
  // =========================================================================
  const filterBtns = document.querySelectorAll('.filter-btn');
  const portfolioItems = document.querySelectorAll('.portfolio-item');

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const filter = btn.getAttribute('data-filter');
      portfolioItems.forEach(item => {
        const cat = item.getAttribute('data-category');
        if (filter === 'all' || cat === filter) {
          item.style.display = 'block';
          item.style.animation = 'fadeInUp 0.4s ease forwards';
        } else {
          item.style.display = 'none';
        }
      });
    });
  });

  // =========================================================================
  // 6. LIGHTBOX MODAL
  // =========================================================================
  const lightboxModal = document.getElementById('lightbox-modal');
  const lightboxImg = document.getElementById('lightbox-img');
  const lightboxCaption = document.getElementById('lightbox-caption');
  const modalCloseBtns = document.querySelectorAll('.modal-close-btn');

  portfolioItems.forEach(item => {
    item.addEventListener('click', () => {
      const img = item.querySelector('img');
      const title = item.querySelector('.portfolio-title')?.textContent || 'Татуировка 1RS';
      const tag = item.querySelector('.portfolio-tag')?.textContent || 'Галерея';

      if (lightboxModal && lightboxImg && img) {
        lightboxImg.src = img.src;
        if (lightboxCaption) {
          lightboxCaption.innerHTML = `<div><strong>${title}</strong><div style="font-size:0.8rem;color:var(--accent-gold);margin-top:2px;">Стиль: ${tag}</div></div>`;
        }
        lightboxModal.classList.add('open');
      }
    });
  });

  // =========================================================================
  // 7. BOOKING MODAL TRIGGERS
  // =========================================================================
  const bookingModal = document.getElementById('booking-modal');
  const openBookingBtns = document.querySelectorAll('.open-booking-modal');

  openBookingBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const masterName = btn.getAttribute('data-master-name');
      if (masterName) {
        const masterSelect = document.getElementById('modal-master-select');
        if (masterSelect) masterSelect.value = masterName;
      }
      if (bookingModal) bookingModal.classList.add('open');
    });
  });

  // Close modals
  modalCloseBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      if (lightboxModal) lightboxModal.classList.remove('open');
      if (bookingModal) bookingModal.classList.remove('open');
    });
  });

  document.querySelectorAll('.modal-backdrop').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('open');
      }
    });
  });

  // Escape key closes modals
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (lightboxModal) lightboxModal.classList.remove('open');
      if (bookingModal) bookingModal.classList.remove('open');
      const mobileSimModal = document.getElementById('mobile-sim-modal');
      if (mobileSimModal) {
        mobileSimModal.classList.remove('open');
        document.body.style.overflow = '';
      }
    }
  });

  // =========================================================================
  // 8. FAQ ACCORDION
  // =========================================================================
  const faqItems = document.querySelectorAll('.faq-item');
  faqItems.forEach(item => {
    const header = item.querySelector('.faq-header');
    header.addEventListener('click', () => {
      const isActive = item.classList.contains('active');
      faqItems.forEach(i => i.classList.remove('active'));
      if (!isActive) item.classList.add('active');
    });
  });

  // =========================================================================
  // 9. MOBILE PREVIEW SIMULATOR (iPhone Frame)
  // =========================================================================
  const mobileSimModal = document.getElementById('mobile-sim-modal');
  const openSimBtns = document.querySelectorAll('.open-mobile-sim-btn');
  const closeSimBtn = document.getElementById('btn-close-sim');
  const rotateSimBtn = document.getElementById('btn-rotate-sim');
  const simDevice = document.getElementById('mobile-sim-device');
  const simIframe = document.getElementById('mobile-sim-iframe');

  // If already inside simulator iframe, hide simulator open buttons
  if (window.location.search.includes('in_simulator=1')) {
    openSimBtns.forEach(btn => btn.style.display = 'none');
    const dock = document.querySelector('.floating-quick-dock');
    if (dock) dock.style.display = 'none';
  }

  openSimBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      if (mobileSimModal && simIframe) {
        if (!simIframe.src || simIframe.src === 'about:blank') {
          simIframe.src = 'index.html?in_simulator=1';
        }
        mobileSimModal.classList.add('open');
        document.body.style.overflow = 'hidden';
      }
    });
  });

  if (closeSimBtn && mobileSimModal) {
    closeSimBtn.addEventListener('click', () => {
      mobileSimModal.classList.remove('open');
      document.body.style.overflow = '';
    });
  }

  if (rotateSimBtn && simDevice) {
    rotateSimBtn.addEventListener('click', () => {
      simDevice.classList.toggle('landscape');
    });
  }

  if (mobileSimModal) {
    mobileSimModal.addEventListener('click', (e) => {
      if (e.target === mobileSimModal) {
        mobileSimModal.classList.remove('open');
        document.body.style.overflow = '';
      }
    });
  }

  // =========================================================================
  // 10. TOAST NOTIFICATIONS & BOOKING FORMS
  // =========================================================================
  function showToast(message) {
    let toast = document.querySelector('.toast-notice');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'toast-notice';
      document.body.appendChild(toast);
    }
    toast.innerHTML = `<span style="color:var(--accent-gold)">✓</span> ${message}`;
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, 4500);
  }

  const bookingForms = document.querySelectorAll('form.booking-form, form#modal-booking-form, form#contact-booking-form');
  bookingForms.forEach(form => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const nameInput = form.querySelector('input[name="name"]');
      const phoneInput = form.querySelector('input[name="phone"]');
      const masterInput = form.querySelector('select[name="master"]');

      const name = nameInput ? nameInput.value.trim() : 'Гость';
      const phone = phoneInput ? phoneInput.value.trim() : '';
      const master = masterInput ? masterInput.value : 'Любой мастер';

      showToast(`Спасибо, ${name}! Заявка принята. Администратор свяжется с вами в течение 10 минут.`);
      if (bookingModal) bookingModal.classList.remove('open');
      form.reset();

      setTimeout(() => {
        const confirmTg = confirm('Хотите продублировать вашу заявку напрямую мастеру в Telegram для ускоренного ответа?');
        if (confirmTg) {
          const text = encodeURIComponent(`Здравствуйте! Меня зовут ${name}. Хочу записаться на сеанс (Мастер: ${master}, Телефон: ${phone}).`);
          window.open(`https://t.me/tattoo1rs?text=${text}`, '_blank');
        }
      }, 900);
    });
  });
});
