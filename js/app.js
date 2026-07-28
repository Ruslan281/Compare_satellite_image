/**
 * app.js — GeoSlice (ArcGIS Maps SDK)
 * ════════════════════════════════════════════════
 * Minimal modul siyahısı + görünən xəta mesajları
 * ════════════════════════════════════════════════
 */

// ── Xəta ekranda göstər ────────────────────────
function showError(title, detail) {
  const box = document.getElementById("loading");
  box.classList.remove("hidden");
  box.innerHTML = `
    <div class="loading-box" style="max-width:520px;text-align:left">
      <div style="font-size:15px;font-weight:600;color:#B4351E;margin-bottom:8px">${title}</div>
      <div style="font-size:12px;font-family:var(--mono);color:var(--ink-2);
                  background:var(--white);border:1px solid var(--border);
                  border-radius:8px;padding:12px;white-space:pre-wrap;
                  max-height:300px;overflow:auto">${detail}</div>
    </div>`;
}

// Yükləmə çox uzun sürərsə xəbərdarlıq
const stuckTimer = setTimeout(() => {
  const l = document.getElementById("loading");
  if (l && !l.classList.contains("hidden")) {
    document.getElementById("loadingSub").textContent =
      "Uzun çəkir… F12 → Console-a baxın";
  }
}, 15000);

// ── AMD modulları ──────────────────────────────
require([
  "esri/Map",
  "esri/views/MapView",
  "esri/layers/ImageryTileLayer",
  "esri/widgets/Swipe",
], function (Map, MapView, ImageryTileLayer, Swipe) {

  // ── State ────────────────────────────────────
  const state = {
    left:  { activeId: LAYERS.left.find(l => l.default)?.id  || LAYERS.left[0].id,  visible: true, layer: null },
    right: { activeId: LAYERS.right.find(l => l.default)?.id || LAYERS.right[0].id, visible: true, layer: null },
  };

  let activeBasemap  = DEFAULT_BASEMAP;
  let basemapVisible = BASEMAP_VISIBLE_ON_START;
  let swipe          = null;
  let fittedOnce     = false;

  // ── Xəritə ───────────────────────────────────
  // Xəritə HƏMİŞƏ basemap ilə yaradılır — view-in hazır olması üçün vacibdir
  const map = new Map({
    basemap: activeBasemap,
  });

  const view = new MapView({
    container: "viewDiv",
    map: map,
    ui: { components: ["zoom", "attribution"] },
    center: [48.88, 39.80],
    zoom: 11,
    spatialReference: { wkid: 3857 },   // açıq SR — view mütləq hazır olur
    constraints: { snapToZoom: true },   // overview səviyyələrinə yapış — çox sürətli
  });

  // Basemap görünürlüyünü layer səviyyəsində idarə et (map.basemap = null ETMƏ!)
  function setBasemapVisible(vis) {
    if (!map.basemap) return;
    map.basemap.baseLayers.forEach(l => l.visible = vis);
    map.basemap.referenceLayers?.forEach(l => l.visible = vis);
  }

  // ── Görüntünü EKRANI TAM DOLDURACAQ şəkildə yerləşdir ──
  // "sığdır" (contain) əvəzinə "doldur" (cover) rejimi.
  // COVER_ZOOM > 1 olduqca daha çox yaxınlaşır — kənarlarda boşluq qalmır.
  // Kənarda hələ boşluq görünürsə bu ədədi artır (1.25, 1.35 …)
  const COVER_ZOOM = 1.18;

  async function fitCover(extent, animate) {
    if (!extent || !view.width || !view.height) return;

    const viewAspect  = view.width / view.height;
    const imageAspect = extent.width / extent.height;

    let w, h;
    if (imageAspect > viewAspect) {
      h = extent.height;
      w = h * viewAspect;
    } else {
      w = extent.width;
      h = w / viewAspect;
    }

    // Sahəni kiçilt → xəritə daha çox yaxınlaşır → boşluq qalmır
    w /= COVER_ZOOM;
    h /= COVER_ZOOM;

    const cx = (extent.xmin + extent.xmax) / 2;
    const cy = (extent.ymin + extent.ymax) / 2;

    const target = extent.clone();
    target.xmin = cx - w / 2;
    target.xmax = cx + w / 2;
    target.ymin = cy - h / 2;
    target.ymax = cy + h / 2;

    // Kilidi müvəqqəti aç ki, goTo sərbəst işləsin
    view.constraints.minScale = 0;

    await view.goTo(target, { animate: !!animate });

    // ── ZOOM OUT KİLİDİ ──
    // Bu miqyasdan daha uzağa çıxmaq olmaz
    view.constraints.minScale = view.scale;

    // Pan sərhədini qur
    updatePanBounds();
  }

  // ── PAN MƏHDUDİYYƏTİ ──────────────────────────
  // Xəritəni görüntünün kənarından kənara sürükləmək olmaz.
  // Sərhəd zoom səviyyəsinə görə dinamik hesablanır:
  // mərkəz elə yerə qədər gedə bilir ki, ekranın kənarı
  // görüntünün kənarına çatsın — o vaxt dayanır.
  function updatePanBounds() {
    const ext = state.left.layer?.fullExtent;
    if (!ext || !view.extent) return;

    const halfW = view.extent.width  / 2;
    const halfH = view.extent.height / 2;
    const cx = (ext.xmin + ext.xmax) / 2;
    const cy = (ext.ymin + ext.ymax) / 2;

    const g = ext.clone();
    g.xmin = Math.min(ext.xmin + halfW, cx);
    g.xmax = Math.max(ext.xmax - halfW, cx);
    g.ymin = Math.min(ext.ymin + halfH, cy);
    g.ymax = Math.max(ext.ymax - halfH, cy);

    view.constraints.geometry = g;
  }

  // Zoom dəyişdikcə sərhədi yenilə
  view.watch("scale", () => updatePanBounds());

  // Başlanğıc vəziyyət
  view.when(() => setBasemapVisible(basemapVisible));

  // ── NDVI rəng rampası — autocast (modul lazım deyil) ──
  const NDVI_RAMP = {
    type: "multipart",
    colorRamps: [
      { type: "algorithmic", fromColor: [166,  97,  26], toColor: [245, 245, 200], algorithm: "hsv" },
      { type: "algorithmic", fromColor: [245, 245, 200], toColor: [ 26, 120,  50], algorithm: "hsv" },
    ],
  };

  // ── Lay qur ──────────────────────────────────
  function buildLayer(cfg) {
    const renderer = {
      type: "raster-stretch",
      stretchType: cfg.stretch || "percent-clip",
      dynamicRangeAdjustment: true,
      minPercent: 0.5,
      maxPercent: 0.5,
    };
    if (cfg.colorRamp === "ndvi") renderer.colorRamp = NDVI_RAMP;

    return new ImageryTileLayer({
      url:           cfg.src,
      bandIds:       cfg.bandIds,
      renderer:      renderer,
      title:         cfg.label,
      opacity:       1,
      interpolation: "nearest",   // "bilinear"-dan sürətlidir
      blendMode:     "normal",
    });
  }

  // ── Lay yüklə ────────────────────────────────
  async function loadLayer(side) {
    const s   = state[side];
    const cfg = LAYERS[side].find(l => l.id === s.activeId);

    setLoading(true, cfg.label, cfg.src.split("/").pop());

    if (s.layer) { map.remove(s.layer); s.layer = null; }

    const layer = buildLayer(cfg);
    s.layer = layer;
    map.add(layer, side === "left" ? 0 : 1);
    layer.visible = s.visible;

    try {
      await layer.load();
      await view.whenLayerView(layer);

      if (!fittedOnce && layer.fullExtent) {
        await fitCover(layer.fullExtent, false);
        fittedOnce = true;
      }
    } catch (err) {
      console.error("Lay yüklənmədi:", cfg.src, err);
      showError(
        "Lay yüklənmədi: " + cfg.label,
        "URL: " + cfg.src + "\n\n" +
        (err?.message || err) + "\n\n" +
        (err?.details ? JSON.stringify(err.details, null, 2) : "")
      );
      return;
    }

    document.getElementById(side === "left" ? "leftBadge" : "rightBadge")
            .textContent = cfg.badge || "";

    setupSwipe();
    setLoading(false);
    renderPanel();
  }

  // ── Swipe ────────────────────────────────────
  function setupSwipe() {
    if (!state.left.layer || !state.right.layer) return;

    if (swipe) {
      swipe.leadingLayers.removeAll();
      swipe.trailingLayers.removeAll();
      swipe.leadingLayers.add(state.left.layer);
      swipe.trailingLayers.add(state.right.layer);
      return;
    }

    swipe = new Swipe({
      view: view,
      leadingLayers:  [state.left.layer],
      trailingLayers: [state.right.layer],
      position: 50,
      direction: "horizontal",
    });
    view.ui.add(swipe);

    swipe.watch("position", pos => {
      const b = document.getElementById("rightBadge");
      b.style.left = `calc(${pos}% + 20px)`;
      b.style.transform = "none";
    });
  }

  // ── Panel ────────────────────────────────────
  const eyeOn  = `<svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z" stroke="currentColor" stroke-width="1.4"/><circle cx="8" cy="8" r="2.5" stroke="currentColor" stroke-width="1.4"/></svg>`;
  const eyeOff = `<svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M2 2l12 12M1 8s2.5-5 7-5M15 8s-1 2-3 3.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>`;

  function renderPanel() {
    renderSide("left",  "leftLayers");
    renderSide("right", "rightLayers");
    renderBasemaps();
  }

  function renderSide(side, listId) {
    const el = document.getElementById(listId);
    const s  = state[side];
    el.innerHTML = "";

    const toggle = document.createElement("button");
    toggle.className = "visibility-btn " + (s.visible ? "on" : "off");
    toggle.innerHTML = (s.visible ? eyeOn : eyeOff) + (s.visible ? " Görünür" : " Gizli");
    toggle.addEventListener("click", () => {
      s.visible = !s.visible;
      if (s.layer) s.layer.visible = s.visible;
      renderSide(side, listId);
    });
    el.appendChild(toggle);

    LAYERS[side].forEach(cfg => {
      const btn = document.createElement("button");
      btn.className = "layer-btn" + (cfg.id === s.activeId ? " active" : "");
      btn.innerHTML = `
        <span class="layer-dot"></span>
        <span>${cfg.label}</span>
        ${cfg.meta ? `<span class="layer-meta">${cfg.meta}</span>` : ""}`;
      btn.addEventListener("click", () => {
        if (cfg.id === s.activeId) return;
        s.activeId = cfg.id;
        s.visible  = true;
        renderSide(side, listId);
        loadLayer(side);
      });
      el.appendChild(btn);
    });
  }

  function renderBasemaps() {
    const el = document.getElementById("basemapList");
    el.innerHTML = "";

    const toggle = document.createElement("button");
    toggle.className = "visibility-btn " + (basemapVisible ? "on" : "off");
    toggle.innerHTML = (basemapVisible ? eyeOn : eyeOff) + (basemapVisible ? " Görünür" : " Gizli");
    toggle.addEventListener("click", toggleBasemap);
    el.appendChild(toggle);

    BASEMAPS.forEach(bm => {
      const btn = document.createElement("button");
      btn.className = "layer-btn" + (bm.id === activeBasemap && basemapVisible ? " active" : "");
      btn.innerHTML = `<span class="layer-dot"></span><span>${bm.label}</span>`;
      btn.addEventListener("click", () => {
        activeBasemap  = bm.id;
        basemapVisible = true;
        map.basemap = bm.id;
        view.when(() => setBasemapVisible(true));
        updateBasemapBtn();
        renderBasemaps();
      });
      el.appendChild(btn);
    });
  }

  function toggleBasemap() {
    basemapVisible = !basemapVisible;
    setBasemapVisible(basemapVisible);
    updateBasemapBtn();
    renderBasemaps();
  }

  function updateBasemapBtn() {
    document.getElementById("btnBasemap").classList.toggle("active", !basemapVisible);
  }

  // ── Koordinatlar ─────────────────────────────
  view.on("pointer-move", evt => {
    const pt = view.toMap({ x: evt.x, y: evt.y });
    if (!pt) return;
    document.getElementById("cLat").textContent = pt.latitude?.toFixed(5)  ?? "—";
    document.getElementById("cLon").textContent = pt.longitude?.toFixed(5) ?? "—";
  });
  view.watch("zoom", z => {
    document.getElementById("cZoom").textContent = z.toFixed(1);
  });

  // ── Düymələr ─────────────────────────────────
  document.getElementById("btnHome").addEventListener("click", () => {
    const l = state.left.layer;
    if (l?.fullExtent) fitCover(l.fullExtent, true);
  });
  document.getElementById("btnBasemap").addEventListener("click", toggleBasemap);
  document.getElementById("btnFullscreen").addEventListener("click", () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
    else document.exitFullscreen?.();
  });
  document.getElementById("panelClose").addEventListener("click", () => {
    document.getElementById("layerPanel").classList.add("hidden");
    document.getElementById("panelOpenBtn").style.display = "flex";
  });
  document.getElementById("panelOpenBtn").addEventListener("click", () => {
    document.getElementById("layerPanel").classList.remove("hidden");
    document.getElementById("panelOpenBtn").style.display = "none";
  });

  // Pəncərə ölçüsü dəyişəndə görüntünü yenidən doldur
  let resizeTimer = null;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      const l = state.left.layer;
      if (l?.fullExtent) fitCover(l.fullExtent, false);
    }, 250);
  });

  function setLoading(show, label = "Yüklənir…", sub = "") {
    const el = document.getElementById("loading");
    const lb = document.getElementById("loadingLabel");
    const sb = document.getElementById("loadingSub");
    if (lb) lb.textContent = label;
    if (sb) sb.textContent = sub;
    el.classList.toggle("hidden", !show);
    if (!show) clearTimeout(stuckTimer);
  }

  // ── Başlat ───────────────────────────────────
  view.when(async () => {
    updateBasemapBtn();
    renderPanel();
    await loadLayer("left");
    await loadLayer("right");
  }, err => {
    showError("Xəritə açılmadı", err?.message || String(err));
  });

},
// ── Modul yüklənmə xətası ──────────────────────
function (err) {
  clearTimeout(stuckTimer);
  showError(
    "ArcGIS modulu yüklənmədi",
    "Modul: " + (err?.requireModules?.join(", ") || "naməlum") + "\n\n" +
    (err?.message || String(err))
  );
});
