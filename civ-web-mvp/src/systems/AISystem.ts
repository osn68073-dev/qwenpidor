/**
 * AISystem - простой ИИ для компьютерных противников
 * Использует FSM (Finite State Machine) с приоритетами
 */

import { HexGrid, HexCoord } from '../map/HexGrid';
import { Unit, UnitType } from '../entities/Unit';
import { City } from '../entities/City';
import { UNIT_STATS } from '../entities/UnitTypes';
import { eventBus, GameEvent } from '../core/EventBus';

export enum AIState {
  EXPLORE = 'explore',      // Разведка карты
  EXPAND = 'expand',        // Расширение (новые города)
  DEVELOP = 'develop',      // Развитие экономики
  MILITARIZE = 'militarize',// Накопление армии
  ATTACK = 'attack',        // Атака врага
}

export interface AIPersonality {
  aggression: number;       // 0-1: 0=мирный, 1=агрессивный
  expansion: number;        // 0-1: желание расширяться
  science: number;          // 0-1: фокус на науку
  culture: number;          // 0-1: фокус на культуру
}

export const AI_PERSONALITIES: Record<string, AIPersonality> = {
  peaceful: { aggression: 0.2, expansion: 0.8, science: 0.7, culture: 0.6 },
  balanced: { aggression: 0.5, expansion: 0.5, science: 0.5, culture: 0.5 },
  aggressive: { aggression: 0.9, expansion: 0.6, science: 0.4, culture: 0.3 },
  scientific: { aggression: 0.3, expansion: 0.4, science: 0.9, culture: 0.5 },
};

export interface AIDecision {
  action: 'move_unit' | 'found_city' | 'train_unit' | 'build_building' | 'attack';
  target?: HexCoord;
  unitId?: string;
  targetType?: UnitType | string;
  priority: number;
}

export class AISystem {
  private playerId: string;
  private personality: AIPersonality;
  private state: AIState = AIState.EXPLORE;
  private cities: City[] = [];
  private units: Unit[] = [];
  private grid: HexGrid | null = null;
  private decisionQueue: AIDecision[] = [];
  private lastDecisionTick: number = 0;
  private exploredTiles: Set<string> = new Set();

  constructor(playerId: string, personalityName: string = 'balanced') {
    this.playerId = playerId;
    this.personality = AI_PERSONALITIES[personalityName] || AI_PERSONALITIES.balanced;
  }

  /**
   * Установка карты для ИИ
   */
  setGrid(grid: HexGrid): void {
    this.grid = grid;
  }

  /**
   * Добавление города ИИ
   */
  addCity(city: City): void {
    this.cities.push(city);
  }

  /**
   * Добавление юнита ИИ
   */
  addUnit(unit: Unit): void {
    this.units.push(unit);
  }

  /**
   * Удаление юнита
   */
  removeUnit(unitId: string): void {
    this.units = this.units.filter(u => u.config.id !== unitId);
  }

  /**
   * Главный метод обновления ИИ (вызывается каждый тик)
   */
  update(tick: number): void {
    if (!this.grid) return;

    // Принятие решений каждые 50 тиков (не слишком часто)
    if (tick - this.lastDecisionTick < 50) return;
    this.lastDecisionTick = tick;

    // Обновление состояния FSM
    this.updateState();

    // Генерация решений
    this.decisionQueue = this.generateDecisions();

    // Выполнение приоритетного решения
    if (this.decisionQueue.length > 0) {
      this.executeDecision(this.decisionQueue[0]);
    }
  }

  /**
   * Обновление состояния FSM
   */
  private updateState(): void {
    const cityCount = this.cities.length;
    const unitCount = this.units.length;
    const militaryStrength = this.getMilitaryStrength();

    // Логика переключения состояний
    if (cityCount === 0) {
      this.state = AIState.EXPAND;
    } else if (cityCount < 3 && this.personality.expansion > 0.5) {
      this.state = AIState.EXPAND;
    } else if (militaryStrength < cityCount * 2 && this.personality.aggression > 0.5) {
      this.state = AIState.MILITARIZE;
    } else if (this.hasEnemyNearby() && this.personality.aggression > 0.3) {
      this.state = AIState.ATTACK;
    } else if (this.personality.science > 0.6) {
      this.state = AIState.DEVELOP;
    } else {
      this.state = AIState.EXPLORE;
    }
  }

  /**
   * Генерация возможных решений
   */
  private generateDecisions(): AIDecision[] {
    const decisions: AIDecision[] = [];

    switch (this.state) {
      case AIState.EXPLORE:
        decisions.push(...this.generateExploreDecisions());
        break;
      case AIState.EXPAND:
        decisions.push(...this.generateExpandDecisions());
        break;
      case AIState.DEVELOP:
        decisions.push(...this.generateDevelopDecisions());
        break;
      case AIState.MILITARIZE:
        decisions.push(...this.generateMilitarizeDecisions());
        break;
      case AIState.ATTACK:
        decisions.push(...this.generateAttackDecisions());
        break;
    }

    // Сортировка по приоритету
    return decisions.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Решения для разведки
   */
  private generateExploreDecisions(): AIDecision[] {
    const decisions: AIDecision[] = [];

    for (const unit of this.units) {
      if (unit.config.type === UnitType.SCOUT) {
        // Найти неисследованный тайл поблизости
        const unexplored = this.findUnexploredNearby(unit.config.coord, 5);
        if (unexplored) {
          decisions.push({
            action: 'move_unit',
            target: unexplored,
            unitId: unit.config.id,
            priority: 0.8,
          });
        }
      }
    }

    return decisions;
  }

  /**
   * Решения для расширения
   */
  private generateExpandDecisions(): AIDecision[] {
    const decisions: AIDecision[] = [];

    // Поиск поселенца
    const settler = this.units.find(u => u.config.type === UnitType.SETTLER);
    if (settler) {
      // Найти хорошее место для города
      const settleSpot = this.findSettleLocation(settler.config.coord, 3);
      if (settleSpot) {
        decisions.push({
          action: 'found_city',
          target: settleSpot,
          unitId: settler.config.id,
          priority: 0.9,
        });
      }
    } else {
      // Нужно произвести поселенца
      decisions.push({
        action: 'train_unit',
        targetType: UnitType.SETTLER,
        priority: 0.7,
      });
    }

    return decisions;
  }

  /**
   * Решения для развития
   */
  private generateDevelopDecisions(): AIDecision[] {
    const decisions: AIDecision[] = [];

    // Приоритет на здания для науки/культуры
    for (const city of this.cities) {
      if (!city.config.buildings.includes('library')) {
        decisions.push({
          action: 'build_building',
          targetType: 'library',
          priority: 0.6,
        });
      }
    }

    return decisions;
  }

  /**
   * Решения для милитаризации
   */
  private generateMilitarizeDecisions(): AIDecision[] {
    const decisions: AIDecision[] = [];

    // Производство военных юнитов
    decisions.push({
      action: 'train_unit',
      targetType: UnitType.WARRIOR,
      priority: 0.8,
    });

    return decisions;
  }

  /**
   * Решения для атаки
   */
  private generateAttackDecisions(): AIDecision[] {
    const decisions: AIDecision[] = [];

    // Найти вражеский юнит или город
    const enemyTarget = this.findEnemyTarget();
    if (enemyTarget) {
      for (const unit of this.units.filter(u => u.config.type === UnitType.WARRIOR)) {
        decisions.push({
          action: 'attack',
          target: enemyTarget,
          unitId: unit.config.id,
          priority: 0.9,
        });
      }
    }

    return decisions;
  }

  /**
   * Выполнение решения
   */
  private executeDecision(decision: AIDecision): void {
    console.log(`[AI] Решение: ${decision.action}, приоритет: ${decision.priority}`);

    switch (decision.action) {
      case 'move_unit':
        if (decision.unitId && decision.target) {
          const unit = this.units.find(u => u.config.id === decision.unitId);
          if (unit) {
            unit.move(decision.target);
            eventBus.emit(GameEvent.UNIT_MOVED, { unit, target: decision.target });
          }
        }
        break;

      case 'found_city':
        if (decision.unitId && decision.target) {
          // Удалить поселенца и создать город
          this.removeUnit(decision.unitId);
          const city = new City({
            name: `Город ${this.cities.length + 1}`,
            owner: this.playerId,
            coord: decision.target,
            population: 1,
          });
          this.addCity(city);
          eventBus.emit(GameEvent.CITY_CREATED, { city });
        }
        break;

      case 'train_unit':
        // Отправить событие в экономику для производства
        eventBus.emit('ai:train_unit', {
          ownerId: this.playerId,
          unitType: decision.targetType,
        });
        break;

      case 'build_building':
        eventBus.emit('ai:build_building', {
          ownerId: this.playerId,
          buildingId: decision.targetType,
        });
        break;

      case 'attack':
        // Логика атаки (нужна система боя)
        console.log('[AI] Атака цели');
        break;
    }
  }

  /**
   * Поиск неисследованного тайла
   */
  private findUnexploredNearby(center: HexCoord, range: number): HexCoord | null {
    if (!this.grid) return null;

    for (let dq = -range; dq <= range; dq++) {
      for (let dr = -range; dr <= range; dr++) {
        if (Math.abs(dq) + Math.abs(dr) + Math.abs(-dq - dr) > range * 2) continue;

        const tile = this.grid.getTile(center.q + dq, center.r + dr);
        if (tile && !tile.explored) {
          return tile.coord;
        }
      }
    }

    return null;
  }

  /**
   * Поиск места для поселения
   */
  private findSettleLocation(center: HexCoord, range: number): HexCoord | null {
    if (!this.grid) return null;

    let bestSpot: HexCoord | null = null;
    let bestScore = 0;

    for (let dq = -range; dq <= range; dq++) {
      for (let dr = -range; dr <= range; dr++) {
        if (Math.abs(dq) + Math.abs(dr) + Math.abs(-dq - dr) > range * 2) continue;

        const tile = this.grid.getTile(center.q + dq, center.r + dr);
        if (!tile || tile.type === 'water' || tile.type === 'mountains') continue;

        // Оценка места
        const score = tile.yield.food * 2 + tile.yield.production * 1.5 + tile.yield.gold;
        if (score > bestScore) {
          bestScore = score;
          bestSpot = tile.coord;
        }
      }
    }

    return bestSpot;
  }

  /**
   * Поиск вражеской цели
   */
  private findEnemyTarget(): HexCoord | null {
    // Заглушка - должна искать реальных врагов
    return null;
  }

  /**
   * Проверка наличия врага поблизости
   */
  private hasEnemyNearby(): boolean {
    // Заглушка
    return false;
  }

  /**
   * Подсчёт военной силы
   */
  private getMilitaryStrength(): number {
    let strength = 0;
    for (const unit of this.units) {
      const stats = UNIT_STATS[unit.config.type];
      strength += stats.strength + stats.defense;
    }
    return strength;
  }

  /**
   * Сериализация
   */
  serialize(): object {
    return {
      playerId: this.playerId,
      personality: this.personality,
      state: this.state,
      cities: this.cities.map(c => c.serialize()),
      units: this.units.map(u => u.serialize()),
    };
  }

  /**
   * Десериализация
   */
  deserialize(data: any, grid: HexGrid): void {
    this.playerId = data.playerId;
    this.personality = data.personality;
    this.state = data.state;
    this.grid = grid;
    this.cities = data.cities.map((c: any) => new City(c));
    this.units = data.units.map((u: any) => new Unit(u));
  }
}

export const createAI = (playerId: string, personality: string = 'balanced'): AISystem => {
  return new AISystem(playerId, personality);
};
