/**
 * EconomySystem - управление ресурсами игрока
 * Собирает доходы от городов и тайлов
 */

import { eventBus, GameEvent } from '../core/EventBus';
import { City } from '../entities/City';
import { HexGrid } from '../map/HexGrid';

export interface Resources {
  food: number;
  production: number;
  gold: number;
  science: number;
  culture: number;
}

export interface EconomyConfig {
  startingGold: number;
}

export class EconomySystem {
  private resources: Resources;
  private cities: Map<string, City>;
  private config: EconomyConfig;

  constructor(config?: Partial<EconomyConfig>) {
    this.resources = {
      food: 0,
      production: 0,
      gold: config?.startingGold || 100,
      science: 0,
      culture: 0,
    };
    this.cities = new Map();
    this.config = {
      startingGold: 100,
      ...config,
    };

    // Подписка на события
    eventBus.on(GameEvent.GAME_TICK, this.onTick.bind(this));
  }

  /**
   * Добавление города в систему
   */
  addCity(city: City): void {
    this.cities.set(city.config.id, city);
    eventBus.emit(GameEvent.CITY_CREATED, { city });
  }

  /**
   * Удаление города
   */
  removeCity(cityId: string): void {
    this.cities.delete(cityId);
  }

  /**
   * Получение города по ID
   */
  getCity(cityId: string): City | undefined {
    return this.cities.get(cityId);
  }

  /**
   * Все города
   */
  getAllCities(): City[] {
    return Array.from(this.cities.values());
  }

  /**
   * Обработка игрового тика
   */
  private onTick(data: { tick: number }): void {
    // Обновление городов (каждый тик)
    for (const city of this.cities.values()) {
      city.tick();
    }

    // Сбор ресурсов с городов (усреднённо за тик)
    let totalFood = 0;
    let totalProduction = 0;
    let totalGold = 0;
    let totalScience = 0;
    let totalCulture = 0;

    for (const city of this.cities.values()) {
      totalFood += city.config.foodPerTurn / 10;
      totalProduction += city.config.productionPerTurn / 10;
      totalGold += city.config.goldPerTurn / 10;
      totalScience += city.config.sciencePerTurn / 10;
      totalCulture += city.config.culturePerTurn / 10;
    }

    // Добавление к общим ресурсам
    this.resources.food += totalFood;
    this.resources.production += totalProduction;
    this.resources.gold += totalGold;
    this.resources.science += totalScience;
    this.resources.culture += totalCulture;

    // Округление для чистоты
    this.resources.gold = Math.round(this.resources.gold * 10) / 10;
    this.resources.science = Math.round(this.resources.science * 10) / 10;
    this.resources.culture = Math.round(this.resources.culture * 10) / 10;

    // Уведомление UI
    eventBus.emit(GameEvent.RESOURCES_UPDATE, { resources: this.getResources() });
  }

  /**
   * Трата ресурсов
   */
  spend(cost: Partial<Resources>): boolean {
    if (
      (cost.food || 0) > this.resources.food ||
      (cost.production || 0) > this.resources.production ||
      (cost.gold || 0) > this.resources.gold ||
      (cost.science || 0) > this.resources.science ||
      (cost.culture || 0) > this.resources.culture
    ) {
      return false;
    }

    this.resources.food -= cost.food || 0;
    this.resources.production -= cost.production || 0;
    this.resources.gold -= cost.gold || 0;
    this.resources.science -= cost.science || 0;
    this.resources.culture -= cost.culture || 0;

    eventBus.emit(GameEvent.RESOURCES_UPDATE, { resources: this.getResources() });
    
    return true;
  }

  /**
   * Добавление ресурсов (для тестов или событий)
   */
  add(amount: Partial<Resources>): void {
    this.resources.food += amount.food || 0;
    this.resources.production += amount.production || 0;
    this.resources.gold += amount.gold || 0;
    this.resources.science += amount.science || 0;
    this.resources.culture += amount.culture || 0;

    eventBus.emit(GameEvent.RESOURCES_UPDATE, { resources: this.getResources() });
  }

  /**
   * Проверка доступности ресурсов
   */
  canAfford(cost: Partial<Resources>): boolean {
    return (
      (cost.food || 0) <= this.resources.food &&
      (cost.production || 0) <= this.resources.production &&
      (cost.gold || 0) <= this.resources.gold &&
      (cost.science || 0) <= this.resources.science &&
      (cost.culture || 0) <= this.resources.culture
    );
  }

  /**
   * Получение текущих ресурсов
   */
  getResources(): Resources {
    return { ...this.resources };
  }

  /**
   * Количество городов
   */
  getCityCount(): number {
    return this.cities.size;
  }

  /**
   * Сериализация
   */
  serialize(): object {
    return {
      resources: this.resources,
      cities: Array.from(this.cities.entries()).map(([id, city]) => [id, city.serialize()]),
      config: this.config,
    };
  }

  /**
   * Десериализация
   */
  deserialize(data: any): void {
    this.resources = data.resources;
    this.config = data.config;
    this.cities = new Map(
      data.cities.map(([id, cityData]: [string, any]) => [id, new City(cityData)])
    );
  }
}

export const economySystem = new EconomySystem();
