/**
 * SaveManager - управление сохранениями
 * Поддержка IndexedDB и экспорта/импорта JSON
 */

import { eventBus, GameEvent } from '../core/EventBus';

const DB_NAME = 'CivWebMVP';
const DB_VERSION = 1;
const STORE_NAME = 'saves';

export interface SaveData {
  id: string;
  name: string;
  timestamp: number;
  gameData: any;
}

export class SaveManager {
  private db: IDBDatabase | null = null;

  constructor() {
    this.initDB();
  }

  /**
   * Инициализация IndexedDB
   */
  private async initDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('[SaveManager] Ошибка открытия БД');
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('[SaveManager] БД инициализирована');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };
    });
  }

  /**
   * Сохранение игры в IndexedDB
   */
  async save(gameData: any, name: string = 'Автосохранение'): Promise<string> {
    if (!this.db) {
      await this.initDB();
    }

    const saveData: SaveData = {
      id: `save_${Date.now()}`,
      name,
      timestamp: Date.now(),
      gameData,
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      const request = store.put(saveData);
      
      request.onsuccess = () => {
        console.log(`[SaveManager] Игра сохранена: ${name}`);
        eventBus.emit(GameEvent.GAME_SAVED, { save: saveData });
        resolve(saveData.id);
      };
      
      request.onerror = () => {
        console.error('[SaveManager] Ошибка сохранения');
        reject(request.error);
      };
    });
  }

  /**
   * Загрузка из IndexedDB по ID
   */
  async load(id: string): Promise<SaveData | null> {
    if (!this.db) {
      await this.initDB();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      
      const request = store.get(id);
      
      request.onsuccess = () => {
        const save = request.result as SaveData | undefined;
        if (save) {
          console.log(`[SaveManager] Игра загружена: ${save.name}`);
          eventBus.emit(GameEvent.GAME_LOADED, { save });
          resolve(save);
        } else {
          resolve(null);
        }
      };
      
      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * Получение списка всех сохранений
   */
  async listSaves(): Promise<SaveData[]> {
    if (!this.db) {
      await this.initDB();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      
      const request = store.getAll();
      
      request.onsuccess = () => {
        const saves = (request.result as SaveData[]).sort(
          (a, b) => b.timestamp - a.timestamp
        );
        resolve(saves);
      };
      
      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * Удаление сохранения
   */
  async delete(id: string): Promise<void> {
    if (!this.db) {
      await this.initDB();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      const request = store.delete(id);
      
      request.onsuccess = () => {
        console.log(`[SaveManager] Сохранение удалено: ${id}`);
        resolve();
      };
      
      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * Экспорт сохранения в JSON файл
   */
  exportSave(saveData: SaveData): void {
    const json = JSON.stringify(saveData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `civweb_save_${new Date(saveData.timestamp).toISOString().slice(0, 19)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.log('[SaveManager] Экспорт выполнен');
  }

  /**
   * Импорт сохранения из JSON файла
   */
  importSave(file: File): Promise<SaveData> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const saveData = JSON.parse(e.target?.result as string) as SaveData;
          
          // Валидация структуры
          if (!saveData.id || !saveData.gameData) {
            throw new Error('Неверный формат файла сохранения');
          }
          
          // Сохранение в БД
          await this.save(saveData.gameData, saveData.name);
          
          console.log('[SaveManager] Импорт выполнен');
          resolve(saveData);
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });
  }

  /**
   * Создание резервной копии текущего состояния
   */
  async createBackup(gameData: any): Promise<string> {
    const name = `Резервная копия ${new Date().toLocaleString()}`;
    return await this.save(gameData, name);
  }

  /**
   * Очистка всех сохранений
   */
  async clearAll(): Promise<void> {
    if (!this.db) {
      await this.initDB();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      const request = store.clear();
      
      request.onsuccess = () => {
        console.log('[SaveManager] Все сохранения удалены');
        resolve();
      };
      
      request.onerror = () => {
        reject(request.error);
      };
    });
  }
}

export const saveManager = new SaveManager();
