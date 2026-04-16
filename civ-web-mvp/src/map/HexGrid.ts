/**
 * HexGrid - гексагональная сетка с аксиальными координатами
 * Использует axial coordinates (q, r) для представления гексов
 */

import { TileType, ResourceType, TileYield, TILE_BASE_YIELDS, RESOURCE_BONUSES } from './TileTypes';
import { eventBus, GameEvent } from '../core/EventBus';

export interface HexCoord {
  q: number;
  r: number;
}

export interface Tile {
  coord: HexCoord;
  type: TileType;
  resource: ResourceType;
  yield: TileYield;
  explored: boolean;      // Было ли посещено игроком
  visible: boolean;       // Видимо ли сейчас
  ownerId?: string;       // Владелец (город)
  improvement?: string;   // Улучшение тайла
}

export interface MapConfig {
  radius: number;         // Радиус карты в гексах
  seed: number;           // Seed для генерации
  waterLevel: number;     // Уровень воды (0-1)
}

export class HexGrid {
  private tiles: Map<string, Tile>;
  private config: MapConfig;
  private noise: SimplexNoise | null = null;

  constructor(config: Partial<MapConfig> = {}) {
    this.tiles = new Map();
    this.config = {
      radius: 30,
      seed: Math.random(),
      waterLevel: 0.3,
      ...config,
    };
  }

  /**
   * Преобразование axial координат в строковый ключ
   */
  static toKey(q: number, r: number): string {
    return `${q},${r}`;
  }

  /**
   * Преобразование строкового ключа в axial координаты
   */
  static fromKey(key: string): HexCoord {
    const [q, r] = key.split(',').map(Number);
    return { q, r };
  }

  /**
   * Получение соседних гексов
   */
  static getNeighbors(coord: HexCoord): HexCoord[] {
    const directions = [
      { q: 1, r: 0 }, { q: 1, r: -1 }, { q: 0, r: -1 },
      { q: -1, r: 0 }, { q: -1, r: 1 }, { q: 0, r: 1 },
    ];
    
    return directions.map(dir => ({
      q: coord.q + dir.q,
      r: coord.r + dir.r,
    }));
  }

  /**
   * Расстояние между двумя гексами
   */
  static distance(a: HexCoord, b: HexCoord): number {
    return (Math.abs(a.q - b.q) + Math.abs(a.r - b.r) + Math.abs(a.q + a.r - b.q - b.r)) / 2;
  }

  /**
   * Генерация карты с использованием шума
   */
  async generate(): Promise<void> {
    console.log('[HexGrid] Генерация карты...');
    
    // Динамический импорт simplex-noise
    const { createNoise2D } = await import('simplex-noise');
    const noise2D = createNoise2D(() => this.config.seed);

    for (let q = -this.config.radius; q <= this.config.radius; q++) {
      for (let r = -this.config.radius; r <= this.config.radius; r++) {
        // Проверка на круглую карту
        if (Math.abs(q) + Math.abs(r) + Math.abs(-q - r) > this.config.radius * 2) {
          continue;
        }

        const key = HexGrid.toKey(q, r);
        
        // Генерация высоты через шум
        const elevation = noise2D(q * 0.1, r * 0.1);
        const moisture = noise2D(q * 0.15 + 100, r * 0.15 + 100);
        
        // Определение типа тайла
        let type: TileType;
        if (elevation < -0.3) {
          type = TileType.WATER;
        } else if (elevation < -0.1) {
          type = TileType.PLAINS;
        } else if (elevation < 0.2) {
          type = moisture > 0 ? TileType.FOREST : TileType.PLAINS;
        } else if (elevation < 0.4) {
          type = TileType.HILLS;
        } else if (elevation < 0.6) {
          type = moisture > 0 ? TileType.FOREST : TileType.DESERT;
        } else {
          type = TileType.MOUNTAINS;
        }

        // Генерация ресурсов (редко)
        let resource = ResourceType.NONE;
        if (type !== TileType.WATER && type !== TileType.MOUNTAINS && Math.random() < 0.15) {
          const resources = Object.values(ResourceType).filter(r => r !== ResourceType.NONE);
          resource = resources[Math.floor(Math.random() * resources.length)];
        }

        // Вычисление доходности
        const baseYield = TILE_BASE_YIELDS[type];
        const resourceBonus = RESOURCE_BONUSES[resource];
        const yield_: TileYield = {
          food: baseYield.food + resourceBonus.food,
          production: baseYield.production + resourceBonus.production,
          gold: baseYield.gold + resourceBonus.gold,
          science: baseYield.science + resourceBonus.science,
          culture: baseYield.culture + resourceBonus.culture,
        };

        this.tiles.set(key, {
          coord: { q, r },
          type,
          resource,
          yield: yield_,
          explored: false,
          visible: false,
        });
      }
    }

    // Начальная видимость вокруг центра
    this.updateFogOfWar({ q: 0, r: 0 }, 5);
    
    console.log(`[HexGrid] Сгенерировано ${this.tiles.size} тайлов`);
  }

  /**
   * Получение тайла по координатам
   */
  getTile(q: number, r: number): Tile | undefined {
    return this.tiles.get(HexGrid.toKey(q, r));
  }

  /**
   * Получение тайла по ключу
   */
  getTileByKey(key: string): Tile | undefined {
    return this.tiles.get(key);
  }

  /**
   * Получение всех тайлов
   */
  getAllTiles(): Tile[] {
    return Array.from(this.tiles.values());
  }

  /**
   * Обновление тумана войны вокруг точки
   */
  updateFogOfWar(center: HexCoord, radius: number): void {
    const newlyVisible: Tile[] = [];
    
    for (let dq = -radius; dq <= radius; dq++) {
      for (let dr = -radius; dr <= radius; dr++) {
        if (Math.abs(dq) + Math.abs(dr) + Math.abs(-dq - dr) > radius * 2) {
          continue;
        }
        
        const tile = this.getTile(center.q + dq, center.r + dr);
        if (tile && !tile.visible) {
          tile.visible = true;
          tile.explored = true;
          newlyVisible.push(tile);
        }
      }
    }

    if (newlyVisible.length > 0) {
      eventBus.emit(GameEvent.FOG_UPDATED, { tiles: newlyVisible });
    }
  }

  /**
   * Скрытие видимости (для перемещения юнитов)
   */
  clearVisibility(): void {
    for (const tile of this.tiles.values()) {
      tile.visible = false;
    }
  }

  /**
   * Поиск тайлов в радиусе
   */
  findTilesInRange(center: HexCoord, minRange: number, maxRange: number): Tile[] {
    const result: Tile[] = [];
    
    for (const tile of this.tiles.values()) {
      const dist = HexGrid.distance(center, tile.coord);
      if (dist >= minRange && dist <= maxRange) {
        result.push(tile);
      }
    }
    
    return result;
  }

  /**
   * Конфигурация карты
   */
  getConfig(): MapConfig {
    return { ...this.config };
  }

  /**
   * Сериализация для сохранения
   */
  serialize(): object {
    return {
      config: this.config,
      tiles: Array.from(this.tiles.entries()).map(([key, tile]) => [key, {
        ...tile,
        // Не сохраняем visible, только explored
        visible: false,
      }]),
    };
  }

  /**
   * Десериализация из сохранения
   */
  deserialize(data: any): void {
    this.config = data.config;
    this.tiles = new Map(data.tiles.map(([key, tile]: [string, any]) => [key, tile]));
  }
}

// Простая реализация шума для совместимости
class SimplexNoise {
  noise2D(x: number, y: number): number {
    // Заглушка, будет заменена на simplex-noise
    return Math.sin(x) * Math.cos(y);
  }
}

export const hexGrid = new HexGrid();
