import { Injectable } from '@angular/core';

export interface ForecastDay {
  date: string;
  minTemperatureCelsius: number | null;
  maxTemperatureCelsius: number | null;
}

export interface WeatherResult {
  city: string;
  temperatureCelsius: number;
  weatherDescription: string;
  relativeHumidity: number | null;
  windSpeed: number | null;
  precipitation: number | null;
  forecast: ForecastDay[];
}

interface CachedWeatherEntry {
  timestamp: number;
  data: WeatherResult;
}

interface GeocodingResponse {
  results?: Array<{
    name: string;
    latitude: number;
    longitude: number;
  }>;
}

interface ForecastResponse {
  current?: {
    temperature_2m: number;
    weather_code: number;
    relative_humidity_2m?: number;
    wind_speed_10m?: number;
    precipitation?: number;
  };
  daily?: {
    time?: string[];
    temperature_2m_min?: Array<number | null>;
    temperature_2m_max?: Array<number | null>;
  };
}

@Injectable({
  providedIn: 'root'
})
export class WeatherService {
  private readonly cacheDurationMs = 60 * 60 * 1000;
  private readonly storagePrefix = 'weather-cache:';

  /**
   * Looks up a city by name, resolves its coordinates through Open-Meteo geocoding,
   * and then fetches the current weather for those coordinates.
   *
   * The input is trimmed before it is used. If the city cannot be resolved or the
   * weather payload does not contain current data, the promise is rejected with an Error.
   *
   * @param {string} city The city name entered by the user.
   * @returns {Promise<WeatherResult>} A promise that resolves to the matched city name,
   * current weather metrics, and a short multi-day forecast.
   * @throws {Error} If the input is empty after trimming.
   * @throws {Error} If the geocoding request returns no matching city.
   * @throws {Error} If either API request fails or if the forecast response has no current data.
   *
   * @example
   * const result = await weatherService.getWeatherByCity('Rome');
   */
  async getWeatherByCity(city: string): Promise<WeatherResult> {
    const cityName = city.trim();

    if (!cityName) {
      throw new Error('Inserisci il nome di una citta.');
    }

    const cacheKey = this.buildCacheKey(cityName);
    const cachedWeather = this.getCachedWeather(cacheKey);

    if (cachedWeather) {
      return cachedWeather;
    }

    const geocodingUrl =
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=1&language=it&format=json`;

    const geocodingResponse = await this.fetchJson<GeocodingResponse>(
      geocodingUrl,
      'Errore durante la richiesta di geocoding.'
    );

    const place = geocodingResponse.results?.[0];

    if (!place) {
      throw new Error('Citta non trovata. Controlla il nome inserito.');
    }

    const forecastUrl =
      `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m,weather_code,relative_humidity_2m,wind_speed_10m,precipitation&daily=temperature_2m_min,temperature_2m_max&forecast_days=5&timezone=auto`;

    const forecastResponse = await this.fetchJson<ForecastResponse>(
      forecastUrl,
      'Errore durante la richiesta dei dati meteo.'
    );

    if (!forecastResponse.current) {
      throw new Error('Dati meteo non disponibili.');
    }

    const weatherResult: WeatherResult = {
      city: place.name,
      temperatureCelsius: forecastResponse.current.temperature_2m,
      weatherDescription: this.getWeatherDescription(forecastResponse.current.weather_code),
      relativeHumidity: forecastResponse.current.relative_humidity_2m ?? null,
      windSpeed: forecastResponse.current.wind_speed_10m ?? null,
      precipitation: forecastResponse.current.precipitation ?? null,
      forecast: this.buildForecast(forecastResponse.daily)
    };

    this.saveCachedWeather(cacheKey, weatherResult);

    return weatherResult;
  }

  private buildCacheKey(city: string): string {
    return `${this.storagePrefix}${city.toLocaleLowerCase()}`;
  }

  private getCachedWeather(cacheKey: string): WeatherResult | null {
    const storage = this.getStorage();

    if (!storage) {
      return null;
    }

    const cachedValue = storage.getItem(cacheKey);

    if (!cachedValue) {
      return null;
    }

    try {
      const parsedEntry = JSON.parse(cachedValue) as CachedWeatherEntry;

      if (!this.isValidCacheEntry(parsedEntry)) {
        storage.removeItem(cacheKey);
        return null;
      }

      if (Date.now() - parsedEntry.timestamp > this.cacheDurationMs) {
        return null;
      }

      return parsedEntry.data;
    } catch {
      storage.removeItem(cacheKey);
      return null;
    }
  }

  private saveCachedWeather(cacheKey: string, data: WeatherResult): void {
    const storage = this.getStorage();

    if (!storage) {
      return;
    }

    const cacheEntry: CachedWeatherEntry = {
      timestamp: Date.now(),
      data
    };

    storage.setItem(cacheKey, JSON.stringify(cacheEntry));
  }

  private getStorage(): Storage | null {
    if (typeof localStorage === 'undefined') {
      return null;
    }

    return localStorage;
  }

  // Keep the validation small and defensive so corrupted cache entries are ignored safely.
  private isValidCacheEntry(entry: unknown): entry is CachedWeatherEntry {
    if (!entry || typeof entry !== 'object') {
      return false;
    }

    const cachedEntry = entry as Partial<CachedWeatherEntry>;
    const data = cachedEntry.data;

    return typeof cachedEntry.timestamp === 'number'
      && !!data
      && typeof data.city === 'string'
      && typeof data.temperatureCelsius === 'number'
      && typeof data.weatherDescription === 'string'
      && (typeof data.relativeHumidity === 'number' || data.relativeHumidity === null)
      && (typeof data.windSpeed === 'number' || data.windSpeed === null)
      && (typeof data.precipitation === 'number' || data.precipitation === null)
      && Array.isArray(data.forecast)
      && data.forecast.every((day) => this.isValidForecastDay(day));
  }

  private isValidForecastDay(day: unknown): day is ForecastDay {
    if (!day || typeof day !== 'object') {
      return false;
    }

    const forecastDay = day as Partial<ForecastDay>;

    return typeof forecastDay.date === 'string'
      && (typeof forecastDay.minTemperatureCelsius === 'number' || forecastDay.minTemperatureCelsius === null)
      && (typeof forecastDay.maxTemperatureCelsius === 'number' || forecastDay.maxTemperatureCelsius === null);
  }

  private buildForecast(daily: ForecastResponse['daily']): ForecastDay[] {
    if (!daily?.time?.length) {
      return [];
    }

    return daily.time.map((date, index) => ({
      date,
      minTemperatureCelsius: daily.temperature_2m_min?.[index] ?? null,
      maxTemperatureCelsius: daily.temperature_2m_max?.[index] ?? null
    }));
  }

  private async fetchJson<T>(url: string, apiErrorMessage: string): Promise<T> {
    let response: Response;

    try {
      response = await fetch(url);
    } catch {
      throw new Error('Problema di rete. Controlla la connessione e riprova.');
    }

    if (!response.ok) {
      throw new Error(apiErrorMessage);
    }

    return response.json() as Promise<T>;
  }

  private getWeatherDescription(code: number): string {
    const weatherCodes: Record<number, string> = {
      0: 'Sereno',
      1: 'Prevalentemente sereno',
      2: 'Parzialmente nuvoloso',
      3: 'Coperto',
      45: 'Nebbia',
      48: 'Nebbia con brina',
      51: 'Pioviggine leggera',
      53: 'Pioviggine moderata',
      55: 'Pioviggine intensa',
      61: 'Pioggia debole',
      63: 'Pioggia moderata',
      65: 'Pioggia forte',
      71: 'Nevicata debole',
      73: 'Nevicata moderata',
      75: 'Nevicata forte',
      80: 'Rovesci deboli',
      81: 'Rovesci moderati',
      82: 'Rovesci forti',
      95: 'Temporale'
    };

    return weatherCodes[code] ?? 'Condizioni meteo non disponibili';
  }
}
