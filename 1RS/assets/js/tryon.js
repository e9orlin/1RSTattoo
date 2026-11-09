/**
 * 1RS Tattoo Studio — Virtual Tattoo Try-on Tool ("Примерка эскиза")
 * Zero preloaded default samples: starts in clean prompt state.
 * Allows taking real camera photos or uploading files for both body and sketch.
 * Dual-layer architecture:
 * Layer 1 (Tattoo Render): Active CSS mix-blend-mode (multiply / screen / normal) directly composited on skin.
 * Layer 2 (Controls Layer): Bounding box & 8 handles with normal blend, always crisp white & easy to click.
 * Features:
 * - Real-time canvas white/gray paper background cutoff slider ("Усиление умножения / Отсечение фона")
 * - Color Inversion (Negative) toggle for dark backgrounds / white lines (monochrome icon)
 * - Independent single-axis width/height stretch & freeform scaling
 * - 360° rotation stem
 * - Pixel-accurate HD download export
 */

(function() {
  // Elements
  const bodyBg = document.getElementById('tryon-body-bg');
  const tattooLayer = document.getElementById('tryon-tattoo-layer');
  const controlsLayer = document.getElementById('tryon-controls-layer');
  const sketchImg = document.getElementById('tryon-sketch-img');
  const canvasContainer = document.getElementById('tryon-canvas-container');

  // Empty State & Banner
  const emptyState = document.getElementById('tryon-empty-state');
  const sketchPromptBanner = document.getElementById('sketch-prompt-banner');

  // Controls Inputs
  const inputBodyCamera = document.getElementById('input-body-camera');
  const inputBodyFile = document.getElementById('input-body-file');
  const inputSketchCamera = document.getElementById('input-sketch-camera');
  const inputSketchFile = document.getElementById('input-sketch-file');

  const dropzoneBody = document.getElementById('dropzone-body');
  const dropzoneSketch = document.getElementById('dropzone-sketch');
  const bodyStatusBadge = document.getElementById('body-status-badge');
  const sketchStatusBadge = document.getElementById('sketch-status-badge');
  const btnRemoveBody = document.getElementById('btn-remove-body');
  const btnRemoveSketch = document.getElementById('btn-remove-sketch');

  const sliderThreshold = document.getElementById('slider-bg-threshold');
  const thresholdValDisplay = document.getElementById('bg-threshold-val');
  const btnToggleInvert = document.getElementById('btn-toggle-invert');
  const sliderOpacity = document.getElementById('slider-opacity');
  const opacityValDisplay = document.getElementById('opacity-val');
  const blendPills = document.querySelectorAll('.blend-pill');

  const btnToggleHandles = document.getElementById('btn-toggle-handles');
  const btnResetTransform = document.getElementById('btn-reset-transform-view');
  const btnDownloadResult = document.getElementById('btn-download-tryon');
  const btnSendTelegram = document.getElementById('btn-send-tryon-tg');

  if (!tattooLayer || !sketchImg || !bodyBg) return;

  // Master State
  const state = {
    x: 0,
    y: 0,
    width: 220,
    height: 290,
    rotation: 0,
    opacity: 0.92,
    blendMode: 'multiply',
    threshold: 225,
    inverted: false,
    showHandles: true,
    hasBody: false,
    hasSketch: false,
    rawSketchUrl: null
  };

  // =========================================================================
  // REAL-TIME CANVAS WHITE BACKGROUND CUTOFF & INVERSION ALGORITHM
  // Physically strips away paper background to transparent alpha in memory,
  // making Multiply 100% effective on any photo/scan!
  // =========================================================================
  let isProcessing = false;
  let nextProcessRequested = false;

  function processSketchBackground(callback) {
    if (!state.rawSketchUrl) return;
    if (isProcessing) {
      nextProcessRequested = true;
      return;
    }
    isProcessing = true;

    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const offCanvas = document.createElement('canvas');
        const w = img.naturalWidth || img.width || 600;
        const h = img.naturalHeight || img.height || 800;
        offCanvas.width = w;
        offCanvas.height = h;
        const ctx = offCanvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);

        const imgData = ctx.getImageData(0, 0, w, h);
        const data = imgData.data;
        const thresh = Number(state.threshold);
        const isInverted = Boolean(state.inverted);

        for (let i = 0; i < data.length; i += 4) {
          let r = data[i];
          let g = data[i + 1];
          let b = data[i + 2];
          let a = data[i + 3];

          // Skip already transparent pixels
          if (a === 0) continue;

          // Invert colors if Negative mode is active
          if (isInverted) {
            r = 255 - r;
            g = 255 - g;
            b = 255 - b;
          }

          // Perceptual brightness formula
          const lum = 0.299 * r + 0.587 * g + 0.114 * b;

          // Background cutoff threshold
          if (lum >= thresh) {
            // Pure transparency for paper/white background
            data[i + 3] = 0;
          } else if (lum > thresh - 25) {
            // Anti-aliased feathering on the edges of the ink
            const factor = (thresh - lum) / 25;
            data[i] = r;
            data[i + 1] = g;
            data[i + 2] = b;
            data[i + 3] = Math.round(a * factor);
          } else {
            // Ink contour: boost contrast and depth
            data[i] = Math.max(0, r - 10);
            data[i + 1] = Math.max(0, g - 10);
            data[i + 2] = Math.max(0, b - 10);
            data[i + 3] = a;
          }
        }

        ctx.putImageData(imgData, 0, 0);
        const processedUrl = offCanvas.toDataURL('image/png');
        sketchImg.src = processedUrl;
        if (callback) callback(processedUrl);
      } catch (err) {
        // Fallback to source if canvas access blocked
        sketchImg.src = state.rawSketchUrl;
        if (callback) callback(state.rawSketchUrl);
      } finally {
        isProcessing = false;
        if (nextProcessRequested) {
          nextProcessRequested = false;
          processSketchBackground();
        }
      }
    };

    img.onerror = () => {
      sketchImg.src = state.rawSketchUrl;
      isProcessing = false;
      if (callback) callback(state.rawSketchUrl);
    };

    img.src = state.rawSketchUrl;
  }

  // =========================================================================
  // SYNCHRONIZED TRANSFORM FOR BOTH LAYERS
  // =========================================================================
  function applyTransform() {
    const transformStr = `translate(-50%, -50%) translate3d(${state.x}px, ${state.y}px, 0) rotate(${state.rotation}deg)`;

    // Layer 1: Tattoo Render Layer (Blends directly with bodyBg)
    tattooLayer.style.width = `${state.width}px`;
    tattooLayer.style.height = `${state.height}px`;
    tattooLayer.style.transform = transformStr;
    tattooLayer.style.opacity = state.opacity;
    tattooLayer.style.mixBlendMode = state.blendMode;

    // Layer 2: Transform Controls Layer (Handles & Outline - Unaffected by blendMode!)
    if (controlsLayer) {
      controlsLayer.style.width = `${state.width}px`;
      controlsLayer.style.height = `${state.height}px`;
      controlsLayer.style.transform = transformStr;

      if (state.showHandles) {
        controlsLayer.classList.remove('hide-handles');
      } else {
        controlsLayer.classList.add('hide-handles');
      }
    }
  }

  function initPosition() {
    state.x = 0;
    state.y = 0;
    state.width = 220;
    state.height = 290;
    state.rotation = 0;
    applyTransform();
  }

  // =========================================================================
  // VIEWPORT STAGE VISIBILITY CONTROLLER
  // =========================================================================
  function updateViewportVisibility() {
    if (!state.hasBody) {
      if (bodyBg) bodyBg.style.display = 'none';
      if (emptyState) emptyState.style.display = 'flex';
      if (sketchPromptBanner) sketchPromptBanner.style.display = 'none';
      if (tattooLayer) tattooLayer.style.display = 'none';
      if (controlsLayer) controlsLayer.style.display = 'none';

      if (bodyStatusBadge) bodyStatusBadge.style.display = 'none';
      if (dropzoneBody) dropzoneBody.style.display = 'block';
    } else {
      if (bodyBg) bodyBg.style.display = 'block';
      if (emptyState) emptyState.style.display = 'none';
      if (bodyStatusBadge) bodyStatusBadge.style.display = 'flex';
      if (dropzoneBody) dropzoneBody.style.display = 'none';

      if (!state.hasSketch) {
        if (sketchPromptBanner) sketchPromptBanner.style.display = 'flex';
        if (tattooLayer) tattooLayer.style.display = 'none';
        if (controlsLayer) controlsLayer.style.display = 'none';
      } else {
        if (sketchPromptBanner) sketchPromptBanner.style.display = 'none';
        if (tattooLayer) tattooLayer.style.display = 'block';
        if (controlsLayer) controlsLayer.style.display = 'block';
        applyTransform();
      }
    }

    if (state.hasSketch) {
      if (sketchStatusBadge) sketchStatusBadge.style.display = 'flex';
      if (dropzoneSketch) dropzoneSketch.style.display = 'none';
    } else {
      if (sketchStatusBadge) sketchStatusBadge.style.display = 'none';
      if (dropzoneSketch) dropzoneSketch.style.display = 'block';
    }
  }

  // =========================================================================
  // INTERACTIVE HANDLES & DRAGGING (On controlsLayer with Multi-Touch Support)
  // =========================================================================
  let isInteracting = false;
  let interactionType = null;
  let startX = 0, startY = 0;
  let initWidth = 0, initHeight = 0, initX = 0, initY = 0;
  let initRotation = 0;
  let initPinchDist = 0;
  let initPinchAngle = 0;
  let layerCenter = { x: 0, y: 0 };

  function onPointerDown(e, type) {
    if (e.cancelable) e.preventDefault();
    e.stopPropagation();
    isInteracting = true;

    // Check for Two-Finger Pinch / Twist on mobile
    if (e.touches && e.touches.length >= 2) {
      interactionType = 'pinch';
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      initPinchDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      initPinchAngle = Math.atan2(t2.clientY - t1.clientY, t2.clientX - t1.clientX);
      initWidth = state.width;
      initHeight = state.height;
      initRotation = state.rotation;
      initX = state.x;
      initY = state.y;
      startX = (t1.clientX + t2.clientX) / 2;
      startY = (t1.clientY + t2.clientY) / 2;
    } else {
      interactionType = type;
      const pageX = e.touches ? e.touches[0].clientX : e.clientX;
      const pageY = e.touches ? e.touches[0].clientY : e.clientY;

      startX = pageX;
      startY = pageY;
      initX = state.x;
      initY = state.y;
      initWidth = state.width;
      initHeight = state.height;
      initRotation = state.rotation;

      const targetEl = controlsLayer || tattooLayer;
      const rect = targetEl.getBoundingClientRect();
      layerCenter = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      };
    }

    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup', onPointerUp);
    window.addEventListener('touchmove', onPointerMove, { passive: false });
    window.addEventListener('touchend', onPointerUp);
    window.addEventListener('touchcancel', onPointerUp);
  }

  function onPointerMove(e) {
    if (!isInteracting) return;
    if (e.cancelable) e.preventDefault();

    // Two-Finger Pinch Scaling & Rotation
    if (interactionType === 'pinch' && e.touches && e.touches.length >= 2) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const curDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      const curAngle = Math.atan2(t2.clientY - t1.clientY, t2.clientX - t1.clientX);

      if (initPinchDist > 15) {
        const ratio = curDist / initPinchDist;
        state.width = Math.max(50, Math.round(initWidth * ratio));
        state.height = Math.max(50, Math.round(initHeight * ratio));
      }

      const deltaDeg = (curAngle - initPinchAngle) * (180 / Math.PI);
      state.rotation = Math.round(initRotation + deltaDeg);

      // Two-finger smooth translation
      const curMidX = (t1.clientX + t2.clientX) / 2;
      const curMidY = (t1.clientY + t2.clientY) / 2;
      state.x = initX + (curMidX - startX);
      state.y = initY + (curMidY - startY);

      applyTransform();
      return;
    }

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const dx = clientX - startX;
    const dy = clientY - startY;

    if (interactionType === 'drag') {
      state.x = initX + dx;
      state.y = initY + dy;
    } else if (interactionType === 'rotate') {
      const angleRad = Math.atan2(clientY - layerCenter.y, clientX - layerCenter.x);
      let deg = angleRad * (180 / Math.PI) + 90;
      state.rotation = Math.round(deg);
    } else if (interactionType && interactionType.startsWith('scale')) {
      const rad = (state.rotation * Math.PI) / 180;
      const localDx = dx * Math.cos(-rad) - dy * Math.sin(-rad);
      const localDy = dx * Math.sin(-rad) + dy * Math.cos(-rad);

      // Side Handles: Independent Single-Axis Stretching
      if (interactionType === 'scale-mr') {
        state.width = Math.max(50, Math.round(initWidth + localDx * 1.6));
      } else if (interactionType === 'scale-ml') {
        state.width = Math.max(50, Math.round(initWidth - localDx * 1.6));
      } else if (interactionType === 'scale-mb') {
        state.height = Math.max(50, Math.round(initHeight + localDy * 1.6));
      } else if (interactionType === 'scale-mt') {
        state.height = Math.max(50, Math.round(initHeight - localDy * 1.6));
      }
      // Corner Handles: Freeform Proportional & Dual-Axis Scaling
      else if (interactionType === 'scale-br') {
        state.width = Math.max(50, Math.round(initWidth + localDx * 1.4));
        state.height = Math.max(50, Math.round(initHeight + localDy * 1.4));
      } else if (interactionType === 'scale-bl') {
        state.width = Math.max(50, Math.round(initWidth - localDx * 1.4));
        state.height = Math.max(50, Math.round(initHeight + localDy * 1.4));
      } else if (interactionType === 'scale-tr') {
        state.width = Math.max(50, Math.round(initWidth + localDx * 1.4));
        state.height = Math.max(50, Math.round(initHeight - localDy * 1.4));
      } else if (interactionType === 'scale-tl') {
        state.width = Math.max(50, Math.round(initWidth - localDx * 1.4));
        state.height = Math.max(50, Math.round(initHeight - localDy * 1.4));
      }
    }

    applyTransform();
  }

  function onPointerUp() {
    isInteracting = false;
    interactionType = null;
    window.removeEventListener('mousemove', onPointerMove);
    window.removeEventListener('mouseup', onPointerUp);
    window.removeEventListener('touchmove', onPointerMove);
    window.removeEventListener('touchend', onPointerUp);
    window.removeEventListener('touchcancel', onPointerUp);
  }

  // Attach drag handler to controls layer
  const interactionHost = controlsLayer || tattooLayer;
  interactionHost.addEventListener('mousedown', (e) => onPointerDown(e, 'drag'));
  interactionHost.addEventListener('touchstart', (e) => onPointerDown(e, 'drag'), { passive: false });

  // Attach handle listeners
  const handles = [
    { sel: '.handle-tl', type: 'scale-tl' },
    { sel: '.handle-tr', type: 'scale-tr' },
    { sel: '.handle-br', type: 'scale-br' },
    { sel: '.handle-bl', type: 'scale-bl' },
    { sel: '.handle-mt', type: 'scale-mt' },
    { sel: '.handle-mr', type: 'scale-mr' },
    { sel: '.handle-mb', type: 'scale-mb' },
    { sel: '.handle-ml', type: 'scale-ml' },
    { sel: '.handle-rot', type: 'rotate' }
  ];

  handles.forEach(h => {
    const el = interactionHost.querySelector(h.sel);
    if (el) {
      el.addEventListener('mousedown', (e) => onPointerDown(e, h.type));
      el.addEventListener('touchstart', (e) => onPointerDown(e, h.type), { passive: false });
    }
  });

  // =========================================================================
  // FILE & CAMERA UPLOADS (Both options offered cleanly)
  // =========================================================================
  function handleFile(file, callback) {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => callback(e.target.result);
    reader.readAsDataURL(file);
  }

  function setBodyImage(url) {
    state.hasBody = true;
    bodyBg.src = url;
    updateViewportVisibility();
  }

  function setSketchImage(url) {
    state.hasSketch = true;
    state.rawSketchUrl = url;
    updateViewportVisibility();
    processSketchBackground(() => {
      initPosition();
    });
  }

  // Body Photo: Camera & File inputs
  [inputBodyCamera, inputBodyFile].forEach(input => {
    if (input) {
      input.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
          handleFile(e.target.files[0], setBodyImage);
        }
      });
    }
  });

  if (dropzoneBody) {
    dropzoneBody.addEventListener('dragover', (e) => { e.preventDefault(); dropzoneBody.classList.add('dragover'); });
    dropzoneBody.addEventListener('dragleave', () => dropzoneBody.classList.remove('dragover'));
    dropzoneBody.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzoneBody.classList.remove('dragover');
      if (e.dataTransfer.files.length) {
        handleFile(e.dataTransfer.files[0], setBodyImage);
      }
    });
  }

  if (btnRemoveBody) {
    btnRemoveBody.addEventListener('click', () => {
      state.hasBody = false;
      bodyBg.src = '';
      if (inputBodyCamera) inputBodyCamera.value = '';
      if (inputBodyFile) inputBodyFile.value = '';
      updateViewportVisibility();
    });
  }

  // Sketch: Camera & File inputs
  [inputSketchCamera, inputSketchFile].forEach(input => {
    if (input) {
      input.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
          handleFile(e.target.files[0], setSketchImage);
        }
      });
    }
  });

  if (dropzoneSketch) {
    dropzoneSketch.addEventListener('dragover', (e) => { e.preventDefault(); dropzoneSketch.classList.add('dragover'); });
    dropzoneSketch.addEventListener('dragleave', () => dropzoneSketch.classList.remove('dragover'));
    dropzoneSketch.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzoneSketch.classList.remove('dragover');
      if (e.dataTransfer.files.length) {
        handleFile(e.dataTransfer.files[0], setSketchImage);
      }
    });
  }

  if (btnRemoveSketch) {
    btnRemoveSketch.addEventListener('click', () => {
      state.hasSketch = false;
      state.rawSketchUrl = null;
      sketchImg.src = '';
      if (inputSketchCamera) inputSketchCamera.value = '';
      if (inputSketchFile) inputSketchFile.value = '';
      updateViewportVisibility();
    });
  }

  // =========================================================================
  // CONTROLS: THRESHOLD SLIDER, INVERSION, OPACITY & BLEND MODES
  // =========================================================================
  let debounceTimer = null;
  if (sliderThreshold) {
    sliderThreshold.addEventListener('input', (e) => {
      state.threshold = Number(e.target.value);
      if (thresholdValDisplay) thresholdValDisplay.textContent = state.threshold;

      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        processSketchBackground();
      }, 35);
    });
  }

  if (btnToggleInvert) {
    btnToggleInvert.addEventListener('click', () => {
      state.inverted = !state.inverted;
      btnToggleInvert.classList.toggle('active', state.inverted);
      processSketchBackground();
    });
  }

  if (sliderOpacity) {
    sliderOpacity.addEventListener('input', (e) => {
      state.opacity = e.target.value / 100;
      if (opacityValDisplay) opacityValDisplay.textContent = `${e.target.value}%`;
      applyTransform();
    });
  }

  blendPills.forEach(pill => {
    pill.addEventListener('click', () => {
      blendPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      state.blendMode = pill.getAttribute('data-mode') || 'multiply';
      applyTransform();
    });
  });

  if (btnToggleHandles) {
    btnToggleHandles.addEventListener('click', () => {
      state.showHandles = !state.showHandles;
      applyTransform();
      btnToggleHandles.classList.toggle('active', !state.showHandles);
    });
  }

  if (btnResetTransform) {
    btnResetTransform.addEventListener('click', initPosition);
  }

  // =========================================================================
  // PIXEL-PERFECT HD DOWNLOAD EXPORT
  // Exactly maps screen coordinates & pixel ratios to actual natural image resolution!
  // =========================================================================
  if (btnDownloadResult) {
    btnDownloadResult.addEventListener('click', () => {
      if (!state.hasBody) {
        alert('Пожалуйста, сначала сфотографируйте или загрузите фото участка вашего тела.');
        return;
      }
      if (!state.hasSketch) {
        alert('Пожалуйста, сначала сфотографируйте или выберите эскиз татуировки.');
        return;
      }

      const bImg = new Image();
      bImg.crossOrigin = 'anonymous';

      bImg.onload = () => {
        const origW = bImg.naturalWidth || bImg.width || 1200;
        const origH = bImg.naturalHeight || bImg.height || 1600;

        const exportCanvas = document.createElement('canvas');
        exportCanvas.width = origW;
        exportCanvas.height = origH;
        const ctx = exportCanvas.getContext('2d');

        // Draw body photo
        ctx.drawImage(bImg, 0, 0, origW, origH);

        // Get exact rendered bounding box of body image on screen
        const bodyRect = bodyBg.getBoundingClientRect();
        const tattooRect = tattooLayer.getBoundingClientRect();

        // Scale factors relative to actual natural image pixels
        const scaleX = origW / bodyRect.width;
        const scaleY = origH / bodyRect.height;

        // Position of tattoo center relative to body center in image coordinates
        const tattooScreenCenterX = tattooRect.left + tattooRect.width / 2;
        const tattooScreenCenterY = tattooRect.top + tattooRect.height / 2;

        const bodyScreenCenterX = bodyRect.left + bodyRect.width / 2;
        const bodyScreenCenterY = bodyRect.top + bodyRect.height / 2;

        const exportCenterX = origW / 2 + (tattooScreenCenterX - bodyScreenCenterX) * scaleX;
        const exportCenterY = origH / 2 + (tattooScreenCenterY - bodyScreenCenterY) * scaleY;

        // Pixel-accurate unrotated dimensions scaled to original image resolution
        const exportTattooW = state.width * scaleX;
        const exportTattooH = state.height * scaleY;

        // Load the current processed tattoo image (with background stripped)
        const tImg = new Image();
        tImg.crossOrigin = 'anonymous';
        tImg.onload = () => {
          ctx.save();
          ctx.translate(exportCenterX, exportCenterY);
          ctx.rotate((state.rotation * Math.PI) / 180);
          ctx.globalAlpha = state.opacity;

          // Blend Mode
          if (state.blendMode === 'screen') {
            ctx.globalCompositeOperation = 'screen';
          } else if (state.blendMode === 'multiply') {
            ctx.globalCompositeOperation = 'multiply';
          } else {
            ctx.globalCompositeOperation = 'source-over';
          }

          ctx.drawImage(tImg, -exportTattooW / 2, -exportTattooH / 2, exportTattooW, exportTattooH);
          ctx.restore();

          // Studio Watermark
          ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
          ctx.font = 'bold 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
          ctx.fillText('1RS TATTOO STUDIO // ПРИМЕРКА ЭСКИЗА', 40, origH - 40);

          // Trigger HD Download
          const a = document.createElement('a');
          a.download = '1rs-tattoo-preview.png';
          a.href = exportCanvas.toDataURL('image/png');
          a.click();
        };
        tImg.src = sketchImg.src;
      };

      bImg.src = bodyBg.src;
    });
  }

  // Telegram Direct Share
  if (btnSendTelegram) {
    btnSendTelegram.addEventListener('click', () => {
      const msg = encodeURIComponent('Здравствуйте! Я сделал примерку эскиза на сайте 1RS Tattoo Studio и хочу записаться к вам на консультацию.');
      window.open(`https://t.me/tattoo1rs?text=${msg}`, '_blank');
    });
  }

  // Initialize
  window.addEventListener('load', () => {
    initPosition();
    updateViewportVisibility();
  });
})();
