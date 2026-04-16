/**
 * Юниты: базовые типы и характеристики
 */

export enum UnitType {
  SCOUT = 'scout',      // Разведчик
  SETTLER = 'settler',  // Поселенец
  WARRIOR = 'warrior',  // Воин
  BUILDER = 'builder',  // Строитель
}

export interface UnitStats {
  movement: number;     // Очки движения
  strength: number;     // Сила атаки
  defense: number;      // Защита
  range?: number;       // Дальность атаки (0 для ближнего боя)
}

export const UNIT_STATS: Record<UnitType, UnitStats> = {
  [UnitType.SCOUT]: { movement: 3, strength: 5, defense: 5 },
  [UnitType.SETTLER]: { movement: 2, strength: 0, defense: 5 },
  [UnitType.WARRIOR]: { movement: 2, strength: 10, defense: 10 },
  [UnitType.BUILDER]: { movement: 2, strength: 0, defense: 5 },
};

export const UNIT_NAMES: Record<UnitType, string> = {
  [UnitType.SCOUT]: 'Разведчик',
  [UnitType.SETTLER]: 'Поселенец',
  [UnitType.WARRIOR]: 'Воин',
  [UnitType.BUILDER]: 'Строитель',
};

export const UNIT_ICONS: Record<UnitType, string> = {
  [UnitType.SCOUT]: '🏃',
  [UnitType.SETTLER]: '🚩',
  [UnitType.WARRIOR]: '⚔️',
  [UnitType.BUILDER]: '🔨',
};
