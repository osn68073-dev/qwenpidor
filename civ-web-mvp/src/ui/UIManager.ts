/**
 * UIManager - управление UI элементами
 * Обновление панелей ресурсов, контекстных меню, уведомлений
 */

import { eventBus, GameEvent } from '../core/EventBus';
import { Resources } from '../systems/EconomySystem';
import { timeManager, GameSpeed } from '../core/TimeManager';
import { HexGrid } from '../map/HexGrid';
import { Tile } from '../map/HexGrid';
import { RESOURCE_ICONS } from '../map/TileTypes';

export class UIManager {
  private elements: {
    topBar: HTMLElement | null;
    resources: {
      food: HTMLElement | null;
      production: HTMLElement | null;
      gold: HTMLElement | null;
      science: HTMLElement | null;
      culture: HTMLElement | null;
    };
    speedButtons: NodeListOf<Element>;
    saveBtn: HTMLElement | null;
    loadBtn: HTMLElement | null;
    selectionInfo: HTMLElement | null;
    actionButtons: HTMLElement | null;
    minimap: HTMLCanvasElement | null;
    tooltip: HTMLElement | null;
    notifications: HTMLElement | null;
    loadingScreen: HTMLElement | null;
  };

  constructor() {
    this.elements = {
      topBar: document.getElementById('top-bar'),
      resources: {
        food: document.getElementById('res-food'),
        production: document.getElementById('res-production'),
        gold: document.getElementById('res-gold'),
        science: document.getElementById('res-science'),
        culture: document.getElementById('res-culture'),
      },
      speedButtons: document.querySelectorAll('.speed-btn[data-speed]'),
      saveBtn: document.getElementById('save-btn'),
      loadBtn: document.getElementById('load-btn'),
      selectionInfo: document.getElementById('selection-info'),
      actionButtons: document.getElementById('action-buttons'),
      minimap: document.getElementById('minimap') as HTMLCanvasElement | null,
      tooltip: document.getElementById('tooltip'),
      notifications: document.getElementById('notifications'),
      loadingScreen: document.getElementById('loading-screen'),
    };

    this.setupEventListeners();
    console.log('[UIManager] Инициализирован');
  }

  /**
   * Настройка слушателей событий
   */
  private setupEventListeners(): void {
    // Обновление ресурсов
    eventBus.on(GameEvent.RESOURCES_UPDATE, (data) => {
      this.updateResources(data.resources);
    });

    // Изменение скорости
    eventBus.on(GameEvent.GAME_SPEED_CHANGE, (data) => {
      this.updateSpeedButtons(data.speed);
    });

    // Клик по тайлу
    eventBus.on(GameEvent.TILE_CLICKED, (data) => {
      this.onTileClicked(data.coord);
    });

    // Наведение на тайл
    eventBus.on(GameEvent.TILE_HOVER, (data) => {
      this.showTooltip(data.coord, data.screen);
    });

    // Обработчики кнопок скорости
    this.elements.speedButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const speed = parseInt(target.dataset.speed || '1');
        timeManager.setSpeed(speed as GameSpeed);
      });
    });

    // Клавиши управления камерой
    window.addEventListener('keydown', (e) => {
      const cameraEvent = new CustomEvent('camera-move', { detail: this.getCameraMove(e.code) });
      window.dispatchEvent(cameraEvent);
    });
  }

  /**
   * Определение направления движения камеры
   */
  private getCameraMove(code: string): { dx: number; dy: number } {
    const speed = 20;
    switch (code) {
      case 'KeyW':
      case 'ArrowUp':
        return { dx: 0, dy: speed };
      case 'KeyS':
      case 'ArrowDown':
        return { dx: 0, dy: -speed };
      case 'KeyA':
      case 'ArrowLeft':
        return { dx: speed, dy: 0 };
      case 'KeyD':
      case 'ArrowRight':
        return { dx: -speed, dy: 0 };
      default:
        return { dx: 0, dy: 0 };
    }
  }

  /**
   * Обновление отображения ресурсов
   */
  updateResources(resources: Resources): void {
    if (this.elements.resources.food) {
      this.elements.resources.food.textContent = Math.floor(resources.food).toString();
    }
    if (this.elements.resources.production) {
      this.elements.resources.production.textContent = Math.floor(resources.production).toString();
    }
    if (this.elements.resources.gold) {
      this.elements.resources.gold.textContent = Math.floor(resources.gold).toString();
    }
    if (this.elements.resources.science) {
      this.elements.resources.science.textContent = Math.floor(resources.science).toString();
    }
    if (this.elements.resources.culture) {
      this.elements.resources.culture.textContent = Math.floor(resources.culture).toString();
    }
  }

  /**
   * Обновление кнопок скорости
   */
  updateSpeedButtons(currentSpeed: GameSpeed): void {
    this.elements.speedButtons.forEach(btn => {
      const target = btn as HTMLElement;
      const speed = parseInt(target.dataset.speed || '1');
      
      if (speed === currentSpeed) {
        target.classList.add('active');
      } else {
        target.classList.remove('active');
      }
    });
  }

  /**
   * Обработка клика по тайлу
   */
  private onTileClicked(coord: { q: number; r: number }): void {
    // Здесь будет логика выбора юнита или города на тайле
    if (this.elements.selectionInfo) {
      this.elements.selectionInfo.textContent = `Гекс (${coord.q}, ${coord.r})`;
    }
    
    // Очистка кнопок действий
    if (this.elements.actionButtons) {
      this.elements.actionButtons.innerHTML = '';
    }
  }

  /**
   * Показ тултипа для тайла
   */
  showTooltip(tile: { q: number; r: number }, screenPos: { x: number; y: number }): void {
    if (!this.elements.tooltip) return;

    // Получение данных о тайле (должно приходить извне)
    const tooltip = this.elements.tooltip;
    tooltip.style.display = 'block';
    tooltip.style.left = `${screenPos.x + 15}px`;
    tooltip.style.top = `${screenPos.y + 15}px`;
    tooltip.innerHTML = `
      <div><strong>Гекс (${tile.q}, ${tile.r})</strong></div>
      <div style="margin-top: 5px; color: #aaa;">Наведите для информации</div>
    `;
  }

  /**
   * Скрытие тултипа
   */
  hideTooltip(): void {
    if (this.elements.tooltip) {
      this.elements.tooltip.style.display = 'none';
    }
  }

  /**
   * Показ уведомления
   */
  showNotification(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info'): void {
    if (!this.elements.notifications) return;

    const notification = document.createElement('div');
    notification.className = 'notification';
    
    const colors = {
      info: '#4CAF50',
      success: '#8BC34A',
      warning: '#FFC107',
      error: '#F44336',
    };
    
    notification.style.borderLeftColor = colors[type];
    notification.textContent = message;
    
    this.elements.notifications.appendChild(notification);
    
    // Удаление через 3 секунды
    setTimeout(() => {
      notification.style.opacity = '0';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  /**
   * Обновление мини-карты
   */
  updateMinimap(grid: HexGrid): void {
    if (!this.elements.minimap) return;

    const canvas = this.elements.minimap;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width = canvas.offsetWidth;
    const height = canvas.height = canvas.offsetHeight;

    ctx.clearRect(0, 0, width, height);
    
    // Простая отрисовка исследованных тайлов
    const tiles = grid.getAllTiles().filter(t => t.explored);
    const scale = Math.min(width, height) / (grid.getConfig().radius * 4);
    
    ctx.fillStyle = '#4a4a6a';
    for (const tile of tiles) {
      const x = width / 2 + tile.coord.q * scale;
      const y = height / 2 + tile.coord.r * scale;
      ctx.fillRect(x - 1, y - 1, 2, 2);
    }
  }

  /**
   * Скрытие экрана загрузки
   */
  hideLoadingScreen(): void {
    if (this.elements.loadingScreen) {
      this.elements.loadingScreen.classList.add('hidden');
    }
  }

  /**
   * Обновление информации о выделенном объекте
   */
  updateSelection(info: string, actions?: Array<{ label: string; onClick: () => void }>): void {
    if (this.elements.selectionInfo) {
      this.elements.selectionInfo.textContent = info;
    }

    if (actions && this.elements.actionButtons) {
      this.elements.actionButtons.innerHTML = '';
      
      for (const action of actions) {
        const btn = document.createElement('button');
        btn.className = 'action-btn';
        btn.textContent = action.label;
        btn.onclick = action.onClick;
        this.elements.actionButtons.appendChild(btn);
      }
    }
  }

  /**
   * Создание скрытого input для загрузки файла
   */
  createFileInput(onFileSelected: (file: File) => void): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.style.display = 'none';
    
    input.onchange = (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (files && files.length > 0) {
        onFileSelected(files[0]);
      }
    };
    
    document.body.appendChild(input);
    input.click();
    document.body.removeChild(input);
  }
}

export const uiManager = new UIManager();
