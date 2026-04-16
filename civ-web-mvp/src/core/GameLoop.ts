/**
 * GameLoop - главный игровой цикл
 * Координирует обновление всех систем игры
 */

import { eventBus, GameEvent } from './EventBus';
import { timeManager, GameSpeed } from './TimeManager';

export interface GameConfig {
  ticksPerSecond: number;
  maxCities: number;
  maxUnits: number;
}

export class GameLoop {
  private config: GameConfig;
  private isRunning: boolean = false;
  private systems: Array<{ update: (dt: number) => void }> = [];

  constructor(config?: Partial<GameConfig>) {
    this.config = {
      ticksPerSecond: 10,
      maxCities: 200,
      maxUnits: 500,
      ...config,
    };
  }

  /**
   * Регистрация игровой системы
   */
  addSystem(system: { update: (dt: number) => void }): void {
    this.systems.push(system);
  }

  /**
   * Удаление системы
   */
  removeSystem(system: { update: (dt: number) => void }): void {
    const index = this.systems.indexOf(system);
    if (index !== -1) {
      this.systems.splice(index, 1);
    }
  }

  /**
   * Запуск игрового цикла
   */
  start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    timeManager.start();
    
    // Обработчик паузы через пробел
    window.addEventListener('keydown', this.handleKeyPress.bind(this));
    
    console.log('[GameLoop] Игра запущена');
  }

  /**
   * Остановка игрового цикла
   */
  stop(): void {
    this.isRunning = false;
    timeManager.stop();
    
    window.removeEventListener('keydown', this.handleKeyPress.bind(this));
    
    console.log('[GameLoop] Игра остановлена');
  }

  /**
   * Обработка нажатий клавиш
   */
  private handleKeyPress(event: KeyboardEvent): void {
    switch (event.code) {
      case 'Space':
        event.preventDefault();
        timeManager.togglePause();
        break;
      case 'Digit1':
        timeManager.setSpeed(GameSpeed.NORMAL);
        break;
      case 'Digit2':
        timeManager.setSpeed(GameSpeed.FAST);
        break;
      case 'Digit3':
        timeManager.setSpeed(GameSpeed.ULTRA);
        break;
    }
  }

  /**
   * Обновление всех систем (вызывается TimeManager)
   */
  updateSystems(deltaTime: number): void {
    if (!this.isRunning || timeManager.getState().speed === GameSpeed.PAUSED) {
      return;
    }

    // Обновляем все зарегистрированные системы
    for (const system of this.systems) {
      try {
        system.update(deltaTime);
      } catch (error) {
        console.error('[GameLoop] Ошибка обновления системы:', error);
      }
    }
  }

  /**
   * Получение конфигурации
   */
  getConfig(): GameConfig {
    return { ...this.config };
  }

  /**
   * Проверка лимитов
   */
  canCreateCity(currentCount: number): boolean {
    return currentCount < this.config.maxCities;
  }

  canCreateUnit(currentCount: number): boolean {
    return currentCount < this.config.maxUnits;
  }
}

// Глобальный экземпляр
export const gameLoop = new GameLoop();
