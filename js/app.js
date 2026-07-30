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

  /* ══════════════════════════════════════════
     NAVİQASİYA PƏNCƏRƏSİ
     Esri zoom düymələrinin altında.
     4 ox + mərkəzdə "əraziyə qayıt".
     PAN_STEP — hər klikdə nə qədər sürüşsün.
  ══════════════════════════════════════════ */
  const PAN_STEP = 0.16;   // 0.10 = çox kiçik · 0.16 = hazırkı · 0.30 = böyük

  let padEl   = null;
  let panBusy = false;

  (function buildNavPad() {

    const css = document.createElement("style");
    css.textContent = `
      .navpad {
        display: grid;
        grid-template-columns: repeat(3, 34px);
        grid-template-rows: repeat(3, 34px);
        gap: 1px;
        background: rgba(23,25,29,.92);
        backdrop-filter: blur(12px);
        border-radius: 11px;
        overflow: hidden;
        box-shadow: 0 2px 10px rgba(0,0,0,.18);
        margin-top: 8px;
      }
      .navpad button {
        display: grid;
        place-items: center;
        border: none;
        background: transparent;
        color: var(--w-2);
        cursor: pointer;
        padding: 0;
        transition: background .14s, color .14s, opacity .14s;
      }
      .navpad button:hover:not(.off) { background: rgba(255,255,255,.07); color: var(--acc); }
      .navpad button:active:not(.off) { background: var(--acc-soft); }
      .navpad button.off {
        opacity: .22;
        cursor: default;
      }
      .navpad .np-void { pointer-events: none; }
      .navpad .np-home { color: var(--w-3); }
      .navpad .np-home:hover { color: var(--acc); }

      @media (max-width: 760px) {
        .navpad { grid-template-columns: repeat(3, 38px); grid-template-rows: repeat(3, 38px); }
      }
    `;
    document.head.appendChild(css);

    const arrow = deg => `<svg width="14" height="14" viewBox="0 0 16 16" fill="none"
        style="transform:rotate(${deg}deg)">
        <path d="M8 3.2v9.6M4.4 6.8L8 3.2l3.6 3.6"
              stroke="currentColor" stroke-width="1.5"
              stroke-linecap="round" stroke-linejoin="round"/></svg>`;

    const target = `<svg width="14" height="14" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="2.6" stroke="currentColor" stroke-width="1.4"/>
        <path d="M8 1v2.2M8 12.8V15M1 8h2.2M12.8 8H15"
              stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>`;

    const pad = document.createElement("div");
    pad.className = "navpad";
    padEl = pad;

    const cells = [
      { t: "void" },
      { t: "pan", dx:  0, dy:  1, icon: arrow(0),   dir: "up" },
      { t: "void" },
      { t: "pan", dx: -1, dy:  0, icon: arrow(270), dir: "left" },
      { t: "home" },
      { t: "pan", dx:  1, dy:  0, icon: arrow(90),  dir: "right" },
      { t: "void" },
      { t: "pan", dx:  0, dy: -1, icon: arrow(180), dir: "down" },
      { t: "void" },
    ];

    cells.forEach(c => {
      if (c.t === "void") {
        const d = document.createElement("div");
        d.className = "np-void";
        pad.appendChild(d);
        return;
      }
      const b = document.createElement("button");
      if (c.t === "home") {
        b.className = "np-home";
        b.innerHTML = target;
        b.title = t("tipHome");
        b.onclick = () => {
          const e = S.left.layer?.fullExtent;
          if (e) frame(e, true).then(updatePadState).catch(() => {});
        };
      } else {
        b.innerHTML = c.icon;
        b.dataset.dir = c.dir;
        b.dataset.dx  = c.dx;
        b.dataset.dy  = c.dy;
        b.onclick = () => pan(c.dx, c.dy);
      }
      pad.appendChild(b);
    });

    view.ui.add(pad, "top-left");

    window.addEventListener("langchange", () => {
      const h = pad.querySelector(".np-home");
      if (h) h.title = t("tipHome");
    });

    // Xəritə dayandıqda düymələrin vəziyyətini yenilə
    view.watch("stationary", st => { if (st) updatePadState(); });
    view.when(() => setTimeout(updatePadState, 400));
  })();

  /* ── İcazə verilən mərkəz sahəsi ── */
  function panBounds() {
    const g = view.constraints?.geometry;
    if (g) return { xmin: g.xmin, xmax: g.xmax, ymin: g.ymin, ymax: g.ymax };
    return null;
  }

  /* ── Sürüşdürmə ── */
  function pan(dx, dy) {
    const e = view.extent;
    if (!e || !view.center || panBusy) return;

    let tx = view.center.x + e.width  * PAN_STEP * dx;
    let ty = view.center.y + e.height * PAN_STEP * dy;

    // Sərhədi öz tərəfimizdən tətbiq et — goTo-nun gözlənilməz
    // davranışının qarşısını alır
    const b = panBounds();
    if (b) {
      tx = Math.max(b.xmin, Math.min(b.xmax, tx));
      ty = Math.max(b.ymin, Math.min(b.ymax, ty));
    }

    // Faktiki dəyişiklik yoxdursa heç nə etmə
    const eps = Math.max(e.width, e.height) * 1e-5;
    if (Math.abs(tx - view.center.x) < eps && Math.abs(ty - view.center.y) < eps) {
      updatePadState();
      return;
    }

    panBusy = true;
    view.goTo({ center: [tx, ty] }, { duration: 240, easing: "ease-out" })
        .catch(() => {})                       // animasiya kəsilsə susdur
        .finally(() => { panBusy = false; updatePadState(); });
  }

  /* ── Hansı istiqamətdə yer var ── */
  function updatePadState() {
    if (!padEl || !view.extent || !view.center) return;
    const e = view.extent;
    const b = panBounds();

    padEl.querySelectorAll("button[data-dir]").forEach(btn => {
      if (!b) { btn.classList.remove("off"); return; }

      const dx = +btn.dataset.dx, dy = +btn.dataset.dy;
      const eps = Math.max(e.width, e.height) * 1e-4;

      let can;
      if (dx > 0)      can = view.center.x < b.xmax - eps;
      else if (dx < 0) can = view.center.x > b.xmin + eps;
      else if (dy > 0) can = view.center.y < b.ymax - eps;
      else             can = view.center.y > b.ymin + eps;

      btn.classList.toggle("off", !can);
    });
  }

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
