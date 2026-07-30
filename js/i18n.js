const I18N = {

  az: {
    brand:        "GeoSolver SuperResolution (1 m / piksel)",
    info:         "Məlumat",
    tipHome:      "Görüntüyə qayıt",
    tipPanel:     "Panel",
    tipFull:      "Tam ekran",
    tipVis:       "Görünürlük",
    tipClose:     "Bağla",

    panelTitle:   "Laylar",
    basemapTitle: "Altlıq xəritə",
    basemapNone:  "Yoxdur",

    bmSatellite:  "Peyk",
    bmHybrid:     "Hibrid",
    bmTopo:       "Topoqrafik",
    bmGray:       "Boz",

    loading:      "Yüklənir",
    loadingSub:   "servis oxunur",

    errPublic:    "Servis public deyil",
    errPublicMsg: "Bu lay ArcGIS Online-da 'Everyone (public)' kimi paylaşılmayıb.\nLay səhifəsi → Share → Everyone\n\n",
    errService:   "Servis açılmadı",
    errMap:       "Xəritə açılmadı",
    errModule:    "ArcGIS modulu yüklənmədi",
    errModules:   "Modullar",
  },

  en: {
    brand:        "GeoSolver SuperResolution (1 m / pixel)",
    info:         "Info",
    tipHome:      "Zoom to imagery",
    tipPanel:     "Panel",
    tipFull:      "Fullscreen",
    tipVis:       "Visibility",
    tipClose:     "Close",

    panelTitle:   "Layers",
    basemapTitle: "Basemap",
    basemapNone:  "None",

    bmSatellite:  "Satellite",
    bmHybrid:     "Hybrid",
    bmTopo:       "Topographic",
    bmGray:       "Gray",

    loading:      "Loading",
    loadingSub:   "reading service",

    errPublic:    "Service is not public",
    errPublicMsg: "This layer is not shared as 'Everyone (public)' in ArcGIS Online.\nLayer page → Share → Everyone\n\n",
    errService:   "Service failed to load",
    errMap:       "Map failed to load",
    errModule:    "ArcGIS module failed to load",
    errModules:   "Modules",
  },

  ru: {
    brand:        "GeoSolver SuperResolution (1 м / пиксель)",
    info:         "Информация",
    tipHome:      "Вернуться к снимку",
    tipPanel:     "Панель",
    tipFull:      "Полный экран",
    tipVis:       "Видимость",
    tipClose:     "Закрыть",

    panelTitle:   "Слои",
    basemapTitle: "Подложка",
    basemapNone:  "Нет",

    bmSatellite:  "Спутник",
    bmHybrid:     "Гибрид",
    bmTopo:       "Топографическая",
    bmGray:       "Серая",

    loading:      "Загрузка",
    loadingSub:   "чтение сервиса",

    errPublic:    "Сервис не публичный",
    errPublicMsg: "Этот слой не опубликован как 'Everyone (public)' в ArcGIS Online.\nСтраница слоя → Share → Everyone\n\n",
    errService:   "Не удалось загрузить сервис",
    errMap:       "Не удалось загрузить карту",
    errModule:    "Не удалось загрузить модуль ArcGIS",
    errModules:   "Модули",
  },

};


const LANG_LIST = ["az", "en", "ru"];

let LANG = (function () {
  try {
    const saved = localStorage.getItem("geoslice_lang");
    if (saved && LANG_LIST.includes(saved)) return saved;
  } catch (e) {}
  const nav = (navigator.language || "az").slice(0, 2).toLowerCase();
  return LANG_LIST.includes(nav) ? nav : "az";
})();


function t(key) {
  if (key && typeof key === "object") {
    return key[LANG] || key.az || key.en || "";
  }
  const d = I18N[LANG] || I18N.az;
  return d[key] ?? I18N.az[key] ?? key;
}

function applyStaticI18n() {
  document.documentElement.lang = LANG;

  document.querySelectorAll("[data-i18n]").forEach(el => {
    el.textContent = t(el.getAttribute("data-i18n"));
  });
  document.querySelectorAll("[data-i18n-title]").forEach(el => {
    el.title = t(el.getAttribute("data-i18n-title"));
  });
  document.querySelectorAll("[data-i18n-aria]").forEach(el => {
    el.setAttribute("aria-label", t(el.getAttribute("data-i18n-aria")));
  });

  document.querySelectorAll(".lang-btn").forEach(b => {
    b.classList.toggle("on", b.dataset.lang === LANG);
  });
}

function setLang(l) {
  if (!LANG_LIST.includes(l) || l === LANG) return;
  LANG = l;
  try { localStorage.setItem("geoslice_lang", l); } catch (e) {}
  applyStaticI18n();
  window.dispatchEvent(new CustomEvent("langchange"));
}

document.addEventListener("DOMContentLoaded", () => {
  applyStaticI18n();
  document.querySelectorAll(".lang-btn").forEach(b => {
    b.addEventListener("click", () => setLang(b.dataset.lang));
  });
});
