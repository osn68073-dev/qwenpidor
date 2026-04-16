/**
 * Unit - игровой юнит
 */

import { HexCoord } from '../map/HexGrid';
export { UnitType, UNIT_STATS, UNIT_NAMES, UNIT_ICONS } from './UnitTypes';
import { UnitType, UNIT_STATS, UNIT_NAMES, UNIT_ICONS } from './UnitTypes';
import { eventBus, GameEvent } from '../core/EventBus';

export interface UnitConfig {
  id: string;
  type: UnitType;
  owner: string;        // ID игрока
  coord: HexCoord;
  movementPoints: number;
  maxMovementPoints: number;
  health: number;
  maxHealth: number;
  experience: number;
  level: number;
  isFortified: boolean;
}

export class Unit {
  public config: UnitConfig;
  private actionQueue: Array<{ type: string; target?: HexCoord }> = [];

  constructor(config: Partial<UnitConfig>) {
    const stats = UNIT_STATS[config.type!];
    this.config = {
      id: config.id || `unit_${Date.now()}_${Math.random()}`,
      type: config.type!,
      owner: config.owner || 'player',
      coord: config.coord || { q: 0, r: 0 },
      movementPoints: stats.movement,
      maxMovementPoints: stats.movement,
      health: 100,
      maxHealth: 100,
      experience: 0,
      level: 1,
      isFortified: false,
      ...config,
    };
  }

  /**
   * Перемещение юнита
   */
  move(target: HexCoord): boolean {
    if (this.config.movementPoints <= 0) {
      return false;
    }

    // Проверка расстояния (только соседние гексы за один ход)
    const dist = Math.abs(this.config.coord.q - target.q) + 
                 Math.abs(this.config.coord.r - target.r) + 
                 Math.abs(-this.config.coord.q - this.config.coord.r + target.q + target.r);
    
    if (dist > 2) { // 2 = максимальное расстояние для соседнего гекса в axial coords
      return false;
    }

    this.config.coord = { ...target };
    this.config.movementPoints -= 1;
    this.config.isFortified = false;

    eventBus.emit(GameEvent.UNIT_MOVED, { unit: this, target });
    
    return true;
  }

  /**
   * Атака другого юнита
   */
  attack(target: Unit): number {
    const attackStats = UNIT_STATS[this.config.type];
    const defenseStats = UNIT_STATS[target.config.type];

    // Базовый урон = атака - защита + рандом ±20%
    const baseDamage = Math.max(0, attackStats.strength - defenseStats.defense);
    const randomFactor = 0.8 + Math.random() * 0.4; // 0.8 - 1.2
    const damage = Math.floor(baseDamage * randomFactor);

    target.takeDamage(damage);

    // Опыт за бой
    if (damage > 0) {
      this.gainExperience(10);
    }

    return damage;
  }

  /**
   * Получение урона
   */
  takeDamage(amount: number): void {
    this.config.health = Math.max(0, this.config.health - amount);
    
    if (this.config.health <= 0) {
      eventBus.emit('unit:died', { unit: this });
    }
  }

  /**
   * Получение опыта
   */
  gainExperience(amount: number): void {
    this.config.experience += amount;
    
    // Простая система уровней: каждый 50 опыт = новый уровень
    const newLevel = Math.floor(this.config.experience / 50) + 1;
    if (newLevel > this.config.level) {
      this.config.level = newLevel;
      this.config.maxHealth += 10;
      this.config.health = this.config.maxHealth;
      console.log(`[Unit] ${UNIT_NAMES[this.config.type]} получил уровень ${this.config.level}`);
    }
  }

  /**
   * Восстановление очков движения
   */
  refreshMovement(): void {
    this.config.movementPoints = this.config.maxMovementPoints;
    this.config.isFortified = false;
  }

  /**
   * Фортификация (защитная позиция)
   */
  setFortified(fortified: boolean): void {
    this.config.isFortified = fortified;
    if (fortified) {
      this.config.movementPoints = 0;
    }
  }

  /**
   * Получение названия типа
   */
  getTypeName(): string {
    return UNIT_NAMES[this.config.type];
  }

  /**
   * Получение иконки
   */
  getIcon(): string {
    return UNIT_ICONS[this.config.type];
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
