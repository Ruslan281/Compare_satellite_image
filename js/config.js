/**
 * config.js — KONFİQURASİYA
 * ══════════════════════════════════════════════════════
 * Yalnız bu faylı dəyiş.
 *
 * Hər lay üçün:
 *   id       — unikal ad
 *   label    — seqment düyməsində görünən qısa ad (2-5 hərf yaxşıdır)
 *   url      — ArcGIS Online ImageServer URL-i
 *   tag      — xəritənin yuxarısındakı nişan mətni
 *   default  — true olan lay başlanğıcda açılır
 *
 * İSTƏYƏ GÖRƏ:
 *   renderer — verilməzsə servisin öz görünüşü işlədilir (tövsiyə)
 *              NDVI kimi tək bandlı laylar üçün rəng rampası verilir
 *   bandIds  — verilməzsə servisin öz band sırası işlədilir
 * ══════════════════════════════════════════════════════
 */

// NDVI üçün rəng rampası: qonur → sarı → yaşıl
const NDVI_RENDERER = {
  type: "raster-stretch",
  stretchType: "percent-clip",
  minPercent: 2,
  maxPercent: 2,
  dynamicRangeAdjustment: true,
  colorRamp: {
    type: "multipart",
    colorRamps: [
      { type: "algorithmic", fromColor: [166,  97,  26], toColor: [242, 238, 197], algorithm: "hsv" },
      { type: "algorithmic", fromColor: [242, 238, 197], toColor: [ 20, 110,  52], algorithm: "hsv" },
    ],
  },
};

const LAYERS = {

  left: [
    {
      id:      "l_tci",
      label:   "TCI",
      url:     "https://tiledimageservices8.arcgis.com/ZfW6BM2PrMRnWp6w/arcgis/rest/services/left_tci/ImageServer",
      tag:     "Əvvəl · True Color",
      default: true,
    },
    {
      id:      "l_irp",
      label:   "IRP",
      url:     "https://tiledimageservices8.arcgis.com/ZfW6BM2PrMRnWp6w/arcgis/rest/services/left_irp/ImageServer",
      tag:     "Əvvəl · İnfraqırmızı",
    },
    {
      id:       "l_ndvi",
      label:    "NDVI",
      url:      "https://tiledimageservices8.arcgis.com/ZfW6BM2PrMRnWp6w/arcgis/rest/services/left_ndvi/ImageServer",
      tag:      "Əvvəl · NDVI",
      renderer: NDVI_RENDERER,
      bandIds:  [0],
    },
  ],

  right: [
    {
      id:      "r_tci",
      label:   "TCI",
      url:     "https://tiledimageservices8.arcgis.com/ZfW6BM2PrMRnWp6w/arcgis/rest/services/right_tci/ImageServer",
      tag:     "Sonra · True Color",
      default: true,
    },
    {
      id:      "r_irp",
      label:   "IRP",
      url:     "https://tiledimageservices8.arcgis.com/ZfW6BM2PrMRnWp6w/arcgis/rest/services/right_irp/ImageServer",
      tag:     "Sonra · İnfraqırmızı",
    },
    {
      id:       "r_ndvi",
      label:    "NDVI",
      url:      "https://tiledimageservices8.arcgis.com/ZfW6BM2PrMRnWp6w/arcgis/rest/services/right_ndvi/ImageServer",
      tag:      "Sonra · NDVI",
      renderer: NDVI_RENDERER,
      bandIds:  [0],
    },
  ],

};

// ── Altlıq xəritələr ──────────────────────────────────
const BASEMAPS = [
  { id: "satellite",   label: "Peyk" },
  { id: "hybrid",      label: "Hibrid" },
  { id: "topo-vector", label: "Topo" },
  { id: "gray-vector", label: "Boz" },
];

const BASEMAP_DEFAULT = "gray-vector";

// Altlıq başlanğıcda görünsünmü
const BASEMAP_ON_START = false;

// ── Görünüş ───────────────────────────────────────────
// Görüntü ekranı nə qədər doldursun.
// Kənarlarda boşluq qalırsa artır: 1.25 · 1.35 · 1.5
const COVER_ZOOM = 1.18;

// Başlanğıc miqyasdan geri zoom etmək olmasın
const LOCK_ZOOM_OUT = true;

// Görüntünün sərhədindən kənara sürüşdürmək olmasın
const LOCK_PAN = true;
