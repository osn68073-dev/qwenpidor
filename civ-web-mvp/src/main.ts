/**
 * main.ts - точка входа приложения
 * Инициализация всех систем и запуск игры
 */

import { gameLoop } from './core/GameLoop';
import { timeManager, GameSpeed } from './core/TimeManager';
import { eventBus, GameEvent } from './core/EventBus';
import { hexGrid, HexGrid } from './map/HexGrid';
import { economySystem, EconomySystem } from './systems/EconomySystem';
import { saveManager } from './save/SaveManager';
import { GameRenderer } from './ui/GameRenderer';
import { UIManager, uiManager } from './ui/UIManager';
import { Unit, UnitType } from './entities/Unit';
import { City } from './entities/City';

// Глобальное состояние игры
interface GameState {
  grid: HexGrid;
  economy: EconomySystem;
  units: Map<string, Unit>;
  cities: Map<string, City>;
  renderer: GameRenderer | null;
  ui: UIManager;
  isInitialized: boolean;
}

const gameState: GameState = {
  grid: hexGrid,
  economy: economySystem,
  units: new Map(),
  cities: new Map(),
  renderer: null,
  ui: uiManager,
  isInitialized: false,
};

/**
 * Инициализация игры
 */
async function initGame(): Promise<void> {
  console.log('[Main] Инициализация игры...');

  try {
    // Генерация карты
    await gameState.grid.generate();

    // Создание рендерера
    const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    if (canvas) {
      gameState.renderer = new GameRenderer(canvas);
      gameState.renderer.renderGrid(gameState.grid);
    }

    // Создание стартового юнита (разведчик)
    const scout = new Unit({
      type: UnitType.SCOUT,
      owner: 'player',
      coord: { q: 0, r: 0 },
    });
    gameState.units.set(scout.config.id, scout);
    
    if (gameState.renderer) {
      gameState.renderer.renderUnit(scout);
    }

    // Создание стартового города
    const capital = new City({
      name: 'Столица',
      owner: 'player',
      coord: { q: 2, r: -1 },
      population: 3,
      buildings: ['monument'],
    });
    gameState.cities.set(capital.config.id, capital);
    gameState.economy.addCity(capital);
    
    if (gameState.renderer) {
      gameState.renderer.renderCity(capital);
    }

    // Настройка обработчиков событий
    setupEventHandlers();

    // Скрытие экрана загрузки
    gameState.ui.hideLoadingScreen();

    // Запуск игрового цикла
    gameLoop.start();

    // Обновление мини-карты
    setInterval(() => {
      gameState.ui.updateMinimap(gameState.grid);
    }, 1000);

    // Обработка сохранения/загрузки
    setupSaveLoadHandlers();

    gameState.isInitialized = true;
    console.log('[Main] Игра успешно инициализирована');
    gameState.ui.showNotification('Добро пожаловать в CivWeb MVP!', 'success');

  } catch (error) {
    console.error('[Main] Ошибка инициализации:', error);
    gameState.ui.showNotification('Ошибка загрузки игры', 'error');
  }
}

/**
 * Настройка обработчиков событий
 */
function setupEventHandlers(): void {
  // Движение камеры
  window.addEventListener('camera-move', (e: any) => {
    const { dx, dy } = e.detail;
    if (dx !== 0 || dy !== 0 && gameState.renderer) {
      gameState.renderer.moveCamera(dx, dy);
    }
  });

  // Клик по тайлу - обновление информации
  eventBus.on(GameEvent.TILE_CLICKED, (data) => {
    const tile = gameState.grid.getTile(data.coord.q, data.coord.r);
    if (tile && gameState.renderer) {
      gameState.renderer.highlightTile(tile.coord);
      
      let info = `Тайл: ${tile.type}`;
      if (tile.resource !== 'none') {
        info += ` | Ресурс: ${tile.resource}`;
      }
      info += ` | Доход: +${tile.yield.food}🌾 +${tile.yield.production}⚙️ +${tile.yield.gold}💰`;
      
      gameState.ui.updateSelection(info);
    }
  });

  // Тултип при наведении
  let tooltipTimeout: number | null = null;
  
  eventBus.on(GameEvent.TILE_HOVER, (data) => {
    if (tooltipTimeout) {
      clearTimeout(tooltipTimeout);
    }
    
    tooltipTimeout = window.setTimeout(() => {
      const tile = gameState.grid.getTile(data.coord.q, data.coord.r);
      if (tile && tile.explored) {
        gameState.ui.showTooltip(data.coord, data.screen);
      }
    }, 200);
  });

  // Скрытие тултипа при движении мыши без остановки
  document.addEventListener('mousemove', () => {
    if (tooltipTimeout) {
      clearTimeout(tooltipTimeout);
      tooltipTimeout = null;
    }
    gameState.ui.hideTooltip();
  });

  // Обновление ресурсов в UI
  eventBus.on(GameEvent.RESOURCES_UPDATE, (data) => {
    console.log('[Main] Ресурсы обновлены:', data.resources);
  });
}

/**
 * Настройка обработчиков сохранения/загрузки
 */
function setupSaveLoadHandlers(): void {
  // Кнопка сохранения
  const saveBtn = document.getElementById('save-btn');
  if (saveBtn) {
    saveBtn.addEventListener('click', async () => {
      await saveCurrentGame();
    });
  }

  // Кнопка загрузки
  const loadBtn = document.getElementById('load-btn');
  if (loadBtn) {
    loadBtn.addEventListener('click', () => {
      gameState.ui.createFileInput(handleFileImport);
    });
  }
}

/**
 * Сохранение текущей игры
 */
async function saveCurrentGame(): Promise<void> {
  const gameData = {
    grid: gameState.grid.serialize(),
    economy: gameState.economy.serialize(),
    units: Array.from(gameState.units.entries()).map(([id, unit]) => [id, unit.serialize()]),
    cities: Array.from(gameState.cities.entries()).map(([id, city]) => [id, city.serialize()]),
    time: timeManager.serialize(),
  };

  const saveId = await saveManager.save(gameData, 'Быстрое сохранение');
  gameState.ui.showNotification('Игра сохранена!', 'success');
  
  console.log('[Main] Сохранение создано:', saveId);
}

/**
 * Импорт файла сохранения
 */
async function handleFileImport(file: File): Promise<void> {
  try {
    const saveData = await saveManager.importSave(file);
    await loadGame(saveData.gameData);
    gameState.ui.showNotification('Игра загружена!', 'success');
  } catch (error) {
    console.error('[Main] Ошибка импорта:', error);
    gameState.ui.showNotification('Ошибка загрузки файла', 'error');
  }
}

/**
 * Загрузка состояния игры
 */
async function loadGame(data: any): Promise<void> {
  console.log('[Main] Загрузка игры...');

  // Остановка текущего цикла
  gameLoop.stop();

  // Восстановление состояния
  gameState.grid.deserialize(data.grid);
  gameState.economy.deserialize(data.economy);
  
  // Восстановление юнитов
  gameState.units.clear();
  for (const [id, unitData] of data.units) {
    const unit = new Unit(unitData);
    gameState.units.set(id, unit);
  }
  
  // Восстановление городов
  gameState.cities.clear();
  for (const [id, cityData] of data.cities) {
    const city = new City(cityData);
    gameState.cities.set(id, city);
  }
  
  // Время
  timeManager.deserialize(data.time);

  // Перерисовка
  if (gameState.renderer) {
    gameState.renderer.clear();
    gameState.renderer.renderGrid(gameState.grid);
    
    for (const unit of gameState.units.values()) {
      gameState.renderer.renderUnit(unit);
    }
    
    for (const city of gameState.cities.values()) {
      gameState.renderer.renderCity(city);
    }
  }

  // Перезапуск
  gameLoop.start();
  
  console.log('[Main] Игра загружена успешно');
}

// Экспорт функций для отладки в консоли
(window as any).civGame = {
  getState: () => gameState,
  saveGame: saveCurrentGame,
  getGrid: () => gameState.grid,
  getEconomy: () => gameState.economy,
  getUnits: () => gameState.units,
  getCities: () => gameState.cities,
};

// Запуск после загрузки DOM
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initGame);
} else {
  initGame();
}

console.log('[Main] CivWeb MVP готов к запуску');
