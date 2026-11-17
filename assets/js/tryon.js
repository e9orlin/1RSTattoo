/**
 * 1RS Tattoo Studio — Virtual Tattoo Try-on
 * Multi-sketch, flip-via-drag, no limits.
 */
(function () {
  "use strict";

  /* ── DOM ── */
  var bodyBg           = document.getElementById("tryon-body-bg");
  var sketchesContainer = document.getElementById("tryon-sketches-container");
  var canvasContainer  = document.getElementById("tryon-canvas-container");
  var emptyState       = document.getElementById("tryon-empty-placeholder");
  var floatingControls = document.getElementById("tryon-toolbar");
  var actionsBar       = document.getElementById("tryon-actions");

  var inputBodyCamera  = document.getElementById("tryon-body-camera");
  var inputBodyFile    = document.getElementById("tryon-body-file");
  var inputSketchFile  = document.getElementById("tryon-sketch-file");

  var sliderOpacity    = document.getElementById("tryon-opacity-range");
  var opacityValEl     = document.getElementById("tryon-opacity-val");
  var btnDownload      = document.getElementById("tryon-btn-download");

  if (!canvasContainer || !bodyBg) return;

  /* ── Global state ── */
  var hasBody    = false;
  var bodySrc    = null;
  var sketches   = [];      // array of sketch objects
  var activeSketch = null;  // currently selected sketch

  /* ===================================================================
     SKETCH OBJECT
     Each sketch has:
       src, x, y, scaleX, scaleY, rotation, opacity
       tattooEl, controlsEl
     scaleX / scaleY can be negative → natural flip when dragged through
  =================================================================== */
  function createSketch(src, natW, natH) {
    var aspectRatio = natW / natH;
    var cRect = canvasContainer.getBoundingClientRect();
    var cW = cRect.width  || 600;
    var cH = cRect.height || 500;

    var initW = Math.min(220, cW * 0.45);
    var initH = initW / aspectRatio;

    var sk = {
      src: src,
      aspectRatio: aspectRatio,
      // logical dimensions (always positive reference)
      logW: initW,
      logH: initH,
      // actual signed scale (negative = flipped)
      scaleX: 1,
      scaleY: 1,
      x: (cW - initW) / 2,
      y: (cH - initH) / 2,
      rotation: 0,
      opacity: 0.92,
      tattooEl: null,
      controlsEl: null
    };

    sk.tattooEl   = buildTattooEl(src);
    sk.controlsEl = buildControlsEl(sk);

    sketchesContainer.appendChild(sk.tattooEl);
    sketchesContainer.appendChild(sk.controlsEl);

    sketches.push(sk);
    selectSketch(sk);
    applyTransform(sk);
    return sk;
  }

  function buildTattooEl(src) {
    var div = document.createElement("div");
    div.className = "tryon-tattoo-layer";
    div.style.display = "block";
    var img = document.createElement("img");
    img.className = "tryon-sketch-img";
    img.src = src;
    div.appendChild(img);
    return div;
  }

  function buildControlsEl(sk) {
    var div = document.createElement("div");
    div.className = "tryon-controls-layer";
    div.style.display = "block";
    div.innerHTML =
      '<div class="tryon-bounding-box">' +
        '<div class="tryon-handle handle-tl" title="Масштабировать"></div>' +
        '<div class="tryon-handle handle-tr" title="Масштабировать"></div>' +
        '<div class="tryon-handle handle-br" title="Масштабировать"></div>' +
        '<div class="tryon-handle handle-bl" title="Масштабировать"></div>' +
        '<div class="tryon-handle handle-t"  title="Растянуть"></div>' +
        '<div class="tryon-handle handle-b"  title="Растянуть"></div>' +
        '<div class="tryon-handle handle-l"  title="Растянуть"></div>' +
        '<div class="tryon-handle handle-r"  title="Растянуть"></div>' +
        '<div class="tryon-rot-stem">' +
          '<div class="tryon-handle handle-rot" title="Повернуть">' +
            '<svg viewBox="0 0 24 24"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38"/></svg>' +
          '</div>' +
        '</div>' +
        '<button class="tryon-delete-btn" title="Удалить эскиз">✕</button>' +
      '</div>';

    // Delete button
    div.querySelector(".tryon-delete-btn").addEventListener("click", function (e) {
      e.stopPropagation();
      removeSketch(sk);
    });

    return div;
  }

  function removeSketch(sk) {
    sk.tattooEl.remove();
    sk.controlsEl.remove();
    var idx = sketches.indexOf(sk);
    if (idx !== -1) sketches.splice(idx, 1);

    if (activeSketch === sk) {
      activeSketch = sketches.length > 0 ? sketches[sketches.length - 1] : null;
      if (activeSketch) selectSketch(activeSketch);
      else {
        if (floatingControls) floatingControls.style.display = "none";
      }
    }
  }

  function selectSketch(sk) {
    // Deselect all
    sketches.forEach(function (s) {
      s.controlsEl.classList.remove("active-sketch");
    });
    sk.controlsEl.classList.add("active-sketch");
    activeSketch = sk;

    // Sync opacity slider
    if (sliderOpacity) {
      sliderOpacity.value = Math.round(sk.opacity * 100);
      if (opacityValEl) opacityValEl.textContent = sliderOpacity.value + "%";
    }

    if (floatingControls) floatingControls.style.display = "flex";
    if (actionsBar) actionsBar.style.display = "flex";
  }

  /* ===================================================================
     TRANSFORM
  =================================================================== */
  function applyTransform(sk) {
    var w  = sk.logW;
    var h  = sk.logH;
    var sx = sk.scaleX;
    var sy = sk.scaleY;
    var cx = sk.x + w / 2;
    var cy = sk.y + h / 2;

    // Tattoo: full transform with scaleX/Y
    sk.tattooEl.style.width  = w + "px";
    sk.tattooEl.style.height = h + "px";
    sk.tattooEl.style.transform =
      "translate(" + sk.x + "px," + sk.y + "px) " +
      "rotate(" + sk.rotation + "deg) " +
      "scaleX(" + sx + ") scaleY(" + sy + ")";
    sk.tattooEl.style.opacity     = sk.opacity;
    sk.tattooEl.style.mixBlendMode = "multiply";

    // Controls: same position + rotation, but scale = abs (keep handles readable)
    sk.controlsEl.style.width  = w + "px";
    sk.controlsEl.style.height = h + "px";
    sk.controlsEl.style.transform =
      "translate(" + sk.x + "px," + sk.y + "px) " +
      "rotate(" + sk.rotation + "deg)";
  }

  /* ===================================================================
     INTERACTION
  =================================================================== */
  var active    = null;
  var activeSk  = null;
  var sx0 = 0, sy0 = 0;
  var ss  = null;   // snapshot

  function getHandle(el) {
    if (el.classList.contains("handle-rot")) return "rotate";
    if (el.classList.contains("handle-tl"))  return "tl";
    if (el.classList.contains("handle-tr"))  return "tr";
    if (el.classList.contains("handle-br"))  return "br";
    if (el.classList.contains("handle-bl"))  return "bl";
    if (el.classList.contains("handle-t"))   return "t";
    if (el.classList.contains("handle-b"))   return "b";
    if (el.classList.contains("handle-l"))   return "l";
    if (el.classList.contains("handle-r"))   return "r";
    return null;
  }

  function findSketchByEl(el) {
    for (var i = 0; i < sketches.length; i++) {
      var sk = sketches[i];
      if (sk.controlsEl.contains(el) || sk.tattooEl.contains(el)) return sk;
    }
    return null;
  }

  function onDown(e) {
    var target = e.target;
    if (target.classList.contains("tryon-delete-btn")) return;

    var sk = findSketchByEl(target);
    if (!sk) return;
    e.preventDefault();

    selectSketch(sk);

    var pt = e.touches ? e.touches[0] : e;
    sx0 = pt.clientX;
    sy0 = pt.clientY;
    ss = {
      x: sk.x, y: sk.y,
      logW: sk.logW, logH: sk.logH,
      scaleX: sk.scaleX, scaleY: sk.scaleY,
      rotation: sk.rotation, opacity: sk.opacity,
      visualAspectRatio: (sk.logW * Math.abs(sk.scaleX)) / (sk.logH * Math.abs(sk.scaleY))
    };
    activeSk = sk;
    active = getHandle(target) || "drag";

    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup",   onUp);
    window.addEventListener("touchmove",   onTouchMove, { passive: false });
    window.addEventListener("touchend",    onUp);
  }

  function onMove(e) {
    if (!active || !activeSk) return;
    e.preventDefault();
    var sk = activeSk;
    var pt = e.touches ? e.touches[0] : e;
    var sdx = pt.clientX - sx0;
    var sdy = pt.clientY - sy0;

    /* DRAG */
    if (active === "drag") {
      sk.x = ss.x + sdx;
      sk.y = ss.y + sdy;
      applyTransform(sk);
      return;
    }

    /* ROTATE */
    if (active === "rotate") {
      var cRect = canvasContainer.getBoundingClientRect();
      var cx = cRect.left + ss.x + ss.logW / 2;
      var cy = cRect.top  + ss.y + ss.logH / 2;
      sk.rotation = Math.round(Math.atan2(pt.clientY - cy, pt.clientX - cx) * 180 / Math.PI + 90);
      applyTransform(sk);
      return;
    }

    /* SCALE — project onto local axes (trig approach) */
    var rad  = ss.rotation * Math.PI / 180;
    var cosA = Math.cos(rad);
    var sinA = Math.sin(rad);

    // local delta along element axes
    var ldx =  sdx * cosA + sdy * sinA;
    var ldy = -sdx * sinA + sdy * cosA;

    // Account for current flip sign: if flipped, dragging right should shrink from left side
    ldx *= ss.scaleX;
    ldy *= ss.scaleY;

    var newW = ss.logW;
    var newH = ss.logH;
    var signW = 0, signH = 0;

    switch (active) {
      case "r":  newW = ss.logW + ldx; signW =  1; break;
      case "l":  newW = ss.logW - ldx; signW = -1; break;
      case "b":  newH = ss.logH + ldy; signH =  1; break;
      case "t":  newH = ss.logH - ldy; signH = -1; break;
      case "br": newW = ss.logW + ldx; signW =  1; signH =  1; break;
      case "bl": newW = ss.logW - ldx; signW = -1; signH =  1; break;
      case "tr": newW = ss.logW + ldx; signW =  1; signH = -1; break;
      case "tl": newW = ss.logW - ldx; signW = -1; signH = -1; break;
    }

    // Corner: keep aspect ratio
    if (signW !== 0 && signH !== 0) {
      newH = Math.abs(newW) / ss.visualAspectRatio;
      if (newW < 0) newH = -newH; // propagate flip direction for height sign logic
    }

    // Flip when size crosses zero — the sign of scaleX/scaleY flips
    // logW/logH stay positive (represent the DOM size)
    var newScaleX = ss.scaleX;
    var newScaleY = ss.scaleY;

    if (newW < 0) {
      newScaleX = -ss.scaleX;
      newW = -newW;
    }
    if (newH < 0) {
      newScaleY = -ss.scaleY;
      newH = -newH;
    }

    // Enforce minimum visual size
    newW = Math.max(10, newW);
    newH = Math.max(10, newH);

    var dw = newW - ss.logW;
    var dh = newH - ss.logH;

    // Keep anchor corner/edge fixed by shifting center
    var ncx = (ss.x + ss.logW / 2) + signW * (dw / 2) * cosA - signH * (dh / 2) * sinA;
    var ncy = (ss.y + ss.logH / 2) + signW * (dw / 2) * sinA + signH * (dh / 2) * cosA;

    sk.logW   = newW;
    sk.logH   = newH;
    sk.scaleX = newScaleX;
    sk.scaleY = newScaleY;
    sk.x = ncx - newW / 2;
    sk.y = ncy - newH / 2;

    applyTransform(sk);
  }

  function onTouchMove(e) { if (active) onMove(e); }

  function onUp() {
    active = null; activeSk = null;
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup",   onUp);
    window.removeEventListener("touchmove",   onTouchMove);
    window.removeEventListener("touchend",    onUp);
  }

  canvasContainer.addEventListener("pointerdown", onDown);
  canvasContainer.addEventListener("touchstart",  onDown, { passive: false });

  /* ===================================================================
     BODY LOADING
  =================================================================== */
  function loadBodyImage(src) {
    bodyBg.src = src;
    bodyBg.onload = function () {
      bodyBg.style.display = "block";
      if (emptyState) emptyState.style.display = "none";
      hasBody = true;
      bodySrc = src;
      if (actionsBar && sketches.length > 0) actionsBar.style.display = "flex";
    };
  }
  function handleBodyFile(f) {
    if (!f) return;
    var r = new FileReader();
    r.onload = function (e) { loadBodyImage(e.target.result); };
    r.readAsDataURL(f);
  }
  if (inputBodyCamera) inputBodyCamera.addEventListener("change", function (e) { handleBodyFile(e.target.files[0]); });
  if (inputBodyFile)   inputBodyFile.addEventListener("change",   function (e) { handleBodyFile(e.target.files[0]); });

  /* ===================================================================
     SKETCH LOADING
  =================================================================== */
  function loadSketchSrc(src) {
    var img = new Image();
    img.onload = function () {
      createSketch(src, img.naturalWidth || 300, img.naturalHeight || 300);
      if (actionsBar && hasBody) actionsBar.style.display = "flex";
    };
    img.src = src;
  }
  function handleSketchFiles(files) {
    for (var i = 0; i < files.length; i++) {
      (function (file) {
        var r = new FileReader();
        r.onload = function (e) { loadSketchSrc(e.target.result); };
        r.readAsDataURL(file);
      })(files[i]);
    }
  }
  if (inputSketchFile) inputSketchFile.addEventListener("change", function (e) {
    handleSketchFiles(e.target.files);
    e.target.value = ""; // allow re-uploading same file
  });

  /* ===================================================================
     TOOLBAR
  =================================================================== */
  if (sliderOpacity) {
    sliderOpacity.addEventListener("input", function (e) {
      if (!activeSketch) return;
      activeSketch.opacity = e.target.value / 100;
      if (opacityValEl) opacityValEl.textContent = e.target.value + "%";
      applyTransform(activeSketch);
    });
  }

  /* ===================================================================
     HD DOWNLOAD — composites all sketches
  =================================================================== */
  if (btnDownload) {
    btnDownload.addEventListener("click", function () {
      if (!hasBody)           { alert("Сначала загрузите фото тела."); return; }
      if (!sketches.length)   { alert("Добавьте хотя бы один эскиз."); return; }

      var bodyEl = new Image();
      bodyEl.crossOrigin = "anonymous";
      bodyEl.onload = function () {
        var ow = bodyEl.naturalWidth  || 1200;
        var oh = bodyEl.naturalHeight || 900;
        var canvas = document.createElement("canvas");
        canvas.width = ow; canvas.height = oh;
        var ctx = canvas.getContext("2d");
        ctx.drawImage(bodyEl, 0, 0, ow, oh);

        var cR = canvasContainer.getBoundingClientRect();
        var kx = ow / cR.width, ky = oh / cR.height;

        var pending = sketches.length;
        sketches.forEach(function (sk) {
          var skEl = new Image();
          skEl.crossOrigin = "anonymous";
          skEl.onload = function () {
            var sW  = sk.logW * kx, sH = sk.logH * ky;
            var sCx = (sk.x + sk.logW / 2) * kx;
            var sCy = (sk.y + sk.logH / 2) * ky;
            ctx.save();
            ctx.translate(sCx, sCy);
            ctx.rotate(sk.rotation * Math.PI / 180);
            ctx.scale(sk.scaleX, sk.scaleY);
            ctx.globalAlpha = sk.opacity;
            ctx.globalCompositeOperation = "multiply";
            ctx.drawImage(skEl, -sW / 2, -sH / 2, sW, sH);
            ctx.restore();
            pending--;
            if (pending === 0) {
              var a = document.createElement("a");
              a.download = "1RS_Tattoo_Tryon.jpg";
              a.href = canvas.toDataURL("image/jpeg", 0.95);
              document.body.appendChild(a); a.click(); document.body.removeChild(a);
            }
          };
          skEl.src = sk.src;
        });
      };
      bodyEl.src = bodySrc;
    });
  }

  window.addEventListener("resize", function () {
    sketches.forEach(function (sk) { applyTransform(sk); });
  }, { passive: true });

})();
