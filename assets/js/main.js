/**
 * 1RS Tattoo Studio — Main Interactive Script
 */
(function () {
  "use strict";

  // 1. SCROLL REVEAL ANIMATIONS
  const observerCallback = (entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      }
    });
  };

  const revealObserver = new IntersectionObserver(observerCallback, {
    rootMargin: "0px 0px -60px 0px",
    threshold: 0.08
  });

  document.querySelectorAll(".fade-in-up").forEach(el => {
    revealObserver.observe(el);
  });

  setTimeout(() => {
    document.querySelectorAll(".fade-in-up").forEach(el => el.classList.add("visible"));
  }, 2500);

  // 2. STICKY HEADER & ACTIVE NAV SCROLLSPY
  const header = document.querySelector(".site-header");
  const navLinks = document.querySelectorAll(".nav-menu .nav-link");
  const sections = document.querySelectorAll("section[id]");

  function handleHeaderScroll() {
    const scrollY = window.pageYOffset || document.documentElement.scrollTop;
    if (header) {
      header.classList.toggle("scrolled", scrollY > 30);
    }

    let activeId = "";
    sections.forEach(sec => {
      const top = sec.offsetTop - 140;
      if (scrollY >= top && scrollY < top + sec.offsetHeight) {
        activeId = sec.getAttribute("id");
      }
    });

    navLinks.forEach(link => {
      link.classList.toggle("active", activeId && link.getAttribute("href") === "#" + activeId);
    });
  }

  window.addEventListener("scroll", handleHeaderScroll, { passive: true });
  handleHeaderScroll();

  // 3. MOBILE DRAWER
  const mobileToggle = document.querySelector(".mobile-toggle");
  const mobileDrawer = document.getElementById("mobile-drawer");
  const drawerLinks = document.querySelectorAll(".mobile-nav-link");

  function toggleDrawer(open) {
    if (!mobileDrawer || !mobileToggle) return;
    const shouldOpen = open !== undefined ? open : !mobileDrawer.classList.contains("open");
    mobileDrawer.classList.toggle("open", shouldOpen);
    mobileToggle.classList.toggle("active", shouldOpen);
    document.body.style.overflow = shouldOpen ? "hidden" : "";
  }

  if (mobileToggle) mobileToggle.addEventListener("click", () => toggleDrawer());
  drawerLinks.forEach(link => link.addEventListener("click", () => toggleDrawer(false)));

  // 4. STATS COUNTER ANIMATION
  const statNumbers = document.querySelectorAll(".stat-number[data-target]");
  let statsCounted = false;

  function countUp(el) {
    const target = parseFloat(el.getAttribute("data-target"));
    if (isNaN(target)) return;

    const duration = 1800;
    const startTime = performance.now();

    function update(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const currentVal = target * ease;

      if (target >= 1000) {
        el.textContent = (currentVal / 1000).toFixed(1) + "k";
      } else if (target === 100) {
        el.textContent = Math.round(currentVal) + "%";
      } else if (target === 49) {
        el.textContent = (currentVal / 10).toFixed(1) + "★";
      } else {
        el.textContent = Math.round(currentVal) + "+";
      }

      if (progress < 1) requestAnimationFrame(update);
    }

    requestAnimationFrame(update);
  }

  if (statNumbers.length > 0) {
    const statsObserver = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach(entry => {
          if (entry.isIntersecting && !statsCounted) {
            statsCounted = true;
            statNumbers.forEach(el => countUp(el));
            obs.disconnect();
          }
        });
      },
      { threshold: 0.3 }
    );

    const statsContainer = document.querySelector(".hero-stats-row");
    if (statsContainer) statsObserver.observe(statsContainer);
  }

  // 5. PORTFOLIO FILTERING
  const filterBtns = document.querySelectorAll(".filter-btn");
  const portfolioItems = document.querySelectorAll(".portfolio-item");

  filterBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      filterBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      const filter = btn.getAttribute("data-filter");
      portfolioItems.forEach(item => {
        const cat = item.getAttribute("data-category");
        const show = filter === "all" || cat === filter;

        if (show) {
          item.style.display = "";
          requestAnimationFrame(() => {
            item.style.opacity = "1";
            item.style.transform = "scale(1)";
          });
        } else {
          item.style.opacity = "0";
          item.style.transform = "scale(0.95)";
          setTimeout(() => { item.style.display = "none"; }, 300);
        }
      });
    });
  });

  // 6. LIGHTBOX MODAL
  const lightbox = document.getElementById("lightbox");
  const lightboxImg = document.getElementById("lightbox-img");
  const lightboxClose = document.querySelector(".lightbox-close");
  const lightboxBackdrop = document.querySelector(".lightbox-backdrop");

  function openLightbox(src, alt) {
    if (!lightbox || !lightboxImg) return;
    lightboxImg.src = src;
    lightboxImg.alt = alt || "1RS Tattoo";
    lightbox.classList.add("active");
    lightbox.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }

  function closeLightbox() {
    if (!lightbox) return;
    lightbox.classList.remove("active");
    lightbox.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  portfolioItems.forEach(item => {
    item.addEventListener("click", () => {
      const img = item.querySelector("img");
      if (img) openLightbox(img.src, img.alt);
    });
  });

  if (lightboxClose) lightboxClose.addEventListener("click", closeLightbox);
  if (lightboxBackdrop) lightboxBackdrop.addEventListener("click", closeLightbox);
  window.addEventListener("keydown", e => {
    if (e.key === "Escape" && lightbox && lightbox.classList.contains("active")) {
      closeLightbox();
    }
  });

  // 7. FAQ ACCORDION
  const faqItems = document.querySelectorAll(".faq-item");
  faqItems.forEach(item => {
    const headerBtn = item.querySelector(".faq-header");
    if (!headerBtn) return;

    headerBtn.addEventListener("click", () => {
      const isOpen = item.classList.contains("active");
      faqItems.forEach(other => { if (other !== item) other.classList.remove("active"); });
      item.classList.toggle("active", !isOpen);
    });
  });

  // 8. SMOOTH SCROLL
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener("click", function (e) {
      const targetId = this.getAttribute("href");
      if (targetId === "#" || targetId === "#top") {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      const targetElem = document.querySelector(targetId);
      if (targetElem) {
        e.preventDefault();
        const offsetPos = targetElem.getBoundingClientRect().top + window.pageYOffset - 80;
        window.scrollTo({ top: offsetPos, behavior: "smooth" });
      }
    });
  });

  // 9. INFINITE MASTER SLIDERS
  document.querySelectorAll(".slider-wrapper").forEach(slider => {
    const container = slider.querySelector(".slider-container");
    const prevBtn = slider.querySelector(".slider-arrow.prev");
    const nextBtn = slider.querySelector(".slider-arrow.next");
    const dotsContainer = slider.querySelector(".slider-dots-container");
    const dotsWrapper = slider.querySelector(".dots-wrapper");
    
    // Skip dot logic if they don't exist
    if (!container || !prevBtn || !nextBtn) return;

    let images = Array.from(container.querySelectorAll("img"));
    if (images.length === 0) return;

    // Клонирование для бесконечности
    const firstClone = images[0].cloneNode(true);
    const lastClone = images[images.length - 1].cloneNode(true);
    container.appendChild(firstClone);
    container.insertBefore(lastClone, images[0]);

    images = container.querySelectorAll("img");
    let currentIndex = 1;
    
    function updateLayout() {
      container.scrollTo({ left: currentIndex * container.clientWidth, behavior: "instant" });
    }
    updateLayout();

    // Render dots (removed)
    // Removed dot rendering and updating logic
    
    function smoothScroll(element, target, duration) {
        const start = element.scrollLeft;
        const change = target - start;
        const startTime = performance.now();

        function animate(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // Ease out cubic
            const ease = 1 - Math.pow(1 - progress, 3);
            element.scrollLeft = start + change * ease;
            if (progress < 1) requestAnimationFrame(animate);
        }
        requestAnimationFrame(animate);
    }

    function move(dir) {
      currentIndex += dir;
      const target = currentIndex * container.clientWidth;
      smoothScroll(container, target, 350);
    }

    container.addEventListener('scroll', () => {
        const scrollLeft = container.scrollLeft;
        const width = container.clientWidth;
        
        // Добавляем небольшой допуск (10px) для корректного срабатывания на краях
        if (scrollLeft <= 5) {
            currentIndex = images.length - 2;
            container.scrollLeft = currentIndex * width;
        } else if (scrollLeft >= (container.scrollWidth - width - 5)) {
            currentIndex = 1;
            container.scrollLeft = currentIndex * width;
        } else {
            currentIndex = Math.round(scrollLeft / width);
        }
    }, {passive: true});

    prevBtn.addEventListener("click", (e) => { e.preventDefault(); move(-1); });
    nextBtn.addEventListener("click", (e) => { e.preventDefault(); move(1); });
    
    images.forEach(img => {
      img.addEventListener("click", () => openLightbox(img.src, img.alt));
    });
  });

  // 10. PORTFOLIO ITEM TRANSITION STYLES
  portfolioItems.forEach(item => {
    item.style.transition = "opacity 0.35s ease, transform 0.35s ease";
  });

  // 11. LOAD MORE PORTFOLIO
  const loadMoreBtn = document.getElementById("load-more-portfolio");
  let allPortfolioItems = Array.from(document.querySelectorAll(".portfolio-item"));
  let visibleCount = 8;
  
  // Set initial visibility via JS to ensure control
  allPortfolioItems.forEach((item, index) => {
      if (index >= visibleCount) item.style.display = "none";
      else item.style.display = "block";
  });

  if (loadMoreBtn) {
    loadMoreBtn.addEventListener("click", () => {
        let itemsToShow = 16;
        let showed = 0;
        allPortfolioItems.forEach((item) => {
            if (item.style.display === "none" && showed < itemsToShow) {
                item.style.display = "block";
                item.style.opacity = "1";
                showed++;
            }
        });
        
        // Check if any items remain hidden
        const remaining = allPortfolioItems.filter(item => item.style.display === "none");
        if (remaining.length === 0) {
            loadMoreBtn.style.display = "none";
            const fader = document.querySelector(".portfolio-grid-fader");
            if (fader) fader.classList.remove("portfolio-grid-fader");
        }
    });
  }

})();
