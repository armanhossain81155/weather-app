// =========================================
// SkyCast — Weather App
// Data: Open-Meteo (free, no API key needed)
// Icons: Meteocons (animated SVG)
// =========================================

const GEO_URL = "https://geocoding-api.open-meteo.com/v1/search";
const WEATHER_URL = "https://api.open-meteo.com/v1/forecast";
const ICON_URL = "https://cdn.jsdelivr.net/gh/basmilius/weather-icons@2.0.0/production/fill/all";

const DEFAULT_PLACE = { name: "Dhaka", country: "Bangladesh", countryCode: "BD", lat: 23.7104, lon: 90.4074 };

// WMO weather codes → label, icon (day / night) and background theme
const WEATHER_CODES = {
  0:  { label: "Clear sky",          icon: ["clear-day", "clear-night"],                       theme: "clear" },
  1:  { label: "Mainly clear",       icon: ["clear-day", "clear-night"],                       theme: "clear" },
  2:  { label: "Partly cloudy",      icon: ["partly-cloudy-day", "partly-cloudy-night"],       theme: "cloudy" },
  3:  { label: "Overcast",           icon: ["overcast-day", "overcast-night"],                 theme: "cloudy" },
  45: { label: "Fog",                icon: ["fog-day", "fog-night"],                           theme: "fog" },
  48: { label: "Rime fog",           icon: ["fog-day", "fog-night"],                           theme: "fog" },
  51: { label: "Light drizzle",      icon: ["drizzle", "drizzle"],                             theme: "rain" },
  53: { label: "Drizzle",            icon: ["drizzle", "drizzle"],                             theme: "rain" },
  55: { label: "Heavy drizzle",      icon: ["drizzle", "drizzle"],                             theme: "rain" },
  56: { label: "Freezing drizzle",   icon: ["sleet", "sleet"],                                 theme: "snow" },
  57: { label: "Freezing drizzle",   icon: ["sleet", "sleet"],                                 theme: "snow" },
  61: { label: "Light rain",         icon: ["rain", "rain"],                                   theme: "rain" },
  63: { label: "Rain",               icon: ["rain", "rain"],                                   theme: "rain" },
  65: { label: "Heavy rain",         icon: ["rain", "rain"],                                   theme: "rain" },
  66: { label: "Freezing rain",      icon: ["sleet", "sleet"],                                 theme: "snow" },
  67: { label: "Freezing rain",      icon: ["sleet", "sleet"],                                 theme: "snow" },
  71: { label: "Light snow",         icon: ["snow", "snow"],                                   theme: "snow" },
  73: { label: "Snow",               icon: ["snow", "snow"],                                   theme: "snow" },
  75: { label: "Heavy snow",         icon: ["snow", "snow"],                                   theme: "snow" },
  77: { label: "Snow grains",        icon: ["snow", "snow"],                                   theme: "snow" },
  80: { label: "Rain showers",       icon: ["rain", "rain"],                                   theme: "rain" },
  81: { label: "Rain showers",       icon: ["rain", "rain"],                                   theme: "rain" },
  82: { label: "Violent showers",    icon: ["rain", "rain"],                                   theme: "rain" },
  85: { label: "Snow showers",       icon: ["snow", "snow"],                                   theme: "snow" },
  86: { label: "Snow showers",       icon: ["snow", "snow"],                                   theme: "snow" },
  95: { label: "Thunderstorm",       icon: ["thunderstorms-day-rain", "thunderstorms-night-rain"], theme: "storm" },
  96: { label: "Storm with hail",    icon: ["thunderstorms-day-rain", "thunderstorms-night-rain"], theme: "storm" },
  99: { label: "Storm with hail",    icon: ["thunderstorms-day-rain", "thunderstorms-night-rain"], theme: "storm" },
};

const getWeather = (code) => WEATHER_CODES[code] || { label: "Unknown", icon: ["not-available", "not-available"], theme: "cloudy" };
const iconSrc = (code, isDay = true) => `${ICON_URL}/${getWeather(code).icon[isDay ? 0 : 1]}.svg`;

// ===== Element references =====
const $ = (id) => document.getElementById(id);
const els = {
  form: $("searchForm"),
  input: $("searchInput"),
  suggestions: $("suggestions"),
  locateBtn: $("locateBtn"),
  status: $("status"),
  weather: $("weather"),
  hourly: $("hourly"),
  daily: $("daily"),
};

// ===== Safe localStorage helpers (private mode can throw) =====
const storage = {
  get(key) {
    try { return JSON.parse(localStorage.getItem(`skycast:${key}`)); } catch { return null; }
  },
  set(key, value) {
    try { localStorage.setItem(`skycast:${key}`, JSON.stringify(value)); } catch { /* ignore */ }
  },
};

// ===== App state =====
const state = {
  unit: storage.get("unit") || "c",
  place: storage.get("place") || DEFAULT_PLACE,
  data: null,
  results: [],
  activeIndex: -1,
};

// ===== Formatting helpers =====
const toUnit = (celsius) => (state.unit === "f" ? celsius * 9 / 5 + 32 : celsius);
const fmtTemp = (celsius) => Math.round(toUnit(celsius));
const fmtWind = (kmh) => (state.unit === "f" ? Math.round(kmh * 0.621371) : Math.round(kmh));

// API times are already in the city's local time ("2026-10-18T14:00"),
// so we parse them as-is and only format — never compare with Date.now().
const parseLocal = (iso) => new Date(iso.length === 10 ? `${iso}T00:00` : iso);
const fmtHour = (iso) => parseLocal(iso).toLocaleTimeString("en-US", { hour: "numeric" });
const fmtClock = (iso) => parseLocal(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
const fmtDay = (iso) => parseLocal(iso).toLocaleDateString("en-US", { weekday: "long" });
const fmtShortDate = (iso) => parseLocal(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
const fmtFullDate = (iso) =>
  parseLocal(iso).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

const compassDir = (deg) => ["N", "NE", "E", "SE", "S", "SW", "W", "NW"][Math.round(deg / 45) % 8];

const uvLevel = (uv) => {
  if (uv < 3) return "Low";
  if (uv < 6) return "Moderate";
  if (uv < 8) return "High";
  if (uv < 11) return "Very high";
  return "Extreme";
};

// Country code → flag image (flag emoji don't render on Windows)
const flag = (cc = "") =>
  /^[a-z]{2}$/i.test(cc)
    ? `<img class="flag" src="https://flagcdn.com/w40/${cc.toLowerCase()}.png" alt="${cc.toUpperCase()}" width="26" height="20">`
    : `<span class="flag-emoji" aria-hidden="true">📍</span>`;

const escapeHTML = (str = "") =>
  str.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

// ===== Status line =====
const setStatus = (message = "", isError = false) => {
  els.status.textContent = message;
  els.status.classList.toggle("error", isError);
};

// =========================================
// Fetch weather
// =========================================
let requestId = 0;

async function loadWeather(place) {
  const id = ++requestId;
  els.weather.setAttribute("aria-busy", "true");
  setStatus(`Loading weather for ${place.name}…`);

  const params = new URLSearchParams({
    latitude: place.lat,
    longitude: place.lon,
    current: "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,wind_speed_10m,wind_direction_10m,pressure_msl",
    hourly: "temperature_2m,weather_code,precipitation_probability,is_day",
    daily: "weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_probability_max",
    timezone: "auto",
    forecast_days: 7,
  });

  try {
    const res = await fetch(`${WEATHER_URL}?${params}`);
    if (!res.ok) throw new Error(`Weather request failed (${res.status})`);
    const data = await res.json();
    if (id !== requestId) return; // a newer search started meanwhile

    // Name a "current location" place after its timezone city (e.g. Asia/Tokyo → Tokyo)
    if (place.fromGeo) {
      place.name = data.timezone.split("/").pop().replace(/_/g, " ");
    }

    state.place = place;
    state.data = data;
    storage.set("place", place);
    render();
    setStatus("");
  } catch (err) {
    if (id !== requestId) return;
    console.error(err);
    setStatus("আবহাওয়ার তথ্য আনা যায়নি। ইন্টারনেট কানেকশন চেক করে আবার চেষ্টা করুন।", true);
  } finally {
    if (id === requestId) els.weather.setAttribute("aria-busy", "false");
  }
}

// =========================================
// Render
// =========================================
function render() {
  const { data, place } = state;
  if (!data) return;

  const { current, hourly, daily } = data;
  const isDay = current.is_day === 1;
  const weather = getWeather(current.weather_code);

  // Background theme
  const theme = ["clear", "cloudy"].includes(weather.theme) ? `${weather.theme}-${isDay ? "day" : "night"}` : weather.theme;
  document.body.dataset.theme = theme;
  document.title = `${fmtTemp(current.temperature_2m)}° ${place.name} | SkyCast`;

  // Unit labels
  document.querySelectorAll(".unit-label").forEach((el) => (el.textContent = state.unit === "f" ? "°F" : "°C"));
  $("windUnit").textContent = state.unit === "f" ? "mph" : "km/h";

  // ----- Current -----
  const region = [place.admin1, place.country].filter(Boolean).join(", ");
  $("place").innerHTML = `${flag(place.countryCode)} ${escapeHTML(place.name)}${region ? `<small class="region">${escapeHTML(region)}</small>` : ""}`;
  $("localTime").textContent = `${fmtFullDate(current.time)} · ${fmtClock(current.time)} local time`;
  $("dayBadge").textContent = isDay ? "☀ Day" : "☾ Night";

  const icon = $("currentIcon");
  icon.src = iconSrc(current.weather_code, isDay);
  icon.alt = weather.label;

  $("temp").textContent = fmtTemp(current.temperature_2m);
  $("condition").textContent = weather.label;
  $("tempMax").textContent = fmtTemp(daily.temperature_2m_max[0]);
  $("tempMin").textContent = fmtTemp(daily.temperature_2m_min[0]);
  $("feelsLike").textContent = fmtTemp(current.apparent_temperature);

  // ----- Highlights -----
  $("humidity").textContent = current.relative_humidity_2m;
  $("humidityBar").style.width = `${current.relative_humidity_2m}%`;

  $("wind").textContent = fmtWind(current.wind_speed_10m);
  // Wind direction is where it comes FROM, so the arrow points the other way
  $("windArrow").style.transform = `rotate(${current.wind_direction_10m + 180}deg)`;
  $("windDir").textContent = `from ${compassDir(current.wind_direction_10m)}`;

  const uv = daily.uv_index_max[0] ?? 0;
  $("uv").textContent = uv.toFixed(1);
  $("uvLevel").textContent = uvLevel(uv);

  const rain = daily.precipitation_probability_max[0] ?? 0;
  $("rainChance").textContent = rain;
  $("rainBar").style.width = `${rain}%`;

  $("pressure").textContent = Math.round(current.pressure_msl);
  $("sunrise").textContent = fmtClock(daily.sunrise[0]);
  $("sunset").textContent = fmtClock(daily.sunset[0]);

  // ----- Hourly (next 24h, starting from the current hour) -----
  const nowKey = current.time.slice(0, 13);
  const start = Math.max(0, hourly.time.findIndex((t) => t.slice(0, 13) === nowKey));

  els.hourly.innerHTML = hourly.time
    .slice(start, start + 24)
    .map((time, i) => {
      const idx = start + i;
      const code = hourly.weather_code[idx];
      const chance = hourly.precipitation_probability[idx];
      return `
        <li class="hour${i === 0 ? " now" : ""}">
          <time datetime="${time}">${i === 0 ? "Now" : fmtHour(time)}</time>
          <img src="${iconSrc(code, hourly.is_day[idx] === 1)}" alt="${getWeather(code).label}" loading="lazy">
          <span class="h-temp">${fmtTemp(hourly.temperature_2m[idx])}°</span>
          <span class="h-rain">${chance > 0 ? `💧 ${chance}%` : ""}</span>
        </li>`;
    })
    .join("");
  els.hourly.scrollLeft = 0;

  // ----- Daily (with a week-wide temperature range bar) -----
  const weekMin = Math.min(...daily.temperature_2m_min);
  const weekMax = Math.max(...daily.temperature_2m_max);
  const span = weekMax - weekMin || 1;

  els.daily.innerHTML = daily.time
    .map((date, i) => {
      const min = daily.temperature_2m_min[i];
      const max = daily.temperature_2m_max[i];
      const left = ((min - weekMin) / span) * 100;
      const width = Math.max(((max - min) / span) * 100, 4);
      // Keep the colour gradient aligned to the whole week, not just this bar
      const bgSize = (100 / width) * 100;
      const bgPos = width >= 100 ? 0 : (left / (100 - width)) * 100;
      const chance = daily.precipitation_probability_max[i];
      const code = daily.weather_code[i];

      return `
        <li class="day">
          <span class="day-name">${i === 0 ? "Today" : fmtDay(date)}<small>${fmtShortDate(date)}</small></span>
          <img src="${iconSrc(code)}" alt="" loading="lazy">
          <span class="day-cond">${getWeather(code).label}${chance ? `<small>💧 ${chance}%</small>` : ""}</span>
          <span class="day-min">${fmtTemp(min)}°</span>
          <span class="range-bar" aria-hidden="true">
            <span style="left:${left}%;width:${width}%;background-size:${bgSize}% 100%;background-position:${bgPos}% 0"></span>
          </span>
          <span class="day-max">${fmtTemp(max)}°</span>
        </li>`;
    })
    .join("");

  // Replay the fade-in animation
  els.weather.querySelectorAll(".card").forEach((card, i) => {
    card.classList.remove("fade-in");
    void card.offsetWidth;
    card.style.animationDelay = `${i * 0.05}s`;
    card.classList.add("fade-in");
  });
}

// =========================================
// City search with suggestions
// =========================================
let searchTimer;
let searchController;

async function searchCities(query) {
  searchController?.abort();
  searchController = new AbortController();

  const params = new URLSearchParams({ name: query, count: 6, language: "en", format: "json" });
  const res = await fetch(`${GEO_URL}?${params}`, { signal: searchController.signal });
  if (!res.ok) throw new Error("Geocoding failed");
  const data = await res.json();

  return (data.results || []).map((r) => ({
    name: r.name,
    admin1: r.admin1,
    country: r.country,
    countryCode: r.country_code,
    lat: r.latitude,
    lon: r.longitude,
  }));
}

function showSuggestions(results) {
  state.results = results;
  state.activeIndex = -1;

  if (!results.length) {
    els.suggestions.innerHTML = `<li aria-disabled="true">কোনো শহর পাওয়া যায়নি 😕</li>`;
  } else {
    els.suggestions.innerHTML = results
      .map(
        (r, i) => `
        <li role="option" id="opt-${i}" data-index="${i}" aria-selected="false">
          ${flag(r.countryCode)}
          <span>${escapeHTML(r.name)}<small>${escapeHTML([r.admin1, r.country].filter(Boolean).join(", "))}</small></span>
        </li>`
      )
      .join("");
  }

  els.suggestions.hidden = false;
  els.input.setAttribute("aria-expanded", "true");
}

function hideSuggestions() {
  els.suggestions.hidden = true;
  els.input.setAttribute("aria-expanded", "false");
  els.input.removeAttribute("aria-activedescendant");
  state.activeIndex = -1;
}

function selectPlace(place) {
  hideSuggestions();
  els.input.value = "";
  els.input.blur();
  loadWeather(place);
}

function highlight(index) {
  const items = els.suggestions.querySelectorAll("[role=option]");
  if (!items.length) return;
  state.activeIndex = (index + items.length) % items.length;
  items.forEach((item, i) => {
    const active = i === state.activeIndex;
    item.classList.toggle("active", active);
    item.setAttribute("aria-selected", active);
  });
  els.input.setAttribute("aria-activedescendant", `opt-${state.activeIndex}`);
}

els.input.addEventListener("input", () => {
  const query = els.input.value.trim();
  clearTimeout(searchTimer);
  if (query.length < 2) return hideSuggestions();

  searchTimer = setTimeout(async () => {
    try {
      showSuggestions(await searchCities(query));
    } catch (err) {
      if (err.name !== "AbortError") setStatus("শহর খুঁজতে সমস্যা হয়েছে। আবার চেষ্টা করুন।", true);
    }
  }, 300);
});

els.input.addEventListener("keydown", (e) => {
  if (els.suggestions.hidden) return;
  if (e.key === "ArrowDown") { e.preventDefault(); highlight(state.activeIndex + 1); }
  if (e.key === "ArrowUp")   { e.preventDefault(); highlight(state.activeIndex - 1); }
  if (e.key === "Escape")    hideSuggestions();
});

els.suggestions.addEventListener("click", (e) => {
  const item = e.target.closest("[data-index]");
  if (item) selectPlace(state.results[item.dataset.index]);
});

// Enter: pick the highlighted suggestion, or the best match
els.form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const query = els.input.value.trim();
  if (!query) return;

  if (state.activeIndex >= 0) return selectPlace(state.results[state.activeIndex]);

  try {
    clearTimeout(searchTimer);
    const results = await searchCities(query);
    if (results.length) selectPlace(results[0]);
    else setStatus(`"${query}" নামে কোনো শহর পাওয়া যায়নি।`, true);
  } catch (err) {
    if (err.name !== "AbortError") setStatus("শহর খুঁজতে সমস্যা হয়েছে। আবার চেষ্টা করুন।", true);
  }
});

document.addEventListener("click", (e) => {
  if (!els.form.contains(e.target)) hideSuggestions();
});

// =========================================
// Use my location
// =========================================
els.locateBtn.addEventListener("click", () => {
  if (!navigator.geolocation) {
    setStatus("আপনার ব্রাউজার লোকেশন সাপোর্ট করে না।", true);
    return;
  }

  els.locateBtn.classList.add("loading");
  setStatus("আপনার লোকেশন খোঁজা হচ্ছে…");

  navigator.geolocation.getCurrentPosition(
    ({ coords }) => {
      els.locateBtn.classList.remove("loading");
      loadWeather({
        name: "Your location",
        country: "",
        countryCode: "",
        admin1: "📍 Current location",
        lat: +coords.latitude.toFixed(4),
        lon: +coords.longitude.toFixed(4),
        fromGeo: true,
      });
    },
    () => {
      els.locateBtn.classList.remove("loading");
      setStatus("লোকেশন পাওয়া যায়নি। পারমিশন দিন অথবা শহরের নাম লিখে খুঁজুন।", true);
    },
    { timeout: 10000 }
  );
});

// =========================================
// °C / °F toggle (converts locally, no refetch)
// =========================================
document.querySelectorAll(".unit-btn").forEach((btn) => {
  const isActive = btn.dataset.unit === state.unit;
  btn.classList.toggle("active", isActive);
  btn.setAttribute("aria-pressed", isActive);

  btn.addEventListener("click", () => {
    state.unit = btn.dataset.unit;
    storage.set("unit", state.unit);
    document.querySelectorAll(".unit-btn").forEach((b) => {
      b.classList.toggle("active", b === btn);
      b.setAttribute("aria-pressed", b === btn);
    });
    render();
  });
});

// ===== Start =====
loadWeather(state.place);
