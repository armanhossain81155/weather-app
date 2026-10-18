# ⛅ SkyCast — Weather App

Real-time weather and a 7-day forecast for any city in the world.
Built with plain HTML, CSS and JavaScript — no framework, no build step, no API key.

**Live demo:** https://armanhossain81155.github.io/weather-app/

## Features

- 🔍 City search with live suggestions (keyboard ↑ ↓ Enter / Esc supported)
- 📍 "Use my location" button (browser geolocation)
- 🌡️ Current temperature, feels-like, high / low and condition
- 💧 Humidity, wind speed & direction, UV index, rain chance, pressure, sunrise / sunset
- 🕒 Next 24 hours (scrollable) and 7-day forecast with a temperature range bar
- 🔁 °C / °F toggle (converted locally, no extra request)
- 🎨 Background changes with the weather and day / night
- 💾 Remembers your last city and unit
- 📱 Fully responsive, keyboard accessible, respects reduced-motion

## Tech

| Part | Used |
|---|---|
| UI | HTML5, CSS3 (glassmorphism, CSS variables, grid) |
| Logic | Vanilla JavaScript (fetch, async/await, AbortController) |
| Weather data | [Open-Meteo Forecast API](https://open-meteo.com/) |
| City search | [Open-Meteo Geocoding API](https://open-meteo.com/en/docs/geocoding-api) |
| Icons | [Meteocons](https://bas.dev/work/meteocons) (animated SVG), flags from [flagcdn](https://flagcdn.com) |

## Run locally

Just open `index.html` in a browser.

## Deploy (GitHub Pages)

1. Push this folder to `github.com/armanhossain81155/weather-app`.
2. Repo → **Settings → Pages** → Source: **Deploy from a branch** → `main` / `(root)` → Save.
3. After ~1 minute the app is live at `https://armanhossain81155.github.io/weather-app/`.
