/**
 * City - город
 */

import { HexCoord } from '../map/HexGrid';
import { UnitType } from './UnitTypes';
import { eventBus, GameEvent } from '../core/EventBus';

export interface Building {
  id: string;
  name: string;
  productionCost: number;
  yields: {
    food?: number;
    production?: number;
    gold?: number;
    science?: number;
    culture?: number;
  };
}

export const BUILDINGS: Record<string, Building> = {
  'granary': {
    id: 'granary',
    name: 'Амбар',
    productionCost: 60,
    yields: { food: 1 },
  },
  'workshop': {
    id: 'workshop',
    name: 'Мастерская',
    productionCost: 90,
    yields: { production: 1 },
  },
  'market': {
    id: 'market',
    name: 'Рынок',
    productionCost: 75,
    yields: { gold: 2 },
  },
  'library': {
    id: 'library',
    name: 'Библиотека',
    productionCost: 75,
    yields: { science: 1 },
  },
  'monument': {
    id: 'monument',
    name: 'Памятник',
    productionCost: 50,
    yields: { culture: 1 },
  },
};

export interface CityConfig {
  id: string;
  name: string;
  owner: string;
  coord: HexCoord;
  population: number;
  food: number;
  foodPerTurn: number;
  production: number;
  productionPerTurn: number;
  gold: number;
  goldPerTurn: number;
  science: number;
  sciencePerTurn: number;
  culture: number;
  culturePerTurn: number;
  buildings: string[];
  currentProduction?: {
    type: 'unit' | 'building';
    id: string;
    progress: number;
  };
  workRadius: number;
}

export class City {
  public config: CityConfig;
  private static NAMES = [
    'Москва', 'Петербург', 'Киев', 'Новгород', 'Казань',
    'Смоленск', 'Ярославль', 'Владимир', 'Суздаль', 'Псков',
    'Тверь', 'Рязань', 'Тула', 'Калуга', 'Кострома',
    'Вологда', 'Архангельск', 'Мурманск', 'Воронеж', 'Белгород',
  ];

  constructor(config: Partial<CityConfig>) {
    this.config = {
      id: config.id || `city_${Date.now()}_${Math.random()}`,
      name: config.name || City.generateName(),
      owner: config.owner || 'player',
      coord: config.coord || { q: 0, r: 0 },
      population: config.population || 1,
      food: config.food || 0,
      foodPerTurn: config.foodPerTurn || 2,
      production: config.production || 0,
      productionPerTurn: config.productionPerTurn || 1,
      gold: config.gold || 0,
      goldPerTurn: config.goldPerTurn || 0,
      science: config.science || 0,
      sciencePerTurn: config.sciencePerTurn || 0,
      culture: config.culture || 0,
      culturePerTurn: config.culturePerTurn || 0,
      buildings: config.buildings || [],
      workRadius: config.workRadius || 3,
      ...config,
    };
  }

  /**
   * Генерация случайного названия
   */
  private static generateName(): string {
    return City.NAMES[Math.floor(Math.random() * City.NAMES.length)];
  }

  /**
   * Обновление ресурсов города (вызывается каждый тик)
   */
  tick(): void {
    // Добавление производства
    if (this.config.currentProduction) {
      this.config.currentProduction.progress += this.config.productionPerTurn;
      
      // Завершение производства
      const cost = this.getProductionCost(
        this.config.currentProduction.type,
        this.config.currentProduction.id
      );
      
      if (this.config.currentProduction.progress >= cost) {
        this.completeProduction();
      }
    }

    // Рост населения от еды
    const foodForNextPop = this.getFoodForNextPopulation();
    if (this.config.food >= foodForNextPop) {
      this.config.food -= foodForNextPop;
      this.config.population++;
      eventBus.emit('city:population_growth', { city: this, newPop: this.config.population });
    }

    // Накопление ресурсов
    this.config.gold += this.config.goldPerTurn / 10; // Делим на 10 тиков в секунду
    this.config.science += this.config.sciencePerTurn / 10;
    this.config.culture += this.config.culturePerTurn / 10;
  }

  /**
   * Установка очереди производства
   */
  setProduction(type: 'unit' | 'building', id: string): void {
    if (this.config.currentProduction) {
      return; // Уже что-то строится
    }

    this.config.currentProduction = {
      type,
      id,
      progress: 0,
    };
  }

  /**
   * Отмена производства
   */
  cancelProduction(): void {
    if (this.config.currentProduction) {
      this.config.production += Math.floor(this.config.currentProduction.progress / 2);
      this.config.currentProduction = undefined;
    }
  }

  /**
   * Завершение производства
   */
  private completeProduction(): void {
    if (!this.config.currentProduction) return;

    const { type, id } = this.config.currentProduction;
    
    eventBus.emit('city:production_complete', {
      city: this,
      type,
      id,
    });

    this.config.currentProduction = undefined;
  }

  /**
   * Стоимость производства
   */
  private getProductionCost(type: 'unit' | 'building', id: string): number {
    if (type === 'building') {
      const building = BUILDINGS[id];
      return building ? building.productionCost : 100;
    }
    
    // Стоимость юнитов
    const unitCosts: Record<UnitType, number> = {
      [UnitType.SCOUT]: 45,
      [UnitType.SETTLER]: 100,
      [UnitType.WARRIOR]: 60,
      [UnitType.BUILDER]: 75,
    };
    
    return unitCosts[id as UnitType] || 50;
  }

  /**
   * Еда для следующего жителя
   */
  private getFoodForNextPopulation(): number {
    return 10 + this.config.population * 5;
  }

  /**
   * Добавление здания
   */
  addBuilding(buildingId: string): void {
    if (!this.config.buildings.includes(buildingId)) {
      this.config.buildings.push(buildingId);
      this.updateYields();
    }
  }

  /**
   * Пересчёт доходности
   */
  private updateYields(): void {
    let food = 2; // База
    let production = 1;
    let gold = 0;
    let science = 0;
    let culture = 0;

    for (const buildingId of this.config.buildings) {
      const building = BUILDINGS[buildingId];
      if (building) {
        food += building.yields.food || 0;
        production += building.yields.production || 0;
        gold += building.yields.gold || 0;
        science += building.yields.science || 0;
        culture += building.yields.culture || 0;
      }
    }

    this.config.foodPerTurn = food;
    this.config.productionPerTurn = production;
    this.config.goldPerTurn = gold;
    this.config.sciencePerTurn = science;
    this.config.culturePerTurn = culture;
  }

  /**
   * Сериализация
   */
  serialize(): object {
    return { ...this.config };
  }

  /**
   * Десериализация
   */
  deserialize(data: any): void {
    this.config = { ...data };
  }
}
