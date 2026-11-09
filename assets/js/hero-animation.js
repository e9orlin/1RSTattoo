/**
 * 1RS Tattoo Studio — Hero Video Autoplay & Parallax Controller
 * Ensures background video plays silently, looped, with subtle mouse tilt parallax.
 */

(function() {
  const video = document.querySelector('.hero-cinematic-video');
  const heroSection = document.getElementById('hero');

  if (video) {
    // Ensure video is muted and playing seamlessly
    video.muted = true;
    video.playsInline = true;
    video.loop = true;

    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        // Autoplay policy fallback: mute and retry
        video.muted = true;
        video.play();
      });
    }

    // Gentle subtle mouse parallax on desktop
    if (heroSection && window.matchMedia('(pointer: fine)').matches) {
      heroSection.addEventListener('mousemove', (e) => {
        const rect = heroSection.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        video.style.transform = `scale(1.02) translate(${x * -12}px, ${y * -8}px)`;
      });

      heroSection.addEventListener('mouseleave', () => {
        video.style.transform = 'scale(1.01) translate(0px, 0px)';
      });
    }
  }
})();
