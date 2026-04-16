/**
 * TimeManager - управление игровым временем и скоростью
 * 1 тик = 1 минута игрового времени
 * Поддерживает паузу и ускорение (1x, 2x, 4x)
 */

import { eventBus, GameEvent } from './EventBus';

export enum GameSpeed {
  PAUSED = 0,
  NORMAL = 1,
  FAST = 2,
  ULTRA = 4,
}

export interface TimeState {
  speed: GameSpeed;
  tick: number;           // Номер текущего тика
  gameTime: number;       // Игровое время в минутах
  day: number;            // День игры
  year: number;           // Год (условно)
  lastTickTime: number;   // Время последнего тика в мс
}

export class TimeManager {
  private state: TimeState;
  private tickInterval: number = 100; // 100мс между тиками (10 тиков/сек)
  private timerId: number | null = null;
  private isRunning: boolean = false;

  constructor() {
    this.state = {
      speed: GameSpeed.NORMAL,
      tick: 0,
      gameTime: 0,
      day: 0,
      year: 0,
      lastTickTime: Date.now(),
    };
  }

  /**
   * Запуск игрового цикла
   */
  start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.state.lastTickTime = Date.now();
    this.scheduleNextTick();
  }

  /**
   * Остановка игрового цикла
   */
  stop(): void {
    this.isRunning = false;
    if (this.timerId !== null) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  /**
   * Планирование следующего тика
   */
  private scheduleNextTick(): void {
    if (!this.isRunning) return;

    const delay = this.state.speed === GameSpeed.PAUSED 
      ? 1000 
      : this.tickInterval / this.state.speed;

    this.timerId = window.setTimeout(() => {
      this.tick();
      this.scheduleNextTick();
    }, delay);
  }

  /**
   * Выполнение одного игрового тика
   */
  private tick(): void {
    if (this.state.speed === GameSpeed.PAUSED) return;

    this.state.tick++;
    this.state.gameTime++;
    
    // Обновление дня и года (условно: 1440 минут = 1 день)
    this.state.day = Math.floor(this.state.gameTime / 1440);
    this.state.year = Math.floor(this.state.day / 365) + 1;

    this.state.lastTickTime = Date.now();

    // Уведомляем системы о тике
    eventBus.emit(GameEvent.GAME_TICK, {
      tick: this.state.tick,
      deltaTime: this.tickInterval / this.state.speed,
    });
  }

  /**
   * Установка скорости игры
   */
  setSpeed(speed: GameSpeed): void {
    this.state.speed = speed;
    eventBus.emit(GameEvent.GAME_SPEED_CHANGE, { speed });
    
    // Если выходим из паузы - перезапускаем таймер
    if (speed !== GameSpeed.PAUSED && !this.isRunning) {
      this.start();
    }
  }

  /**
   * Переключение паузы
   */
  togglePause(): void {
    const newSpeed = this.state.speed === GameSpeed.PAUSED 
      ? GameSpeed.NORMAL 
      : GameSpeed.PAUSED;
    this.setSpeed(newSpeed);
  }

  /**
   * Получение текущего состояния времени
   */
  getState(): TimeState {
    return { ...this.state };
  }

  /**
   * Форматированное отображение времени
   */
  getFormattedTime(): string {
    const hours = Math.floor((this.state.gameTime % 1440) / 60);
    const minutes = this.state.gameTime % 60;
    return `Год ${this.state.year}, День ${this.state.day % 365 + 1}, ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }

  /**
   * Сброс времени (для новой игры)
   */
  reset(): void {
    this.state = {
      speed: this.state.speed,
      tick: 0,
      gameTime: 0,
      day: 0,
      year: 0,
      lastTickTime: Date.now(),
    };
  }

  /**
   * Сериализация для сохранения
   */
  serialize(): object {
    return { ...this.state };
  }

  /**
   * Десериализация из сохранения
   */
  deserialize(data: any): void {
    this.state = { ...data };
  }
}

export const timeManager = new TimeManager();
