/**
 * app.js — GeoSlice
 * ══════════════════════════════════════════════
 * Konfiqurasiya config.js faylındadır.
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

/* ── Mənbə başlıqları ─────────────────────── */
document.getElementById("nameL").textContent = SOURCES.left.name;
document.getElementById("metaL").textContent = SOURCES.left.meta;
document.getElementById("nameR").textContent = SOURCES.right.name;
document.getElementById("metaR").textContent = SOURCES.right.meta;

/* ── AMD ──────────────────────────────────── */
require([
  "esri/Map",
  "esri/views/MapView",
  "esri/layers/ImageryTileLayer",
  "esri/widgets/Swipe",
], function (Map, MapView, ImageryTileLayer, Swipe) {

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
    const t  = extent.clone();
    t.xmin = cx - w/2; t.xmax = cx + w/2;
    t.ymin = cy - h/2; t.ymax = cy + h/2;

    view.constraints.minScale = 0;
    await view.goTo(t, { animate: !!animate });

    // ── Qalıq boşluğu təmizlə ──────────────────────
    // Zoom pilləsi və ya yuvarlaqlaşma səbəbindən kənarda
    // ağ zolaq qalarsa, görünən sahə görüntünün içinə
    // tam sığana qədər addım-addım yaxınlaşdır.
    for (let i = 0; i < 6; i++) {
      const ve = view.extent;
      if (!ve) break;
      const wide = ve.width  > extent.width;
      const tall = ve.height > extent.height;
      if (!wide && !tall) break;
      await view.goTo({ scale: view.scale * 0.93 }, { animate: false });
    }

    if (LOCK_ZOOM_OUT) view.constraints.minScale = view.scale;
    if (LOCK_PAN)      bindPan();
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
    loading(true, c.name, SOURCES[side].name);

    if (st.layer) { map.remove(st.layer); st.layer = null; }

    const o = { url: c.url, title: c.name, opacity: 1 };
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
        auth ? "Servis public deyil" : "Servis açılmadı",
        (auth ? "Bu təbəqə ArcGIS Online-da 'Everyone (public)' kimi paylaşılmayıb.\nLay səhifəsi → Share → Everyone\n\n" : "") +
        "URL:\n" + c.url + "\n\n" + m
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
        <span class="opt-name">${c.name}</span>
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
    off.textContent = "Yoxdur";
    off.onclick = () => { baseOn = false; paintBase(false); baseChips(); };
    row.appendChild(off);

    BASEMAPS.forEach(bm => {
      const c = document.createElement("button");
      c.className = "chip" + (baseOn && bm.id === baseId ? " on" : "");
      c.textContent = bm.label;
      c.onclick = () => {
        baseId = bm.id; baseOn = true;
        map.basemap = bm.id;
        view.when(() => paintBase(true));
        baseChips();
      };
      row.appendChild(c);
    });
  }

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
  function loading(show, t = "Yüklənir", s = "") {
    const el = document.getElementById("load");
    const T = document.getElementById("loadT");
    const B = document.getElementById("loadS");
    if (T) T.textContent = t;
    if (B) B.textContent = s;
    el.classList.toggle("hide", !show);
  }

  /* ── Başlanğıc ──────────────────────────── */
  view.when(async () => {
    paintBase(baseOn);
    render();
    await mount("left");
    await mount("right");
  }, err => {
    fail("Xəritə açılmadı", err?.message || String(err));
  });

},
function (err) {
  fail(
    "ArcGIS modulu yüklənmədi",
    "Modullar: " + (err?.requireModules?.join(", ") || "?") + "\n\n" + (err?.message || String(err))
  );
});
