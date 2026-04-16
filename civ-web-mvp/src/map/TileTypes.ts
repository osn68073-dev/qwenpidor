/**
 * Типы тайлов и ресурсов для гексагональной карты
 */

export enum TileType {
  WATER = 'water',
  PLAINS = 'plains',
  HILLS = 'hills',
  MOUNTAINS = 'mountains',
  FOREST = 'forest',
  DESERT = 'desert',
}

export enum ResourceType {
  NONE = 'none',
  WHEAT = 'wheat',      // Еда
  CATTLE = 'cattle',    // Еда
  FISH = 'fish',        // Еда
  IRON = 'iron',        // Производство
  COAL = 'coal',        // Производство
  GOLD = 'gold',        // Золото
  GEMS = 'gems',        // Золото
}

export interface TileYield {
  food: number;
  production: number;
  gold: number;
  science: number;
  culture: number;
}

/**
 * Базовые характеристики тайла
 */
export const TILE_BASE_YIELDS: Record<TileType, TileYield> = {
  [TileType.WATER]: { food: 1, production: 0, gold: 0, science: 0, culture: 0 },
  [TileType.PLAINS]: { food: 2, production: 0, gold: 0, science: 0, culture: 0 },
  [TileType.HILLS]: { food: 0, production: 2, gold: 0, science: 0, culture: 0 },
  [TileType.MOUNTAINS]: { food: 0, production: 0, gold: 0, science: 1, culture: 0 },
  [TileType.FOREST]: { food: 1, production: 1, gold: 0, science: 0, culture: 0 },
  [TileType.DESERT]: { food: 0, production: 0, gold: 0, science: 0, culture: 0 },
};

/**
 * Бонусы от ресурсов
 */
export const RESOURCE_BONUSES: Record<ResourceType, TileYield> = {
  [ResourceType.NONE]: { food: 0, production: 0, gold: 0, science: 0, culture: 0 },
  [ResourceType.WHEAT]: { food: 2, production: 0, gold: 0, science: 0, culture: 0 },
  [ResourceType.CATTLE]: { food: 2, production: 0, gold: 0, science: 0, culture: 0 },
  [ResourceType.FISH]: { food: 2, production: 0, gold: 0, science: 0, culture: 0 },
  [ResourceType.IRON]: { food: 0, production: 2, gold: 0, science: 0, culture: 0 },
  [ResourceType.COAL]: { food: 0, production: 3, gold: 0, science: 0, culture: 0 },
  [ResourceType.GOLD]: { food: 0, production: 0, gold: 3, science: 0, culture: 0 },
  [ResourceType.GEMS]: { food: 0, production: 0, gold: 2, science: 0, culture: 0 },
};

/**
 * Цвета для отображения тайлов
 */
export const TILE_COLORS: Record<TileType, number> = {
  [TileType.WATER]: 0x4A90E2,
  [TileType.PLAINS]: 0x7CB342,
  [TileType.HILLS]: 0x8D6E63,
  [TileType.MOUNTAINS]: 0x616161,
  [TileType.FOREST]: 0x388E3C,
  [TileType.DESERT]: 0xFDD835,
};

/**
 * Проходимости тайлов
 */
export const TILE_WALKABLE: Record<TileType, boolean> = {
  [TileType.WATER]: false,
  [TileType.PLAINS]: true,
  [TileType.HILLS]: true,
  [TileType.MOUNTAINS]: false,
  [TileType.FOREST]: true,
  [TileType.DESERT]: true,
};

/**
 * Стоимость движения по тайлу
 */
export const TILE_MOVEMENT_COST: Record<TileType, number> = {
  [TileType.WATER]: 999,  // Недоступно для сухопутных юнитов
  [TileType.PLAINS]: 1,
  [TileType.HILLS]: 2,
  [TileType.MOUNTAINS]: 999,  // Недоступно
  [TileType.FOREST]: 2,
  [TileType.DESERT]: 1,
};

/**
 * Иконки ресурсов для UI
 */
export const RESOURCE_ICONS: Record<ResourceType, string> = {
  [ResourceType.NONE]: '',
  [ResourceType.WHEAT]: '🌾',
  [ResourceType.CATTLE]: '🐄',
  [ResourceType.FISH]: '🐟',
  [ResourceType.IRON]: '⛏️',
  [ResourceType.COAL]: '🪨',
  [ResourceType.GOLD]: '💰',
  [ResourceType.GEMS]: '💎',
};
