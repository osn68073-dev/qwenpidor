/**
 * GameRenderer - рендеринг игры через PixiJS
 * Отрисовка гексагональной карты, юнитов, городов и UI элементов
 */

import * as PIXI from 'pixi.js';
import { HexGrid, HexCoord, Tile } from '../map/HexGrid';
import { TILE_COLORS, TILE_WALKABLE } from '../map/TileTypes';
import { Unit } from '../entities/Unit';
import { City } from '../entities/City';
import { eventBus, GameEvent } from '../core/EventBus';

export interface RendererConfig {
  hexSize: number;
  showGridLines: boolean;
  animationSpeed: number;
}

export class GameRenderer {
  private app: PIXI.Application;
  private config: RendererConfig;
  
  // Контейнеры для слоёв
  private gridContainer: PIXI.Container;
  private unitsContainer: PIXI.Container;
  private citiesContainer: PIXI.Container;
  private selectionContainer: PIXI.Container;
  private fogContainer: PIXI.Container;
  
  // Кэш спрайтов
  private tileSprites: Map<string, PIXI.Graphics>;
  private unitSprites: Map<string, PIXI.Container>;
  private citySprites: Map<string, PIXI.Container>;
  
  // Камера
  private camera: PIXI.Point;
  private zoom: number;
  
  // Выделение
  private selectedTile: HexCoord | null = null;
  private selectedUnit: Unit | null = null;
  private selectedCity: City | null = null;

  constructor(canvas: HTMLCanvasElement, config?: Partial<RendererConfig>) {
    this.config = {
      hexSize: 30,
      showGridLines: true,
      animationSpeed: 0.1,
      ...config,
    };

    // Инициализация PixiJS приложения
    this.app = new PIXI.Application({
      view: canvas,
      resizeTo: window,
      backgroundColor: 0x1a1a2e,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
    });

    // Создание контейнеров
    this.gridContainer = new PIXI.Container();
    this.unitsContainer = new PIXI.Container();
    this.citiesContainer = new PIXI.Container();
    this.selectionContainer = new PIXI.Container();
    this.fogContainer = new PIXI.Container();

    // Добавление на сцену
    this.app.stage.addChild(this.gridContainer);
    this.app.stage.addChild(this.citiesContainer);
    this.app.stage.addChild(this.unitsContainer);
    this.app.stage.addChild(this.selectionContainer);
    this.app.stage.addChild(this.fogContainer);

    // Настройка камеры
    this.camera = new PIXI.Point(0, 0);
    this.zoom = 1;

    // Кэш
    this.tileSprites = new Map();
    this.unitSprites = new Map();
    this.citySprites = new Map();

    // Обработчики событий
    this.setupInteractions();
    this.setupEventListeners();

    console.log('[GameRenderer] Инициализирован');
  }

  /**
   * Преобразование гекс-координат в экранные
   */
  hexToScreen(coord: HexCoord): PIXI.Point {
    const size = this.config.hexSize;
    const x = size * (3/2 * coord.q);
    const y = size * (Math.sqrt(3)/2 * coord.q + Math.sqrt(3) * coord.r);
    
    return new PIXI.Point(
      x * this.zoom + this.camera.x + window.innerWidth / 2,
      y * this.zoom + this.camera.y + window.innerHeight / 2
    );
  }

  /**
   * Преобразование экранных координат в гекс-координаты
   */
  screenToHex(screenX: number, screenY: number): HexCoord {
    const size = this.config.hexSize;
    
    // Учёт камеры и зума
    const x = (screenX - window.innerWidth / 2 - this.camera.x) / this.zoom;
    const y = (screenY - window.innerHeight / 2 - this.camera.y) / this.zoom;
    
    const q = (2/3 * x) / size;
    const r = (-1/3 * x + Math.sqrt(3)/3 * y) / size;
    
    return this.roundHex(q, r);
  }

  /**
   * Округление гекс-координат
   */
  private roundHex(q: number, r: number): HexCoord {
    let s = -q - r;
    
    let rq = Math.round(q);
    let rr = Math.round(r);
    let rs = Math.round(s);
    
    const q_diff = Math.abs(rq - q);
    const r_diff = Math.abs(rr - r);
    const s_diff = Math.abs(rs - s);
    
    if (q_diff > r_diff && q_diff > s_diff) {
      rq = -rr - rs;
    } else if (r_diff > s_diff) {
      rr = -rq - rs;
    }
    
    return { q: rq, r: rr };
  }

  /**
   * Отрисовка гекса
   */
  private drawHex(coord: HexCoord, type: string, visible: boolean): PIXI.Graphics {
    const graphics = new PIXI.Graphics();
    const pos = this.hexToScreen(coord);
    const size = this.config.hexSize * this.zoom;
    
    // Цвет тайла
    const colorKey = type as keyof typeof TILE_COLORS;
    const baseColor = TILE_COLORS[colorKey] || 0x888888;
    
    // Затемнение если не видно
    const color = visible ? baseColor : this.darkenColor(baseColor, 0.5);
    
    graphics.beginFill(color);
    graphics.lineStyle(1, 0x000000, 0.3);
    
    // Рисуем шестиугольник
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i;
      const x = pos.x + size * Math.cos(angle);
      const y = pos.y + size * Math.sin(angle);
      
      if (i === 0) {
        graphics.moveTo(x, y);
      } else {
        graphics.lineTo(x, y);
      }
    }
    
    graphics.closePath();
    graphics.endFill();
    
    return graphics;
  }

  /**
   * Затемнение цвета
   */
  private darkenColor(color: number, factor: number): number {
    const r = (color >> 16) & 0xFF;
    const g = (color >> 8) & 0xFF;
    const b = color & 0xFF;
    
    const nr = Math.floor(r * factor);
    const ng = Math.floor(g * factor);
    const nb = Math.floor(b * factor);
    
    return (nr << 16) | (ng << 8) | nb;
  }

  /**
   * Отрисовка всей сетки
   */
  renderGrid(grid: HexGrid): void {
    this.gridContainer.removeChildren();
    this.tileSprites.clear();
    
    for (const tile of grid.getAllTiles()) {
      if (tile.explored) {
        const sprite = this.drawHex(tile.coord, tile.type, tile.visible);
        this.gridContainer.addChild(sprite);
        this.tileSprites.set(HexGrid.toKey(tile.coord.q, tile.coord.r), sprite);
      }
    }
  }

  /**
   * Отрисовка юнита
   */
  renderUnit(unit: Unit): void {
    if (this.unitSprites.has(unit.config.id)) {
      return; // Уже отрисован
    }

    const container = new PIXI.Container();
    const pos = this.hexToScreen(unit.config.coord);
    
    // Фон
    const bg = new PIXI.Graphics();
    bg.beginFill(0x000000, 0.5);
    bg.drawCircle(0, 0, this.config.hexSize * 0.6 * this.zoom);
    bg.endFill();
    container.addChild(bg);
    
    // Иконка
    const text = new PIXI.Text(unit.getIcon(), {
      fontSize: Math.floor(24 * this.zoom),
    });
    text.anchor.set(0.5);
    container.addChild(text);
    
    // Полоска здоровья
    const healthBar = new PIXI.Graphics();
    healthBar.beginFill(0xff0000);
    healthBar.drawRect(-15 * this.zoom, 20 * this.zoom, 30 * this.zoom, 4 * this.zoom);
    healthBar.endFill();
    healthBar.beginFill(0x00ff00);
    healthBar.drawRect(-15 * this.zoom, 20 * this.zoom, 30 * this.zoom * (unit.config.health / unit.config.maxHealth), 4 * this.zoom);
    healthBar.endFill();
    container.addChild(healthBar);
    
    container.position.set(pos.x, pos.y);
    this.unitsContainer.addChild(container);
    this.unitSprites.set(unit.config.id, container);
  }

  /**
   * Отрисовка города
   */
  renderCity(city: City): void {
    if (this.citySprites.has(city.config.id)) {
      return;
    }

    const container = new PIXI.Container();
    const pos = this.hexToScreen(city.config.coord);
    
    // Фон города
    const bg = new PIXI.Graphics();
    bg.beginFill(0x4a4a6a, 0.9);
    bg.drawCircle(0, 0, this.config.hexSize * 0.8 * this.zoom);
    bg.endFill();
    bg.lineStyle(2, 0xffffff, 0.8);
    bg.drawCircle(0, 0, this.config.hexSize * 0.7 * this.zoom);
    container.addChild(bg);
    
    // Название
    const nameText = new PIXI.Text(city.config.name, {
      fontSize: Math.floor(14 * this.zoom),
      fill: 0xffffff,
      stroke: 0x000000,
      strokeThickness: 3,
    });
    nameText.anchor.set(0.5);
    nameText.position.y = -this.config.hexSize * this.zoom;
    container.addChild(nameText);
    
    // Иконка города
    const icon = new PIXI.Text('🏙️', {
      fontSize: Math.floor(28 * this.zoom),
    });
    icon.anchor.set(0.5);
    container.addChild(icon);
    
    // Население
    const popText = new PIXI.Text(`👥 ${city.config.population}`, {
      fontSize: Math.floor(12 * this.zoom),
      fill: 0xffff00,
    });
    popText.anchor.set(0.5);
    popText.position.y = this.config.hexSize * 0.5 * this.zoom;
    container.addChild(popText);
    
    container.position.set(pos.x, pos.y);
    this.citiesContainer.addChild(container);
    this.citySprites.set(city.config.id, container);
  }

  /**
   * Выделение тайла
   */
  highlightTile(coord: HexCoord): void {
    this.selectedTile = coord;
    this.selectionContainer.removeChildren();
    
    const pos = this.hexToScreen(coord);
    const size = this.config.hexSize * this.zoom;
    
    const highlight = new PIXI.Graphics();
    highlight.lineStyle(3, 0xffff00, 0.8);
    
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i;
      const x = pos.x + size * Math.cos(angle);
      const y = pos.y + size * Math.sin(angle);
      
      if (i === 0) {
        highlight.moveTo(x, y);
      } else {
        highlight.lineTo(x, y);
      }
    }
    
    highlight.closePath();
    this.selectionContainer.addChild(highlight);
  }

  /**
   * Настройка взаимодействий
   */
  private setupInteractions(): void {
    this.app.stage.eventMode = 'static';
    this.app.stage.hitArea = this.app.screen;
    
    // Клик ЛКМ - выделение
    this.app.stage.on('pointerdown', (e) => {
      const coord = this.screenToHex(e.global.x, e.global.y);
      this.highlightTile(coord);
      eventBus.emit(GameEvent.TILE_CLICKED, { coord });
    });
    
    // Движение мыши - тултип
    this.app.stage.on('pointermove', (e) => {
      const coord = this.screenToHex(e.global.x, e.global.y);
      eventBus.emit(GameEvent.TILE_HOVER, { coord, screen: e.global });
    });
    
    // Зум колёсиком
    this.app.stage.on('wheel', (e) => {
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      this.zoom = Math.max(0.5, Math.min(2, this.zoom * delta));
      this.updateCamera();
    });
  }

  /**
   * Настройка слушателей событий
   */
  private setupEventListeners(): void {
    // Перерисовка при изменении тумана войны
    eventBus.on(GameEvent.FOG_UPDATED, () => {
      // Можно оптимизировать, перерисовывая только изменившиеся тайлы
    });
    
    // Обновление камеры при ресайзе
    window.addEventListener('resize', () => {
      this.app.renderer.resize(window.innerWidth, window.innerHeight);
    });
  }

  /**
   * Обновление камеры
   */
  updateCamera(): void {
    // Применяем зум ко всем контейнерам
    this.gridContainer.scale.set(this.zoom);
    this.unitsContainer.scale.set(this.zoom);
    this.citiesContainer.scale.set(this.zoom);
    
    // Центрирование
    this.gridContainer.position.set(this.camera.x, this.camera.y);
    this.unitsContainer.position.set(this.camera.x, this.camera.y);
    this.citiesContainer.position.set(this.camera.x, this.camera.y);
  }

  /**
   * Перемещение камеры
   */
  moveCamera(dx: number, dy: number): void {
    this.camera.x += dx;
    this.camera.y += dy;
    this.updateCamera();
  }

  /**
   * Очистка всех спрайтов
   */
  clear(): void {
    this.gridContainer.removeChildren();
    this.unitsContainer.removeChildren();
    this.citiesContainer.removeChildren();
    this.selectionContainer.removeChildren();
    this.tileSprites.clear();
    this.unitSprites.clear();
    this.citySprites.clear();
  }

  /**
   * Получение приложения PixiJS
   */
  getApplication(): PIXI.Application {
    return this.app;
  }
}
