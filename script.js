const form = document.getElementById('search-form');
const cityInput = document.getElementById('city-input');
const searchButton = document.getElementById('search-button');
const locationButton = document.getElementById('location-button');
const statusMessage = document.getElementById('status-message');
const weatherCodeInfo = {
  0: ['Clear sky', '☀️'], 1: ['Mainly clear', '🌤️'], 2: ['Partly cloudy', '⛅'], 3: ['Overcast', '☁️'],
  45: ['Fog', '🌫️'], 48: ['Depositing rime fog', '🌫️'], 51: ['Light drizzle', '🌦️'], 53: ['Drizzle', '🌦️'], 55: ['Dense drizzle', '🌧️'],
  56: ['Freezing drizzle', '🌧️'], 57: ['Heavy freezing drizzle', '🌧️'], 61: ['Slight rain', '🌦️'], 63: ['Moderate rain', '🌧️'], 65: ['Heavy rain', '🌧️'],
  66: ['Freezing rain', '🌧️'], 67: ['Heavy freezing rain', '🌧️'], 71: ['Slight snow', '🌨️'], 73: ['Moderate snow', '❄️'], 75: ['Heavy snow', '❄️'],
  77: ['Snow grains', '🌨️'], 80: ['Rain showers', '🌦️'], 81: ['Moderate rain showers', '🌧️'], 82: ['Violent rain showers', '⛈️'],
  85: ['Snow showers', '🌨️'], 86: ['Heavy snow showers', '❄️'], 95: ['Thunderstorm', '⛈️'], 96: ['Thunderstorm with hail', '⛈️'], 99: ['Thunderstorm with heavy hail', '⛈️']
};
function weatherInfo(code) { return weatherCodeInfo[code] || ['Weather conditions', '🌤️']; }
function setStatus(message, isError = false) { statusMessage.textContent = message; statusMessage.style.color = isError ? '#ff9caa' : ''; }
function setLoading(loading) { searchButton.disabled = loading; searchButton.textContent = loading ? 'Loading…' : 'Search'; }
function niceDay(dateString, options = { weekday: 'short' }) { return new Date(`${dateString}T12:00:00`).toLocaleDateString(undefined, options); }
function renderForecast(daily) {
  const grid = document.getElementById('forecast-grid');
  grid.innerHTML = '';
  daily.time.forEach((date, index) => {
    const [description, icon] = weatherInfo(daily.weather_code[index]);
    const card = document.createElement('article');
    card.className = 'forecast-day';
    card.innerHTML = `<p class="day-name">${index === 0 ? 'Today' : niceDay(date)}</p><p class="day-icon" aria-hidden="true">${icon}</p><p class="day-desc">${description}</p><div class="day-temps">${Math.round(daily.temperature_2m_max[index])}° <span class="low-temp">${Math.round(daily.temperature_2m_min[index])}°</span></div>`;
    grid.appendChild(card);
  });
}
async function loadWeather(latitude, longitude, placeName) {
  setLoading(true);
  setStatus('Getting the latest weather…');
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=7`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Weather data could not be loaded. Please try again.');
    const data = await response.json();
    const current = data.current;
    const [description, icon] = weatherInfo(current.weather_code);
    document.getElementById('place-name').textContent = placeName;
    document.getElementById('weather-description').textContent = description;
    document.getElementById('weather-icon').textContent = icon;
    document.getElementById('temperature').textContent = `${Math.round(current.temperature_2m)}°`;
    document.getElementById('feels-like').textContent = `Feels like ${Math.round(current.apparent_temperature)}°C`;
    document.getElementById('humidity').textContent = `${current.relative_humidity_2m}%`;
    document.getElementById('wind-speed').textContent = `${Math.round(current.wind_speed_10m)} km/h`;
    document.getElementById('detail-feels-like').textContent = `${Math.round(current.apparent_temperature)}°C`;
    document.getElementById('precipitation').textContent = `${current.precipitation} mm`;
    document.getElementById('local-time').textContent = `Local time: ${current.time.replace('T', ' ')}`;
    document.getElementById('current-day').textContent = 'CURRENT WEATHER';
    renderForecast(data.daily);
    setStatus(`Weather updated for ${placeName}.`);
  } catch (error) {
    setStatus(error.message || 'Something went wrong. Check your internet connection.', true);
  } finally { setLoading(false); }
}
async function searchCity(city) {
  if (!city.trim()) return;
  setLoading(true);
  setStatus(`Searching for ${city.trim()}…`);
  try {
    const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city.trim())}&count=1&language=en&format=json`);
    if (!response.ok) throw new Error('City search failed. Please try again.');
    const data = await response.json();
    if (!data.results || data.results.length === 0) throw new Error('City not found. Please check the spelling and try again.');
    const place = data.results[0];
    const label = [place.name, place.admin1, place.country].filter((part, index, all) => part && all.indexOf(part) === index).join(', ');
    await loadWeather(place.latitude, place.longitude, label);
  } catch (error) { setStatus(error.message || 'Could not search for that city.', true); setLoading(false); }
}
form.addEventListener('submit', (event) => { event.preventDefault(); searchCity(cityInput.value); });
locationButton.addEventListener('click', () => {
  if (!navigator.geolocation) { setStatus('Location is not supported by this browser. Search for a city instead.', true); return; }
  setStatus('Requesting your location…');
  navigator.geolocation.getCurrentPosition(async (position) => {
    const { latitude, longitude } = position.coords;
    try {
      const response = await fetch(`https://geocoding-api.open-meteo.com/v1/reverse?latitude=${latitude}&longitude=${longitude}&language=en&format=json`);
      const data = response.ok ? await response.json() : {};
      const place = data.results && data.results[0];
      const label = place ? [place.name, place.country].filter(Boolean).join(', ') : 'Your location';
      await loadWeather(latitude, longitude, label);
    } catch { await loadWeather(latitude, longitude, 'Your location'); }
  }, () => setStatus('Location permission was denied or unavailable. Search for a city instead.', true), { timeout: 10000 });
});
// Load a useful default city on first visit.
searchCity('Mumbai');
