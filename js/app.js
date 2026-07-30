/**
 * app.js — GeoSolver Satellite
 * ══════════════════════════════════════════════
 * Konfiqurasiya : config.js
 * Dil lüğəti    : i18n.js
 * ══════════════════════════════════════════════
 */

/* ── Xəta ekranı ──────────────────────────── */
function fail(title, detail) {
  const el = document.getElementById("load");
  el.classList.remove("hide");
  el.classList.add("err");
  el.innerHTML = `
    <div class="load-in">
      <div class="load-spin">
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
          <circle cx="16" cy="16" r="14" stroke="currentColor" stroke-width="1.7"/>
          <path d="M16 9v8.5M16 21.5v.6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
        </svg>
      </div>
      <div class="load-t">${title}</div>
      <div class="err-box">${detail}</div>
    </div>`;
}

/* ── AMD ──────────────────────────────────── */
require([
  "esri/Map",
  "esri/views/MapView",
  "esri/layers/ImageryTileLayer",
  "esri/widgets/Swipe",
  "esri/widgets/Home",
], function (Map, MapView, ImageryTileLayer, Swipe, Home) {

  /* ── Vəziyyət ───────────────────────────── */
  const S = {
    left:  { id: first("left"),  on: true, layer: null },
    right: { id: first("right"), on: true, layer: null },
  };
  function first(side) { return (LAYERS[side].find(l => l.default) || LAYERS[side][0]).id; }
  function cfg(side)   { return LAYERS[side].find(l => l.id === S[side].id); }

  let baseId = BASEMAP_DEFAULT;
  let baseOn = BASEMAP_ON_START;
  let swipe  = null;
  let framed = false;

  /* ── Xəritə ─────────────────────────────── */
  const map = new Map({ basemap: baseId });

  const view = new MapView({
    container: "viewDiv",
    map,
    ui: { components: ["zoom", "attribution"] },
    center: [48.88, 39.80],
    zoom: 11,
    spatialReference: { wkid: 3857 },
    constraints: { snapToZoom: false, rotationEnabled: false },
  });

  /* ── Esri-nin rəsmi Home widget-i ──────────
     Zoom düymələrinin altında yerləşir.
     Görüntü ilk dəfə çərçivəyə alındıqdan sonra
     həmin görünüş "ev" nöqtəsi kimi yadda saxlanılır.
  ────────────────────────────────────────── */
  const homeWidget = new Home({ view });
  view.ui.add(homeWidget, "top-left");

  function paintBase(on) {
    if (!map.basemap) return;
    map.basemap.baseLayers.forEach(l => l.visible = on);
    map.basemap.referenceLayers?.forEach(l => l.visible = on);
  }

  /* ── Ekranı doldur ──────────────────────── */
  async function frame(extent, animate) {
    if (!extent || !view.width || !view.height) return;

    const va = view.width / view.height;
    const ia = extent.width / extent.height;
    let w, h;
    if (ia > va) { h = extent.height; w = h * va; }
    else         { w = extent.width;  h = w / va; }
    w /= COVER_ZOOM;
    h /= COVER_ZOOM;

    const cx = (extent.xmin + extent.xmax) / 2;
    const cy = (extent.ymin + extent.ymax) / 2;
    const t2 = extent.clone();
    t2.xmin = cx - w/2; t2.xmax = cx + w/2;
    t2.ymin = cy - h/2; t2.ymax = cy + h/2;

    view.constraints.minScale = 0;
    await view.goTo(t2, { animate: !!animate });

    // Kənarda qalıq boşluğu təmizlə
    for (let i = 0; i < 6; i++) {
      const ve = view.extent;
      if (!ve) break;
      if (ve.width <= extent.width && ve.height <= extent.height) break;
      await view.goTo({ scale: view.scale * 0.93 }, { animate: false });
    }

    if (LOCK_ZOOM_OUT) view.constraints.minScale = view.scale;
    if (LOCK_PAN)      bindPan();

    // Home widget bu görünüşə qaytarsın
    if (homeWidget) homeWidget.viewpoint = view.viewpoint.clone();
  }

  function bindPan() {
    const ext = S.left.layer?.fullExtent;
    if (!ext || !view.extent) return;
    const hw = view.extent.width / 2, hh = view.extent.height / 2;
    const cx = (ext.xmin + ext.xmax) / 2, cy = (ext.ymin + ext.ymax) / 2;
    const g = ext.clone();
    g.xmin = Math.min(ext.xmin + hw, cx);
    g.xmax = Math.max(ext.xmax - hw, cx);
    g.ymin = Math.min(ext.ymin + hh, cy);
    g.ymax = Math.max(ext.ymax - hh, cy);
    view.constraints.geometry = g;
  }
  view.watch("scale", () => { if (LOCK_PAN) bindPan(); });

  /* ── Lay yüklə ──────────────────────────── */
  async function mount(side) {
    const st = S[side], c = cfg(side);
    loading(true, t(c.name), t(SOURCES[side].name));

    if (st.layer) { map.remove(st.layer); st.layer = null; }

    const o = { url: c.url, title: t(c.name), opacity: 1 };
    if (c.renderer) o.renderer = c.renderer;
    if (c.bandIds)  o.bandIds  = c.bandIds;

    const layer = new ImageryTileLayer(o);
    st.layer = layer;
    map.add(layer, side === "left" ? 0 : 1);
    layer.visible = st.on;

    try {
      await layer.load();
      await view.whenLayerView(layer);
      if (!framed && layer.fullExtent) {
        await frame(layer.fullExtent, false);
        framed = true;
      }
    } catch (err) {
      const m = err?.message || String(err);
      const auth = /token|auth|403|permission|not authorized/i.test(m);
      fail(
        auth ? t("errPublic") : t("errService"),
        (auth ? t("errPublicMsg") : "") + "URL:\n" + c.url + "\n\n" + m
      );
      return;
    }

    linkSwipe();
    loading(false);
    render();
  }

  /* ── Swipe ──────────────────────────────── */
  function linkSwipe() {
    if (!S.left.layer || !S.right.layer) return;
    if (swipe) {
      swipe.leadingLayers.removeAll();
      swipe.trailingLayers.removeAll();
      swipe.leadingLayers.add(S.left.layer);
      swipe.trailingLayers.add(S.right.layer);
      return;
    }
    swipe = new Swipe({
      view,
      leadingLayers:  [S.left.layer],
      trailingLayers: [S.right.layer],
      position: 50,
      direction: "horizontal",
    });
    view.ui.add(swipe);
  }

  /* ── İnterfeys ──────────────────────────── */
  function render() {
    // Mənbə başlıqları
    document.getElementById("nameL").textContent = t(SOURCES.left.name);
    document.getElementById("metaL").textContent = t(SOURCES.left.meta);
    document.getElementById("nameR").textContent = t(SOURCES.right.name);
    document.getElementById("metaR").textContent = t(SOURCES.right.meta);

    group("left",  "grpL", "optsL", "visL");
    group("right", "grpR", "optsR", "visR");
    baseChips();
  }

  function group(side, grpId, optsId, swId) {
    const st  = S[side];
    const box = document.getElementById(optsId);
    const sw  = document.getElementById(swId);
    const grp = document.getElementById(grpId);

    grp.classList.toggle("off", !st.on);
    box.innerHTML = "";

    LAYERS[side].forEach(c => {
      const b = document.createElement("button");
      b.className = "opt" + (c.id === st.id ? " on" : "");
      b.innerHTML = `
        <span class="opt-dot"></span>
        <span class="opt-name">${t(c.name)}</span>
        <span class="opt-abbr">${c.abbr}</span>`;
      b.onclick = () => {
        if (c.id === st.id) return;
        st.id = c.id;
        st.on = true;
        render();
        mount(side);
      };
      box.appendChild(b);
    });

    sw.className = "sw" + (st.on ? " on" : "");
    sw.onclick = () => {
      st.on = !st.on;
      if (st.layer) st.layer.visible = st.on;
      render();
    };
  }

  function baseChips() {
    const row = document.getElementById("baseRow");
    row.innerHTML = "";

    const off = document.createElement("button");
    off.className = "chip" + (!baseOn ? " on" : "");
    off.textContent = t("basemapNone");
    off.onclick = () => { baseOn = false; paintBase(false); baseChips(); };
    row.appendChild(off);

    BASEMAPS.forEach(bm => {
      const c = document.createElement("button");
      c.className = "chip" + (baseOn && bm.id === baseId ? " on" : "");
      c.textContent = t(bm.labelKey);
      c.onclick = () => {
        baseId = bm.id; baseOn = true;
        map.basemap = bm.id;
        view.when(() => paintBase(true));
        baseChips();
      };
      row.appendChild(c);
    });
  }

  /* ── Dil dəyişəndə yenidən çək ──────────── */
  window.addEventListener("langchange", () => {
    render();
    const l = document.getElementById("load");
    if (l && !l.classList.contains("hide") && !l.classList.contains("err")) {
      loading(true, t("loading"), t("loadingSub"));
    }
  });

  /* ── Oxunuş ─────────────────────────────── */
  view.on("pointer-move", e => {
    const p = view.toMap({ x: e.x, y: e.y });
    if (!p) return;
    document.getElementById("cLat").textContent = p.latitude?.toFixed(5)  ?? "—";
    document.getElementById("cLon").textContent = p.longitude?.toFixed(5) ?? "—";
  });
  view.watch("zoom", z => {
    document.getElementById("cZoom").textContent = z.toFixed(1);
  });

  /* ── Alətlər ────────────────────────────── */
  document.getElementById("btnHome").onclick = () => {
    const e = S.left.layer?.fullExtent;
    if (e) frame(e, true);
  };

  const panel = document.getElementById("panel");
  const btnP  = document.getElementById("btnPanel");
  function togglePanel() {
    const hidden = panel.classList.toggle("hide");
    btnP.classList.toggle("on", hidden);
  }
  btnP.onclick = togglePanel;
  document.getElementById("panelX").onclick = togglePanel;

  document.getElementById("btnFull").onclick = () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
    else document.exitFullscreen?.();
  };

  let rz;
  window.addEventListener("resize", () => {
    clearTimeout(rz);
    rz = setTimeout(() => {
      const e = S.left.layer?.fullExtent;
      if (e) frame(e, false);
    }, 240);
  });

  /* ── Yüklənmə ───────────────────────────── */
  function loading(show, a = null, b = null) {
    const el = document.getElementById("load");
    const T  = document.getElementById("loadT");
    const B  = document.getElementById("loadS");
    if (T) T.textContent = a ?? t("loading");
    if (B) B.textContent = b ?? t("loadingSub");
    el.classList.toggle("hide", !show);
  }

  /* ── Başlanğıc ──────────────────────────── */
  view.when(async () => {
    paintBase(baseOn);
    render();
    await mount("left");
    await mount("right");
  }, err => {
    fail(t("errMap"), err?.message || String(err));
  });

},
function (err) {
  const title = (typeof t === "function") ? t("errModule") : "ArcGIS module failed";
  const lbl   = (typeof t === "function") ? t("errModules") : "Modules";
  fail(title, lbl + ": " + (err?.requireModules?.join(", ") || "?") + "\n\n" + (err?.message || String(err)));
});
