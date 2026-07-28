/**
 * app.js — GeoSlice
 * ══════════════════════════════════════════════
 * ArcGIS Maps SDK · ImageryTileLayer · Swipe
 * Konfiqurasiya config.js faylındadır.
 * ══════════════════════════════════════════════
 */

/* ── Xəta ekranı ──────────────────────────── */
function fail(title, detail) {
  const el = document.getElementById("load");
  el.classList.remove("hide");
  el.classList.add("err");
  el.innerHTML = `
    <div class="load-inner">
      <div class="load-mark">
        <svg width="34" height="34" viewBox="0 0 34 34" fill="none">
          <circle cx="17" cy="17" r="15" stroke="currentColor" stroke-width="1.5"/>
          <path d="M17 10v9M17 23.5v.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </div>
      <div class="load-t">${title}</div>
      <div class="err-box">${detail}</div>
    </div>`;
}

window.addEventListener("unhandledrejection", e => {
  console.error("Promise xətası:", e.reason);
});

/* ── AMD ──────────────────────────────────── */
require([
  "esri/Map",
  "esri/views/MapView",
  "esri/layers/ImageryTileLayer",
  "esri/widgets/Swipe",
], function (Map, MapView, ImageryTileLayer, Swipe) {

  /* ── Vəziyyət ───────────────────────────── */
  const S = {
    left:  { id: pick("left"),  on: true, layer: null },
    right: { id: pick("right"), on: true, layer: null },
  };
  function pick(side) {
    return (LAYERS[side].find(l => l.default) || LAYERS[side][0]).id;
  }
  function cfgOf(side) {
    return LAYERS[side].find(l => l.id === S[side].id);
  }

  let baseId    = BASEMAP_DEFAULT;
  let baseOn    = BASEMAP_ON_START;
  let swipe     = null;
  let framed    = false;

  /* ── Xəritə ─────────────────────────────── */
  const map = new Map({ basemap: baseId });

  const view = new MapView({
    container:   "viewDiv",
    map:         map,
    ui:          { components: ["zoom", "attribution"] },
    center:      [48.88, 39.80],
    zoom:        11,
    spatialReference: { wkid: 3857 },
    constraints: { snapToZoom: true, rotationEnabled: false },
  });

  /* ── Altlıq görünürlüyü ─────────────────── */
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

    const t = extent.clone();
    t.xmin = cx - w/2;  t.xmax = cx + w/2;
    t.ymin = cy - h/2;  t.ymax = cy + h/2;

    view.constraints.minScale = 0;
    await view.goTo(t, { animate: !!animate });

    if (LOCK_ZOOM_OUT) view.constraints.minScale = view.scale;
    if (LOCK_PAN)      bindPan();
  }

  /* ── Pan sərhədi ────────────────────────── */
  function bindPan() {
    const ext = S.left.layer?.fullExtent;
    if (!ext || !view.extent) return;

    const hw = view.extent.width  / 2;
    const hh = view.extent.height / 2;
    const cx = (ext.xmin + ext.xmax) / 2;
    const cy = (ext.ymin + ext.ymax) / 2;

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
    const st  = S[side];
    const cfg = cfgOf(side);

    loading(true, cfg.tag || cfg.label, "servis oxunur");

    if (st.layer) { map.remove(st.layer); st.layer = null; }

    const opts = { url: cfg.url, title: cfg.label, opacity: 1 };
    if (cfg.renderer) opts.renderer = cfg.renderer;
    if (cfg.bandIds)  opts.bandIds  = cfg.bandIds;

    const layer = new ImageryTileLayer(opts);
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
        (auth
          ? "Bu lay ArcGIS Online-da 'Everyone (public)' kimi paylaşılmayıb.\n" +
            "Lay səhifəsi → Share → Everyone → yadda saxla.\n\n"
          : "") +
        "URL:\n" + cfg.url + "\n\n" + m
      );
      return;
    }

    document.getElementById(side === "left" ? "tagL" : "tagR").textContent = cfg.tag || cfg.label;

    joinSwipe();
    loading(false);
    draw();
  }

  /* ── Swipe ──────────────────────────────── */
  function joinSwipe() {
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

    swipe.watch("position", p => {
      const t = document.getElementById("tagR");
      t.style.left = p + "%";
    });
  }

  /* ── İnterfeys ──────────────────────────── */
  const EYE_ON  = `<svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M1.3 8S3.9 3.4 8 3.4 14.7 8 14.7 8 12.1 12.6 8 12.6 1.3 8 1.3 8z" stroke="currentColor" stroke-width="1.25"/><circle cx="8" cy="8" r="2.2" stroke="currentColor" stroke-width="1.25"/></svg>`;
  const EYE_OFF = `<svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M2.4 2.4l11.2 11.2" stroke="currentColor" stroke-width="1.25" stroke-linecap="round"/><path d="M6.3 6.5A2.2 2.2 0 009.5 9.6M1.3 8S3.9 3.4 8 3.4c.9 0 1.8.2 2.5.6M14.7 8s-.9 1.6-2.4 2.9" stroke="currentColor" stroke-width="1.25" stroke-linecap="round"/></svg>`;

  function draw() {
    side("left",  "segL", "eyeL");
    side("right", "segR", "eyeR");
    chips();
  }

  function side(which, segId, eyeId) {
    const st  = S[which];
    const seg = document.getElementById(segId);
    const eye = document.getElementById(eyeId);

    seg.innerHTML = "";
    seg.classList.toggle("dim", !st.on);

    LAYERS[which].forEach(cfg => {
      const b = document.createElement("button");
      b.textContent = cfg.label;
      b.className = cfg.id === st.id ? "on" : "";
      b.onclick = () => {
        if (cfg.id === st.id) return;
        st.id = cfg.id;
        st.on = true;
        draw();
        mount(which);
      };
      seg.appendChild(b);
    });

    eye.innerHTML = st.on ? EYE_ON : EYE_OFF;
    eye.className = "eye" + (st.on ? " on" : "");
    eye.onclick = () => {
      st.on = !st.on;
      if (st.layer) st.layer.visible = st.on;
      draw();
    };
  }

  function chips() {
    const box = document.getElementById("chipsBase");
    box.innerHTML = "";

    const off = document.createElement("button");
    off.className = "chip" + (!baseOn ? " on" : "");
    off.textContent = "Yoxdur";
    off.onclick = () => { baseOn = false; paintBase(false); chips(); syncTool(); };
    box.appendChild(off);

    BASEMAPS.forEach(bm => {
      const c = document.createElement("button");
      c.className = "chip" + (baseOn && bm.id === baseId ? " on" : "");
      c.textContent = bm.label;
      c.onclick = () => {
        baseId = bm.id;
        baseOn = true;
        map.basemap = bm.id;
        view.when(() => paintBase(true));
        chips(); syncTool();
      };
      box.appendChild(c);
    });
  }

  function syncTool() {
    // panel düyməsi vəziyyəti nəzarət kartına bağlıdır, altlığa yox
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

  const ctrl = document.getElementById("ctrl");
  const btnPanel = document.getElementById("btnPanel");
  btnPanel.onclick = () => {
    const hidden = ctrl.classList.toggle("hide");
    btnPanel.classList.toggle("on", hidden);
  };

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
    const T  = document.getElementById("loadT");
    const Sb = document.getElementById("loadS");
    if (T)  T.textContent  = t;
    if (Sb) Sb.textContent = s;
    el.classList.toggle("hide", !show);
  }

  /* ── Başlanğıc ──────────────────────────── */
  view.when(async () => {
    paintBase(baseOn);
    draw();
    await mount("left");
    await mount("right");
  }, err => {
    fail("Xəritə açılmadı", err?.message || String(err));
  });

},
function (err) {
  fail(
    "ArcGIS modulu yüklənmədi",
    "Modullar: " + (err?.requireModules?.join(", ") || "?") + "\n\n" +
    (err?.message || String(err))
  );
});
