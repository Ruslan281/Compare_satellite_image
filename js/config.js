/**
 * config.js — KONFİQURASİYA
 * ═══════════════════════════════════════════════════════
 * Yalnız bu faylı dəyiş.
 * ═══════════════════════════════════════════════════════
 */

/* ── MƏNBƏLƏR ────────────────────────────────────────────
   Panelin başlığında görünən mətn və hər tərəfin rəngi.
   Rəng həm panelə, həm slice oxuna tətbiq olunur.
──────────────────────────────────────────────────────── */
const SOURCES = {
  left: {
    name:  "Sentinel-2",
    meta:  "10 m / piksel",
    color: "#2D6BA8",          // polad mavi
  },
  right: {
    name:  "Superrezolusiya",
    meta:  "1 m / piksel",
    color: "#C4622D",          // terrakota
  },
};

/* ── NDVI rəng rampası ─────────────────────────────────── */
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

/* ── TƏBƏQƏLƏR ───────────────────────────────────────────
   name — tam izahat (paneldə solda)
   abbr — qısaltma (paneldə sağda, mono şriftlə)
   url  — ArcGIS Online ImageServer ünvanı
──────────────────────────────────────────────────────── */
const LAYERS = {

  left: [
    {
      id:      "l_tci",
      name:    "Təbii rəng",
      abbr:    "RGB",
      url:     "https://tiledimageservices8.arcgis.com/ZfW6BM2PrMRnWp6w/arcgis/rest/services/left_tci/ImageServer",
      default: true,
    },
    {
      id:   "l_irp",
      name: "İnfraqırmızı",
      abbr: "IRP",
      url:  "https://tiledimageservices8.arcgis.com/ZfW6BM2PrMRnWp6w/arcgis/rest/services/left_irp/ImageServer",
    },
    {
      id:       "l_ndvi",
      name:     "Bitki indeksi",
      abbr:     "NDVI",
      url:      "https://tiledimageservices8.arcgis.com/ZfW6BM2PrMRnWp6w/arcgis/rest/services/left_ndvi/ImageServer",
      renderer: NDVI_RENDERER,
      bandIds:  [0],
    },
  ],

  right: [
    {
      id:      "r_tci",
      name:    "Təbii rəng",
      abbr:    "RGB",
      url:     "https://tiledimageservices8.arcgis.com/ZfW6BM2PrMRnWp6w/arcgis/rest/services/right_tci/ImageServer",
      default: true,
    },
    {
      id:   "r_irp",
      name: "İnfraqırmızı",
      abbr: "IRP",
      url:  "https://tiledimageservices8.arcgis.com/ZfW6BM2PrMRnWp6w/arcgis/rest/services/right_irp/ImageServer",
    },
    {
      id:       "r_ndvi",
      name:     "Bitki indeksi",
      abbr:     "NDVI",
      url:      "https://tiledimageservices8.arcgis.com/ZfW6BM2PrMRnWp6w/arcgis/rest/services/right_ndvi/ImageServer",
      renderer: NDVI_RENDERER,
      bandIds:  [0],
    },
  ],

};

/* ── ALTLIQ XƏRİTƏLƏR ──────────────────────────────────── */
const BASEMAPS = [
  { id: "satellite",   label: "Peyk" },
  { id: "hybrid",      label: "Hibrid" },
  { id: "topo-vector", label: "Topo" },
  { id: "gray-vector", label: "Boz" },
];

const BASEMAP_DEFAULT  = "gray-vector";
const BASEMAP_ON_START = false;

/* ── GÖRÜNÜŞ ───────────────────────────────────────────── */
// Görüntü ekranı nə qədər doldursun (kənarda boşluq qalırsa artır)
const COVER_ZOOM    = 1.18;
// Başlanğıc miqyasdan geri zoom etmək olmasın
const LOCK_ZOOM_OUT = true;
// Görüntü sərhədindən kənara sürüşmək olmasın
const LOCK_PAN      = true;
