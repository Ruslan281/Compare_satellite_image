/**
 * config.js — YALNIZ BU FAYЛИ DƏYİŞ
 * ════════════════════════════════════════════════════
 *
 * src       — COG faylının URL-i
 * bandIds   — göstəriləcək bandlar, 0-dan başlayır!
 *               RGB (1,2,3 bandları) → [0, 1, 2]
 *               Tək band            → [0]
 * stretch   — "percent-clip" | "min-max" | "standard-deviation" | "none"
 *               percent-clip ən yaxşı nəticə verir (avtomatik parlaqlıq)
 * default   — true olan lay başlanğıcda aktiv olur
 * ════════════════════════════════════════════════════
 */

// Repo bazası — GitHub Pages üçün nisbi yol
const BASE = "assets/";

const LAYERS = {

  left: [
    {
      id:      "left_tci",
      label:   "TCI — True Color",
      src:     BASE + "left_TCI_web.tif",
      bandIds: [0, 1, 2],
      stretch: "percent-clip",
      badge:   "Əvvəl · TCI",
      meta:    "RGB",
      default: true,
    },
    {
      id:      "left_irp",
      label:   "IRP — İnfraqırmızı",
      src:     BASE + "left_IRP_web.tif",
      bandIds: [0, 1, 2],
      stretch: "percent-clip",
      badge:   "Əvvəl · IRP",
      meta:    "NIR",
      default: false,
    },
    {
      id:      "left_ndvi",
      label:   "NDVI",
      src:     BASE + "left_NDVI_web.tif",
      bandIds: [0],
      stretch: "percent-clip",
      colorRamp: "ndvi",
      badge:   "Əvvəl · NDVI",
      meta:    "Bitki",
      default: false,
    },
  ],

  right: [
    {
      id:      "right_tci",
      label:   "TCI — True Color",
      src:     BASE + "right_TCI_web.tif",
      bandIds: [0, 1, 2],
      stretch: "percent-clip",
      badge:   "Sonra · TCI",
      meta:    "RGB",
      default: true,
    },
    {
      id:      "right_irp",
      label:   "IRP — İnfraqırmızı",
      src:     BASE + "right_IRP_web.tif",
      bandIds: [0, 1, 2],
      stretch: "percent-clip",
      badge:   "Sonra · IRP",
      meta:    "NIR",
      default: false,
    },
    {
      id:      "right_ndvi",
      label:   "NDVI",
      src:     BASE + "right_NDVI_web.tif",
      bandIds: [0],
      stretch: "percent-clip",
      colorRamp: "ndvi",
      badge:   "Sonra · NDVI",
      meta:    "Bitki",
      default: false,
    },
  ],
};

// ── Altlıq xəritələr ─────────────────────────────────
const BASEMAPS = [
  { id: "satellite",         label: "Satellite" },
  { id: "hybrid",            label: "Hybrid" },
  { id: "topo-vector",       label: "Topoqrafik" },
  { id: "gray-vector",       label: "Boz" },
];

const DEFAULT_BASEMAP = "satellite";

// Başlanğıc altlıq xəritə görünsünmü
const BASEMAP_VISIBLE_ON_START = false;
