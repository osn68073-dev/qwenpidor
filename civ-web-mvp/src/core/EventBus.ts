/**
 * EventBus - система событий для связи между модулями
 * Используется для декуплинга компонентов игры
 */

type EventCallback = (data?: any) => void;

export class EventBus {
  private events: Map<string, Set<EventCallback>>;

  constructor() {
    this.events = new Map();
  }

  /**
   * Подписка на событие
   */
  on(event: string, callback: EventCallback): void {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    this.events.get(event)!.add(callback);
  }

  /**
   * Отписка от события
   */
  off(event: string, callback: EventCallback): void {
    const callbacks = this.events.get(event);
    if (callbacks) {
      callbacks.delete(callback);
    }
  }

  /**
   *_emit_ события с данными
   */
  emit(event: string, data?: any): void {
    const callbacks = this.events.get(event);
    if (callbacks) {
      callbacks.forEach(cb => cb(data));
    }
  }

  /**
   * Очистка всех подписчиков события
   */
  clear(event: string): void {
    this.events.delete(event);
  }

  /**
   * Полная очистка всех событий
   */
  destroy(): void {
    this.events.clear();
  }
}

// Глобальный экземпляр для использования во всём приложении
export const eventBus = new EventBus();

// Типы событий для типизации
export enum GameEvent {
  // Игровой цикл
  GAME_TICK = 'game:tick',
  GAME_PAUSE = 'game:pause',
  GAME_SPEED_CHANGE = 'game:speed_change',
  
  // Ресурсы
  RESOURCES_UPDATE = 'resources:update',
  
  // Карта
  TILE_CLICKED = 'map:tile_clicked',
  TILE_HOVER = 'map:tile_hover',
  FOG_UPDATED = 'map:fog_updated',
  
  // Сущности
  UNIT_SELECTED = 'entity:unit_selected',
  UNIT_MOVED = 'entity:unit_moved',
  CITY_SELECTED = 'entity:city_selected',
  CITY_CREATED = 'entity:city_created',
  
  // Бой
  COMBAT_STARTED = 'combat:started',
  COMBAT_RESOLVED = 'combat:resolved',
  
  // Технологии
  TECH_RESEARCHED = 'tech:researched',
  
  // Сохранение
  GAME_SAVED = 'game:saved',
  GAME_LOADED = 'game:loaded',
  
  // UI
  SELECTION_CHANGED = 'ui:selection_changed',
  NOTIFICATION = 'ui:notification',
}
