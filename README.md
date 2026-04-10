# Gazetteer

An interactive world map application that lets you explore country information, weather, currency, news, and more — all in one place.

## Features

- **Interactive Map** — Leaflet-powered map with Streets and Satellite base layers
- **Country Search** — Select any country from a dropdown or click directly on the map to auto-detect it
- **Country Borders** — Country boundaries highlighted on selection
- **Key Information** — Continent, capital, area, currency, population, and languages
- **Weather** — Current conditions and 2-day forecast for the country's capital city
- **Currency Calculator** — Convert from the country's currency to any other supported currency
- **Latest News** — Top 5 breaking news articles for the selected country
- **Wikipedia** — Quick summary and link to the country's Wikipedia article
- **Map Layers** — Toggle clusters of Airports, Cities, Universities, and Stadiums

## Tech Stack

**Frontend**
- [Leaflet.js](https://leafletjs.com/) — interactive maps
- [Bootstrap 5](https://getbootstrap.com/) — UI components and modals
- [jQuery](https://jquery.com/) — AJAX and DOM manipulation
- [Leaflet MarkerCluster](https://github.com/Leaflet/Leaflet.markercluster) — clustered map markers
- [Font Awesome](https://fontawesome.com/) — icons

**Backend**
- PHP — single API proxy file (`libs/php/sourceAPIs.php`)

**External APIs**
| API | Purpose |
|---|---|
| [OpenCage](https://opencagedata.com/) | Reverse geocoding (lat/lng → country) |
| [OpenWeatherMap](https://openweathermap.org/) | Current weather and 5-day forecast |
| [GeoNames](https://www.geonames.org/) | Country info, Wikipedia search, map layers |
| [ExchangeRate-API](https://www.exchangerate-api.com/) | Currency conversion |
| [Newsdata.io](https://newsdata.io/) | Latest news by country |

## Setup

### Prerequisites
- A web server with PHP 8.0+ and cURL enabled (e.g. XAMPP, MAMP, or Apache)
- API keys for all five services listed above

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/Mifa75/gazetteer.git
   cd gazetteer
   ```

2. Copy the environment template and fill in your API keys:
   ```bash
   cp .env.example .env
   ```

3. Edit `.env` with your credentials:
   ```
   GEO_API_KEY=your_opencage_api_key
   WEATHER_API_KEY=your_openweathermap_api_key
   GEONAMES_USER=your_geonames_username
   EXCHANGE_RATE_API=your_exchangerate_api_key
   NEWS_API_KEY=your_newsdata_api_key
   ```

4. Serve the project from your web server's root (e.g. `htdocs/` or `www/`) and open `index.html` in a browser.

> **Note:** The `.env` file is gitignored and must never be committed. Use `.env.example` as the reference template.

## Project Structure

```
gazetteer/
├── index.html
├── .env.example
├── data/
│   └── countryBorders.geo.json   # GeoJSON country border data
└── libs/
    ├── CSS/                      # Stylesheets
    ├── js/
    │   └── script.js             # Main application logic
    ├── php/
    │   └── sourceAPIs.php        # Backend API proxy
    └── img/                      # Icons and assets
```

## Author

Silvia Scano
