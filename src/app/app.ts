import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { WeatherResult, WeatherService } from './services/weather.service';

interface CityWeatherViewModel {
  city: string;
  weather: WeatherResult | null;
  errorMessage: string;
}

@Component({
  selector: 'app-root',
  imports: [FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  private readonly weatherService = inject(WeatherService);

  protected readonly cityInput = signal('');
  protected readonly isLoading = signal(false);
  protected readonly results = signal<CityWeatherViewModel[]>([]);
  protected readonly formErrorMessage = signal('');

  protected async searchWeather(): Promise<void> {
    const cities = this.parseCityInput(this.cityInput());

    if (!cities.length) {
      this.formErrorMessage.set('Inserisci almeno una citta.');
      this.results.set([]);
      return;
    }

    this.isLoading.set(true);
    this.formErrorMessage.set('');
    this.results.set([]);

    try {
      const cityResults = await Promise.all(cities.map(async (city) => this.loadCityWeather(city)));
      this.results.set(cityResults);
    } finally {
      this.isLoading.set(false);
    }
  }

  protected trackByCity(_: number, result: CityWeatherViewModel): string {
    return result.city;
  }

  private parseCityInput(input: string): string[] {
    return Array.from(new Set(
      input
        .split(',')
        .map((city) => city.trim())
        .filter((city) => city.length > 0)
    ));
  }

  private async loadCityWeather(city: string): Promise<CityWeatherViewModel> {
    try {
      const weather = await this.weatherService.getWeatherByCity(city);

      return {
        city: weather.city,
        weather,
        errorMessage: ''
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Si e verificato un errore inatteso.';

      return {
        city,
        weather: null,
        errorMessage: message
      };
    }
  }
}
