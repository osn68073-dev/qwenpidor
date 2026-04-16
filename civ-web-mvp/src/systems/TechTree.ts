/**
 * TechTree - система технологий и гражданских моделей
 * Два параллельных дерева исследований
 */

import { eventBus, GameEvent } from '../core/EventBus';

export enum TechType {
  // Технологии (Science)
  AGRICULTURE = 'agriculture',
  MINING = 'mining',
  ARCHERY = 'archery',
  SWORDSMANSHIP = 'swordsmanship',
  MASONRY = 'masonry',
  POTTERY = 'pottery',
  WRITING = 'writing',
  
  // Гражданские модели (Culture)
  CRAFTSMANSHIP = 'craftsmanship',
  FOREIGN_TRADE = 'foreign_trade',
  POLITICAL_PHILOSOPHY = 'political_philosophy',
  GAMES_RECREATION = 'games_recreation',
}

export interface TechData {
  id: TechType;
  name: string;
  description: string;
  cost: number;        // Стоимость в науке/культуре
  era: number;         // Эра (1=древняя, 2=античная, etc)
  prerequisites: TechType[];
  unlocks?: {
    units?: string[];
    buildings?: string[];
    improvements?: string[];
    abilities?: string[];
    districts?: string[];
  };
  isCivilic?: boolean; // true = гражданская модель, false = технология
}

export const TECH_TREE: Record<TechType, TechData> = {
  // ТЕХНОЛОГИИ
  [TechType.AGRICULTURE]: {
    id: TechType.AGRICULTURE,
    name: 'Земледелие',
    description: '+1 еда с ферм. Открывает доступ к амбарам.',
    cost: 6,
    era: 1,
    prerequisites: [],
    unlocks: { improvements: ['farm'], buildings: ['granary'] },
    isCivilic: false,
  },
  [TechType.MINING]: {
    id: TechType.MINING,
    name: 'Горное дело',
    description: '+1 производство с шахт. Открывает мастерские.',
    cost: 6,
    era: 1,
    prerequisites: [],
    unlocks: { improvements: ['mine'], buildings: ['workshop'] },
    isCivilic: false,
  },
  [TechType.POTTERY]: {
    id: TechType.POTTERY,
    name: 'Гончарство',
    description: '+1 золото с торговых путей.',
    cost: 8,
    era: 1,
    prerequisites: [TechType.AGRICULTURE],
    unlocks: { buildings: ['market'] },
    isCivilic: false,
  },
  [TechType.ARCHERY]: {
    id: TechType.ARCHERY,
    name: 'Стрельба из лука',
    description: 'Открывает лучников.',
    cost: 10,
    era: 1,
    prerequisites: [],
    unlocks: { units: ['archer'] },
    isCivilic: false,
  },
  [TechType.SWORDSMANSHIP]: {
    id: TechType.SWORDSMANSHIP,
    name: 'Владение мечом',
    description: 'Открывает мечников.',
    cost: 12,
    era: 1,
    prerequisites: [TechType.MINING],
    unlocks: { units: ['swordsman'] },
    isCivilic: false,
  },
  [TechType.MASONRY]: {
    id: TechType.MASONRY,
    name: 'Каменотёсное дело',
    description: '+1 культура от каменоломен. Укрепления +50% защиты.',
    cost: 10,
    era: 1,
    prerequisites: [TechType.MINING],
    unlocks: { improvements: ['quarry'] },
    isCivilic: false,
  },
  [TechType.WRITING]: {
    id: TechType.WRITING,
    name: 'Письменность',
    description: 'Открывает библиотеки. +1 наука от университетов.',
    cost: 15,
    era: 1,
    prerequisites: [TechType.POTTERY],
    unlocks: { buildings: ['library'] },
    isCivilic: false,
  },
  
  // ГРАЖДАНСКИЕ МОДЕЛИ
  [TechType.CRAFTSMANSHIP]: {
    id: TechType.CRAFTSMANSHIP,
    name: 'Ремесленное дело',
    description: '+1 производство от ремесленных зон.',
    cost: 5,
    era: 1,
    prerequisites: [],
    unlocks: { districts: ['industrial'] },
    isCivilic: true,
  },
  [TechType.FOREIGN_TRADE]: {
    id: TechType.FOREIGN_TRADE,
    name: 'Внешняя торговля',
    description: 'Открывает торговые пути. +2 золота за каждый путь.',
    cost: 7,
    era: 1,
    prerequisites: [],
    unlocks: { buildings: ['market'] },
    isCivilic: true,
  },
  [TechType.POLITICAL_PHILOSOPHY]: {
    id: TechType.POLITICAL_PHILOSOPHY,
    name: 'Политическая философия',
    description: 'Открывает правительства. +1 слот политики.',
    cost: 12,
    era: 1,
    prerequisites: [TechType.CRAFTSMANSHIP, TechType.FOREIGN_TRADE],
    unlocks: { abilities: ['government'] },
    isCivilic: true,
  },
  [TechType.GAMES_RECREATION]: {
    id: TechType.GAMES_RECREATION,
    name: 'Игры и отдых',
    description: '+1 культура от развлекательных комплексов.',
    cost: 10,
    era: 1,
    prerequisites: [TechType.FOREIGN_TRADE],
    unlocks: { districts: ['entertainment'] },
    isCivilic: true,
  },
};

export interface ResearchState {
  currentTech: TechType | null;
  progress: number;
  completedTechs: TechType[];
}

export class TechTreeSystem {
  private science: number = 0;
  private culture: number = 0;
  private research: ResearchState = {
    currentTech: null,
    progress: 0,
    completedTechs: [],
  };
  private civicResearch: ResearchState = {
    currentTech: null,
    progress: 0,
    completedTechs: [],
  };

  constructor() {
    // Подписка на получение науки и культуры
    eventBus.on('economy:science_added', (data) => {
      this.addScience(data.amount);
    });
    eventBus.on('economy:culture_added', (data) => {
      this.addCulture(data.amount);
    });
  }

  /**
   * Установка текущей технологии для исследования
   */
  setResearch(techId: TechType, isCivic: boolean = false): boolean {
    const tech = TECH_TREE[techId];
    if (!tech) return false;

    // Проверка доступности (все пререквизиты изучены)
    const prereqs = tech.prerequisites.every(prereq => 
      this.isResearched(prereq)
    );

    if (!prereqs) return false;

    if (isCivic) {
      this.civicResearch.currentTech = techId;
      this.civicResearch.progress = 0;
    } else {
      this.research.currentTech = techId;
      this.research.progress = 0;
    }

    eventBus.emit(GameEvent.TECH_RESEARCHED, { tech: techId, started: true });
    return true;
  }

  /**
   * Добавление науки
   */
  addScience(amount: number): void {
    this.science += amount;

    // Исследование текущей технологии
    if (this.research.currentTech) {
      const tech = TECH_TREE[this.research.currentTech];
      this.research.progress += amount;

      if (this.research.progress >= tech.cost) {
        this.completeResearch(false);
      }
    }
  }

  /**
   * Добавление культуры
   */
  addCulture(amount: number): void {
    this.culture += amount;

    // Исследование гражданской модели
    if (this.civicResearch.currentTech) {
      const tech = TECH_TREE[this.civicResearch.currentTech];
      this.civicResearch.progress += amount;

      if (this.civicResearch.progress >= tech.cost) {
        this.completeResearch(true);
      }
    }
  }

  /**
   * Завершение исследования
   */
  private completeResearch(isCivic: boolean): void {
    const state = isCivic ? this.civicResearch : this.research;
    if (!state.currentTech) return;

    state.completedTechs.push(state.currentTech);
    
    const tech = TECH_TREE[state.currentTech];
    console.log(`[TechTree] Изучено: ${tech.name}`);

    eventBus.emit(GameEvent.TECH_RESEARCHED, {
      tech: state.currentTech,
      completed: true,
      isCivic,
    });

    // Сброс прогресса
    state.currentTech = null;
    state.progress = 0;
  }

  /**
   * Проверка, изучена ли технология
   */
  isResearched(techId: TechType): boolean {
    return this.research.completedTechs.includes(techId) ||
           this.civicResearch.completedTechs.includes(techId);
  }

  /**
   * Получение доступных для исследования технологий
   */
  getAvailableTechs(isCivic: boolean = false): TechType[] {
    const state = isCivic ? this.civicResearch : this.research;
    const available: TechType[] = [];

    for (const tech of Object.values(TECH_TREE)) {
      if (tech.isCivilic !== isCivic) continue;
      if (state.completedTechs.includes(tech.id)) continue;

      const prereqsMet = tech.prerequisites.every(prereq => 
        this.isResearched(prereq)
      );

      if (prereqsMet) {
        available.push(tech.id);
      }
    }

    return available;
  }

  /**
   * Получение текущего состояния
   */
  getState(): { science: number; culture: number; tech: TechType | null; civic: TechType | null } {
    return {
      science: this.science,
      culture: this.culture,
      tech: this.research.currentTech,
      civic: this.civicResearch.currentTech,
    };
  }

  /**
   * Сериализация
   */
  serialize(): object {
    return {
      science: this.science,
      culture: this.culture,
      research: { ...this.research },
      civicResearch: { ...this.civicResearch },
    };
  }

  /**
   * Десериализация
   */
  deserialize(data: any): void {
    this.science = data.science;
    this.culture = data.culture;
    this.research = { ...data.research };
    this.civicResearch = { ...data.civicResearch };
  }
}

export const techTreeSystem = new TechTreeSystem();
