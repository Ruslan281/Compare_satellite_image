/**
 * config.js — KONFİQURASİYA
 * ═══════════════════════════════════════════════════════
 * Yalnız bu faylı dəyiş.
 * Mətnlər üç dildə verilir: az · en · ru
 * ═══════════════════════════════════════════════════════
 */

/* ── MƏNBƏLƏR ────────────────────────────────────────── */
const SOURCES = {
  left: {
    name: { az: "Sentinel-2A",     en: "Sentinel-2A",      ru: "Sentinel-2A" },
    meta: { az: "10 m / piksel",   en: "10 m / pixel",     ru: "10 м / пиксель" },
  },
  right: {
    name: { az: "Superrezolusiya", en: "Super-resolution", ru: "Суперразрешение" },
    meta: { az: "1 m / piksel",    en: "1 m / pixel",      ru: "1 м / пиксель" },
  },
};

/* ── NDVI rəng rampası ───────────────────────────────── */
const NDVI_RENDERER = {
  type: "raster-stretch",
  stretchType: "percent-clip",
  minPercent: 2,
  maxPercent: 2,
  dynamicRangeAdjustment: true,
  colorRamp: {
    type: "multipart",
    colorRamps: [
      { type: "algorithmic", fromColor: [161,  98,  47], toColor: [240, 234, 196], algorithm: "hsv" },
      { type: "algorithmic", fromColor: [240, 234, 196], toColor: [ 34, 110,  56], algorithm: "hsv" },
    ],
  },
};

/* ── TƏBƏQƏLƏR ───────────────────────────────────────── */
const LAYERS = {

  left: [
    {
      id:      "l_tci",
      name:    { az: "Təbii rəng", en: "Natural colour", ru: "Естественный цвет" },
      abbr:    "RGB",
      url:     "https://tiledimageservices8.arcgis.com/ZfW6BM2PrMRnWp6w/arcgis/rest/services/left_tci/ImageServer",
      default: true,
    },
    {
      id:   "l_irp",
      name: { az: "İnfraqırmızı", en: "Infrared", ru: "Инфракрасный" },
      abbr: "IRP",
      url:  "https://tiledimageservices8.arcgis.com/ZfW6BM2PrMRnWp6w/arcgis/rest/services/left_irp/ImageServer",
    },
    {
      id:       "l_ndvi",
      name:     { az: "Bitki indeksi", en: "Vegetation index", ru: "Вегетационный индекс" },
      abbr:     "NDVI",
      url:      "https://tiledimageservices8.arcgis.com/ZfW6BM2PrMRnWp6w/arcgis/rest/services/left_ndvi/ImageServer",
      renderer: NDVI_RENDERER,
      bandIds:  [0],
    },
  ],

  right: [
    {
      id:      "r_tci",
      name:    { az: "Təbii rəng", en: "Natural colour", ru: "Естественный цвет" },
      abbr:    "RGB",
      url:     "https://tiledimageservices8.arcgis.com/ZfW6BM2PrMRnWp6w/arcgis/rest/services/right_tci/ImageServer",
      default: true,
    },
    {
      id:   "r_irp",
      name: { az: "İnfraqırmızı", en: "Infrared", ru: "Инфракрасный" },
      abbr: "IRP",
      url:  "https://tiledimageservices8.arcgis.com/ZfW6BM2PrMRnWp6w/arcgis/rest/services/right_irp/ImageServer",
    },
    {
      id:       "r_ndvi",
      name:     { az: "Bitki indeksi", en: "Vegetation index", ru: "Вегетационный индекс" },
      abbr:     "NDVI",
      url:      "https://tiledimageservices8.arcgis.com/ZfW6BM2PrMRnWp6w/arcgis/rest/services/right_ndvi/ImageServer",
      renderer: NDVI_RENDERER,
      bandIds:  [0],
    },
  ],

};

/* ── ALTLIQ XƏRİTƏLƏR ────────────────────────────────── */
// labelKey — i18n.js faylındakı açar
const BASEMAPS = [
  { id: "satellite",   labelKey: "bmSatellite" },
  { id: "hybrid",      labelKey: "bmHybrid" },
  { id: "topo-vector", labelKey: "bmTopo" },
  { id: "gray-vector", labelKey: "bmGray" },
];

const BASEMAP_DEFAULT  = "gray-vector";
const BASEMAP_ON_START = false;

/* ── GÖRÜNÜŞ ─────────────────────────────────────────── */
const COVER_ZOOM    = 1.0;
const LOCK_ZOOM_OUT = true;
const LOCK_PAN      = true;
