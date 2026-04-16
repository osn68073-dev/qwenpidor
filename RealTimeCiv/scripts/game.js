// Real-Time Civilization Game Engine
// Полная переработка с ИИ, управлением юнитами и современной графикой

class Game {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.minimapCanvas = document.getElementById('minimap');
        this.minimapCtx = this.minimapCanvas.getContext('2d');

        this.mapWidth = 60;
        this.mapHeight = 60;
        this.tileSize = 48;
        this.cameraX = 0;
        this.cameraY = 0;
        this.isDragging = false;
        this.lastMouseX = 0;
        this.lastMouseY = 0;
        this.selectedUnit = null;
        this.hoveredTile = null;
        
        // Ассеты (эмодзи)
        this.assets = {
            terrain: {
                plains: '🌾',
                forest: '🌲',
                mountains: '🏔️',
                desert: '🏜️',
                water: '🌊'
            },
            units: {
                warrior: '⚔️',
                archer: '🏹',
                cavalry: '🐴',
                settler: '🏗️'
            },
            city: '🏰',
            resources: {
                wheat: '🌾',
                gold: '💰',
                stone: '🪨',
                horse: '🐎'
            }
        };

        // Типы местности
        this.terrainTypes = {
            plains: { color: '#7cb342', color2: '#8bc34a', name: 'Равнина', defense: 0, movement: 1 },
            forest: { color: '#2d5a27', color2: '#388e3c', name: 'Лес', defense: 1, movement: 2 },
            mountains: { color: '#5d4037', color2: '#795548', name: 'Горы', defense: 3, movement: 3, impassable: true },
            desert: { color: '#d4c685', color2: '#e6c896', name: 'Пустыня', defense: 0, movement: 1 },
            water: { color: '#1976d2', color2: '#2196f3', name: 'Вода', defense: 0, movement: 3, impassable: true }
        };

        // Ресурсы игрока
        this.resources = {
            food: 300,
            gold: 200,
            science: 0,
            culture: 0
        };

        this.resourceRates = {
            food: 5,
            gold: 3,
            science: 0,
            culture: 0
        };

        // Города и юниты
        this.cities = [];
        this.units = [];
        this.enemyUnits = [];
        this.enemyCities = [];
        this.civilizations = [];

        // Технологии
        this.techs = [
            { id: 'agriculture', name: 'Земледелие', cost: 150, progress: 0, researched: false, bonus: '+2 еды' },
            { id: 'mining', name: 'Добыча руды', cost: 150, progress: 0, researched: false, bonus: '+2 золота' },
            { id: 'writing', name: 'Письменность', cost: 200, progress: 0, researched: false, bonus: '+1 наука' },
            { id: 'bronze', name: 'Бронза', cost: 250, progress: 0, researched: false, bonus: '+2 к атаке' },
            { id: 'math', name: 'Математика', cost: 300, progress: 0, researched: false, bonus: '+10% науки' }
        ];

        // Цивилизации
        this.civsData = [
            { name: 'Рим', flag: '🏛️', color: '#c62828', aggression: 0.7 },
            { name: 'Галлия', flag: '🛡️', color: '#1976d2', aggression: 0.5 },
            { name: 'Египет', flag: '👁️', color: '#fbc02d', aggression: 0.6 }
        ];

        // Состояние игры
        this.gameRunning = false;
        this.lastTime = 0;
        this.particles = [];

        this.init();
    }

    init() {
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        
        // Генерация карты
        this.generateMap();
        
        // Создание начального города
        this.createPlayerCity(25, 25);
        
        // Создание начального юнита
        this.createUnit(26, 25, 'warrior', 'player');
        
        // Создание вражеских цивилизаций
        this.createEnemyCivs();
        
        // Настройка управления
        this.setupControls();
        
        // Запуск игрового цикла
        this.gameRunning = true;
        requestAnimationFrame((t) => this.gameLoop(t));
    }

    resizeCanvas() {
        const container = document.getElementById('main-view');
        this.canvas.width = container.clientWidth;
        this.canvas.height = container.clientHeight;
        
        // Центрирование камеры
        this.cameraX = (this.mapWidth * this.tileSize - this.canvas.width) / 2;
        this.cameraY = (this.mapHeight * this.tileSize - this.canvas.height) / 2;
    }

    generateMap() {
        this.map = [];
        for (let y = 0; y < this.mapHeight; y++) {
            this.map[y] = [];
            for (let x = 0; x < this.mapWidth; x++) {
                const rand = Math.random();
                let terrain;
                
                if (rand < 0.15) terrain = 'water';
                else if (rand < 0.25) terrain = 'mountains';
                else if (rand < 0.40) terrain = 'forest';
                else if (rand < 0.55) terrain = 'desert';
                else terrain = 'plains';
                
                this.map[y][x] = {
                    terrain: terrain,
                    resource: null,
                    owner: null,
                    city: null
                };
                
                // Добавление ресурсов
                if (Math.random() < 0.08 && terrain !== 'water' && terrain !== 'mountains') {
                    const resRand = Math.random();
                    if (resRand < 0.4) this.map[y][x].resource = 'wheat';
                    else if (resRand < 0.6) this.map[y][x].resource = 'gold';
                    else if (resRand < 0.8) this.map[y][x].resource = 'stone';
                    else this.map[y][x].resource = 'horse';
                }
            }
        }
        
        // Сглаживание карты
        this.smoothMap();
    }

    smoothMap() {
        // Упрощенное сглаживание
        for (let i = 0; i < 3; i++) {
            const newMap = JSON.parse(JSON.stringify(this.map));
            for (let y = 1; y < this.mapHeight - 1; y++) {
                for (let x = 1; x < this.mapWidth - 1; x++) {
                    const neighbors = [
                        this.map[y-1][x].terrain,
                        this.map[y+1][x].terrain,
                        this.map[y][x-1].terrain,
                        this.map[y][x+1].terrain
                    ];
                    
                    const counts = {};
                    neighbors.forEach(t => counts[t] = (counts[t] || 0) + 1);
                    
                    let maxCount = 0;
                    let maxTerrain = this.map[y][x].terrain;
                    for (const t in counts) {
                        if (counts[t] > maxCount) {
                            maxCount = counts[t];
                            maxTerrain = t;
                        }
                    }
                    
                    if (maxCount >= 3) {
                        newMap[y][x].terrain = maxTerrain;
                    }
                }
            }
            this.map = newMap;
        }
    }

    createPlayerCity(x, y) {
        const city = {
            x: x,
            y: y,
            name: 'Столица',
            population: 4,
            health: 100,
            maxHealth: 100,
            production: 0,
            producing: null,
            owner: 'player',
            radius: 3
        };
        
        this.cities.push(city);
        this.map[y][x].city = city;
        this.map[y][x].owner = 'player';
        
        // Заявка на территорию
        for (let dy = -city.radius; dy <= city.radius; dy++) {
            for (let dx = -city.radius; dx <= city.radius; dx++) {
                const nx = x + dx;
                const ny = y + dy;
                if (nx >= 0 && nx < this.mapWidth && ny >= 0 && ny < this.mapHeight) {
                    if (dx*dx + dy*dy <= city.radius * city.radius) {
                        this.map[ny][nx].owner = 'player';
                    }
                }
            }
        }
        
        this.updateResourceRates();
        this.showNotification(`Основан город: ${city.name}`);
    }

    createEnemyCity(x, y, civ) {
        const city = {
            x: x,
            y: y,
            name: `${civ.name} City`,
            population: 3,
            health: 100,
            maxHealth: 100,
            production: 0,
            producing: null,
            owner: civ.name,
            radius: 3
        };
        
        this.enemyCities.push(city);
        this.map[y][x].city = city;
        this.map[y][x].owner = civ.name;
        
        // Заявка на территорию
        for (let dy = -city.radius; dy <= city.radius; dy++) {
            for (let dx = -city.radius; dx <= city.radius; dx++) {
                const nx = x + dx;
                const ny = y + dy;
                if (nx >= 0 && nx < this.mapWidth && ny >= 0 && ny < this.mapHeight) {
                    if (dx*dx + dy*dy <= city.radius * city.radius) {
                        this.map[ny][nx].owner = civ.name;
                    }
                }
            }
        }
    }

    createUnit(x, y, type, owner, targetX = null, targetY = null) {
        const unitStats = {
            warrior: { hp: 100, attack: 15, defense: 8, speed: 0.03, symbol: '⚔️' },
            archer: { hp: 80, attack: 20, defense: 5, speed: 0.035, symbol: '🏹' },
            cavalry: { hp: 120, attack: 18, defense: 6, speed: 0.05, symbol: '🐴' },
            settler: { hp: 50, attack: 0, defense: 2, speed: 0.02, symbol: '🏗️' }
        };
        
        const stats = unitStats[type];
        const unit = {
            x: x,
            y: y,
            pixelX: x * this.tileSize,
            pixelY: y * this.tileSize,
            type: type,
            owner: owner,
            hp: stats.hp,
            maxHp: stats.hp,
            attack: stats.attack,
            defense: stats.defense,
            speed: stats.speed,
            symbol: stats.symbol,
            targetX: targetX,
            targetY: targetY,
            moving: targetX !== null,
            state: 'idle',
            attackTarget: null
        };
        
        if (owner === 'player') {
            this.units.push(unit);
        } else {
            this.enemyUnits.push(unit);
        }
        
        return unit;
    }

    createEnemyCivs() {
        const positions = [
            { x: 10, y: 10 },
            { x: 50, y: 10 },
            { x: 30, y: 50 }
        ];
        
        this.civsData.forEach((civ, index) => {
            const pos = positions[index];
            
            // Проверка дистанции от игрока
            const distToPlayer = Math.sqrt(Math.pow(pos.x - 25, 2) + Math.pow(pos.y - 25, 2));
            if (distToPlayer < 15) {
                pos.x += 15;
                pos.y += 15;
            }
            
            this.civilizations.push({
                ...civ,
                cities: [],
                units: [],
                techs: [],
                relation: 0
            });
            
            this.createEnemyCity(pos.x, pos.y, civ);
            this.civilizations[index].cities.push(this.enemyCities[this.enemyCities.length - 1]);
            
            // Создание начальных юнитов
            this.createUnit(pos.x + 1, pos.y, 'warrior', civ.name);
            this.createUnit(pos.x - 1, pos.y, 'archer', civ.name);
        });
        
        this.updateCivsList();
    }

    setupControls() {
        // Перетаскивание камеры
        this.canvas.addEventListener('mousedown', (e) => {
            if (e.button === 0) { // ЛКМ
                this.isDragging = true;
                this.lastMouseX = e.clientX;
                this.lastMouseY = e.clientY;
            } else if (e.button === 2) { // ПКМ
                e.preventDefault();
                this.handleRightClick(e);
            }
        });

        this.canvas.addEventListener('mousemove', (e) => {
            if (this.isDragging) {
                const dx = e.clientX - this.lastMouseX;
                const dy = e.clientY - this.lastMouseY;
                this.cameraX -= dx;
                this.cameraY -= dy;
                this.lastMouseX = e.clientX;
                this.lastMouseY = e.clientY;
                
                // Ограничение камеры
                this.cameraX = Math.max(0, Math.min(this.cameraX, this.mapWidth * this.tileSize - this.canvas.width));
                this.cameraY = Math.max(0, Math.min(this.cameraY, this.mapHeight * this.tileSize - this.canvas.height));
            }
            
            // Вычисление hovered tile
            const rect = this.canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left + this.cameraX;
            const mouseY = e.clientY - rect.top + this.cameraY;
            const tileX = Math.floor(mouseX / this.tileSize);
            const tileY = Math.floor(mouseY / this.tileSize);
            
            if (tileX >= 0 && tileX < this.mapWidth && tileY >= 0 && tileY < this.mapHeight) {
                this.hoveredTile = { x: tileX, y: tileY };
            } else {
                this.hoveredTile = null;
            }
        });

        this.canvas.addEventListener('mouseup', () => {
            this.isDragging = false;
        });

        this.canvas.addEventListener('mouseleave', () => {
            this.isDragging = false;
        });

        // Отключение контекстного меню
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

        // Клик для выбора юнита
        this.canvas.addEventListener('click', (e) => {
            if (!this.isDragging) {
                const rect = this.canvas.getBoundingClientRect();
                const mouseX = e.clientX - rect.left + this.cameraX;
                const mouseY = e.clientY - rect.top + this.cameraY;
                const tileX = Math.floor(mouseX / this.tileSize);
                const tileY = Math.floor(mouseY / this.tileSize);
                
                // Поиск юнита в клетке
                const clickedUnit = this.units.find(u => 
                    Math.round(u.x) === tileX && Math.round(u.y) === tileY
                );
                
                if (clickedUnit) {
                    this.selectUnit(clickedUnit);
                } else {
                    this.deselectUnit();
                }
            }
        });
    }

    handleRightClick(e) {
        if (!this.selectedUnit) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left + this.cameraX;
        const mouseY = e.clientY - rect.top + this.cameraY;
        const tileX = Math.floor(mouseX / this.tileSize);
        const tileY = Math.floor(mouseY / this.tileSize);
        
        if (tileX < 0 || tileX >= this.mapWidth || tileY < 0 || tileY >= this.mapHeight) return;
        
        const terrain = this.map[tileY][tileX].terrain;
        if (this.terrainTypes[terrain].impassable) {
            this.showNotification('Нельзя пройти через эту местность!');
            return;
        }
        
        // Проверка на вражеский юнит
        const enemyUnit = this.enemyUnits.find(u => 
            Math.round(u.x) === tileX && Math.round(u.y) === tileY
        );
        
        if (enemyUnit) {
            // Атака
            this.selectedUnit.attackTarget = enemyUnit;
            this.selectedUnit.targetX = tileX;
            this.selectedUnit.targetY = tileY;
            this.selectedUnit.moving = true;
            this.selectedUnit.state = 'attacking';
            this.showNotification('Атака!');
        } else {
            // Движение
            this.selectedUnit.targetX = tileX;
            this.selectedUnit.targetY = tileY;
            this.selectedUnit.moving = true;
            this.selectedUnit.state = 'moving';
            this.selectedUnit.attackTarget = null;
        }
    }

    selectUnit(unit) {
        this.selectedUnit = unit;
        document.getElementById('unit-info').classList.add('active');
        this.updateUnitInfo();
    }

    deselectUnit() {
        this.selectedUnit = null;
        document.getElementById('unit-info').classList.remove('active');
    }

    updateUnitInfo() {
        if (!this.selectedUnit) return;
        
        const unit = this.selectedUnit;
        document.getElementById('unit-name').textContent = 
            `${unit.symbol} ${unit.type.charAt(0).toUpperCase() + unit.type.slice(1)}`;
        document.getElementById('unit-hp').textContent = `${Math.round(unit.hp)}/${unit.maxHp}`;
        document.getElementById('unit-atk').textContent = unit.attack;
        document.getElementById('unit-def').textContent = unit.defense;
    }

    updateResourceRates() {
        let food = 2, gold = 1, science = 0, culture = 0;
        
        this.cities.forEach(city => {
            food += city.population;
            gold += Math.floor(city.population / 2);
            
            // Бонусы от ресурсов
            for (let dy = -city.radius; dy <= city.radius; dy++) {
                for (let dx = -city.radius; dx <= city.radius; dx++) {
                    const nx = city.x + dx;
                    const ny = city.y + dy;
                    if (nx >= 0 && nx < this.mapWidth && ny >= 0 && ny < this.mapHeight) {
                        const tile = this.map[ny][nx];
                        if (tile.owner === 'player' && tile.resource) {
                            if (tile.resource === 'wheat') food += 2;
                            if (tile.resource === 'gold') gold += 2;
                            if (tile.resource === 'stone') science += 1;
                            if (tile.resource === 'horse') culture += 1;
                        }
                    }
                }
            }
        });
        
        // Бонусы от технологий
        if (this.techs.find(t => t.id === 'agriculture' && t.researched)) food += 2;
        if (this.techs.find(t => t.id === 'mining' && t.researched)) gold += 2;
        if (this.techs.find(t => t.id === 'writing' && t.researched)) science += 1;
        
        this.resourceRates = { food, gold, science, culture };
    }

    gameLoop(timestamp) {
        if (!this.gameRunning) return;
        
        const deltaTime = timestamp - this.lastTime;
        this.lastTime = timestamp;
        
        this.update(deltaTime);
        this.render();
        this.renderMinimap();
        this.updateUI();
        
        requestAnimationFrame((t) => this.gameLoop(t));
    }

    update(deltaTime) {
        // Обновление ресурсов
        if (deltaTime > 0) {
            this.resources.food += this.resourceRates.food * (deltaTime / 1000);
            this.resources.gold += this.resourceRates.gold * (deltaTime / 1000);
            this.resources.science += this.resourceRates.science * (deltaTime / 1000);
            this.resources.culture += this.resourceRates.culture * (deltaTime / 1000);
            
            // Исследование технологий
            this.techs.forEach(tech => {
                if (!tech.researched && this.resources.science > 0) {
                    tech.progress += this.resourceRates.science * (deltaTime / 1000);
                    if (tech.progress >= tech.cost) {
                        tech.researched = true;
                        this.showNotification(`Исследовано: ${tech.name}!`);
                        this.updateResourceRates();
                    }
                }
            });
        }
        
        // Обновление юнитов
        this.updateUnits(deltaTime);
        this.updateEnemyUnits(deltaTime);
        
        // Обновление городов
        this.updateCities(deltaTime);
        this.updateEnemyCities(deltaTime);
        
        // Обновление частиц
        this.updateParticles(deltaTime);
        
        // ИИ цивилизаций
        this.updateAI(deltaTime);
    }

    updateUnits(deltaTime) {
        this.units.forEach(unit => {
            if (unit.moving && unit.targetX !== null) {
                const dx = unit.targetX - unit.x;
                const dy = unit.targetY - unit.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist < 0.1) {
                    unit.x = unit.targetX;
                    unit.y = unit.targetY;
                    unit.pixelX = unit.x * this.tileSize;
                    unit.pixelY = unit.y * this.tileSize;
                    unit.moving = false;
                    unit.state = 'idle';
                    
                    // Если это была атака
                    if (unit.attackTarget) {
                        this.resolveCombat(unit, unit.attackTarget);
                        unit.attackTarget = null;
                    }
                } else {
                    const moveSpeed = unit.speed * (deltaTime / 16);
                    unit.x += (dx / dist) * moveSpeed;
                    unit.y += (dy / dist) * moveSpeed;
                    unit.pixelX = unit.x * this.tileSize;
                    unit.pixelY = unit.y * this.tileSize;
                }
            }
        });
    }

    updateEnemyUnits(deltaTime) {
        this.enemyUnits.forEach(unit => {
            if (unit.moving && unit.targetX !== null) {
                const dx = unit.targetX - unit.x;
                const dy = unit.targetY - unit.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist < 0.1) {
                    unit.x = unit.targetX;
                    unit.y = unit.targetY;
                    unit.pixelX = unit.x * this.tileSize;
                    unit.pixelY = unit.y * this.tileSize;
                    unit.moving = false;
                    unit.state = 'idle';
                    
                    if (unit.attackTarget) {
                        this.resolveCombat(unit, unit.attackTarget);
                        unit.attackTarget = null;
                    }
                } else {
                    const moveSpeed = unit.speed * (deltaTime / 16);
                    unit.x += (dx / dist) * moveSpeed;
                    unit.y += (dy / dist) * moveSpeed;
                    unit.pixelX = unit.x * this.tileSize;
                    unit.pixelY = unit.y * this.tileSize;
                }
            }
        });
    }

    resolveCombat(attacker, defender) {
        const damage = Math.max(1, attacker.attack - defender.defense / 2);
        defender.hp -= damage;
        
        // Эффект удара
        this.createParticle(defender.x * this.tileSize, defender.y * this.tileSize, '💥');
        
        if (defender.hp <= 0) {
            this.showNotification(`${attacker.type} уничтожил ${defender.type}!`);
            
            // Удаление юнита
            if (defender.owner === 'player') {
                const idx = this.units.indexOf(defender);
                if (idx > -1) this.units.splice(idx, 1);
                if (this.selectedUnit === defender) this.deselectUnit();
            } else {
                const idx = this.enemyUnits.indexOf(defender);
                if (idx > -1) this.enemyUnits.splice(idx, 1);
            }
        }
    }

    updateCities(deltaTime) {
        this.cities.forEach(city => {
            // Рост населения
            if (this.resources.food >= city.population * 20) {
                this.resources.food -= city.population * 20;
                city.population++;
                this.updateResourceRates();
            }
            
            // Производство
            if (city.producing) {
                city.production += 2 * (deltaTime / 1000);
                
                const costs = { warrior: 50, archer: 80, cavalry: 120 };
                if (city.production >= costs[city.producing]) {
                    this.createUnit(city.x + 1, city.y, city.producing, 'player');
                    city.production = 0;
                    city.producing = null;
                    this.showNotification(`Юнит создан: ${city.producing}`);
                }
            }
        });
    }

    updateEnemyCities(deltaTime) {
        this.enemyCities.forEach(city => {
            if (this.resources.food >= city.population * 20) {
                city.population++;
            }
            
            if (city.producing) {
                city.production += 2 * (deltaTime / 1000);
                
                const costs = { warrior: 50, archer: 80, cavalry: 120 };
                if (city.production >= costs[city.producing]) {
                    this.createUnit(city.x + 1, city.y, city.producing, city.owner);
                    city.production = 0;
                    city.producing = null;
                }
            }
        });
    }

    updateAI(deltaTime) {
        // Простой ИИ для каждой цивилизации
        this.civilizations.forEach((civ, civIndex) => {
            const civUnits = this.enemyUnits.filter(u => u.owner === civ.name);
            const civCities = this.enemyCities.filter(c => c.owner === civ.name);
            
            // Производство юнитов
            civCities.forEach(city => {
                if (!city.producing && Math.random() < 0.01) {
                    const unitTypes = ['warrior', 'warrior', 'archer', 'cavalry'];
                    city.producing = unitTypes[Math.floor(Math.random() * unitTypes.length)];
                }
            });
            
            // Движение юнитов
            civUnits.forEach(unit => {
                if (!unit.moving && Math.random() < 0.02) {
                    // Поиск цели
                    const playerUnits = this.units.filter(u => !u.moving);
                    const playerCities = this.cities;
                    
                    let targetX, targetY;
                    
                    if (playerUnits.length > 0 && Math.random() < civ.aggression) {
                        // Атака ближайшего юнита
                        const nearest = playerUnits.reduce((nearest, u) => {
                            const dist = Math.sqrt(Math.pow(u.x - unit.x, 2) + Math.pow(u.y - unit.y, 2));
                            return dist < nearest.dist ? { unit: u, dist } : nearest;
                        }, { unit: null, dist: Infinity });
                        
                        if (nearest.unit && nearest.dist < 20) {
                            targetX = nearest.unit.x;
                            targetY = nearest.unit.y;
                            unit.attackTarget = nearest.unit;
                        }
                    }
                    
                    if (!targetX && playerCities.length > 0 && Math.random() < civ.aggression * 0.5) {
                        // Атака города
                        const nearest = playerCities.reduce((nearest, c) => {
                            const dist = Math.sqrt(Math.pow(c.x - unit.x, 2) + Math.pow(c.y - unit.y, 2));
                            return dist < nearest.dist ? { city: c, dist } : nearest;
                        }, { city: null, dist: Infinity });
                        
                        if (nearest.city && nearest.dist < 25) {
                            targetX = nearest.city.x;
                            targetY = nearest.city.y;
                        }
                    }
                    
                    if (!targetX) {
                        // Случайное движение
                        targetX = Math.max(0, Math.min(this.mapWidth - 1, unit.x + (Math.random() - 0.5) * 10));
                        targetY = Math.max(0, Math.min(this.mapHeight - 1, unit.y + (Math.random() - 0.5) * 10));
                    }
                    
                    const terrain = this.map[Math.floor(targetY)][Math.floor(targetX)].terrain;
                    if (!this.terrainTypes[terrain].impassable) {
                        unit.targetX = targetX;
                        unit.targetY = targetY;
                        unit.moving = true;
                    }
                }
            });
        });
    }

    createParticle(x, y, symbol) {
        this.particles.push({
            x: x,
            y: y,
            symbol: symbol,
            life: 1.0,
            vy: -2
        });
    }

    updateParticles(deltaTime) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.life -= deltaTime / 1000;
            p.y += p.vy * (deltaTime / 16);
            
            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    render() {
        const ctx = this.ctx;
        
        // Очистка
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Рендеринг карты
        const startX = Math.floor(this.cameraX / this.tileSize);
        const startY = Math.floor(this.cameraY / this.tileSize);
        const endX = Math.min(this.mapWidth, startX + Math.ceil(this.canvas.width / this.tileSize) + 1);
        const endY = Math.min(this.mapHeight, startY + Math.ceil(this.canvas.height / this.tileSize) + 1);
        
        for (let y = startY; y < endY; y++) {
            for (let x = startX; x < endX; x++) {
                const tile = this.map[y][x];
                const screenX = x * this.tileSize - this.cameraX;
                const screenY = y * this.tileSize - this.cameraY;
                
                // Базовый цвет местности
                const terrain = this.terrainTypes[tile.terrain];
                const gradient = ctx.createLinearGradient(screenX, screenY, screenX + this.tileSize, screenY + this.tileSize);
                gradient.addColorStop(0, terrain.color);
                gradient.addColorStop(1, terrain.color2);
                ctx.fillStyle = gradient;
                ctx.fillRect(screenX, screenY, this.tileSize, this.tileSize);
                
                // Границы
                ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
                ctx.lineWidth = 1;
                ctx.strokeRect(screenX, screenY, this.tileSize, this.tileSize);
                
                // Владелец
                if (tile.owner === 'player') {
                    ctx.fillStyle = 'rgba(74, 158, 255, 0.2)';
                    ctx.fillRect(screenX, screenY, this.tileSize, this.tileSize);
                }
                
                // Ресурсы
                if (tile.resource) {
                    ctx.font = '20px Arial';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    const resSymbol = this.assets.resources[tile.resource];
                    ctx.fillText(resSymbol, screenX + this.tileSize / 2, screenY + this.tileSize / 2);
                }
                
                // Город
                if (tile.city) {
                    ctx.font = '32px Arial';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
                    ctx.shadowBlur = 10;
                    ctx.fillText(this.assets.city, screenX + this.tileSize / 2, screenY + this.tileSize / 2);
                    ctx.shadowBlur = 0;
                    
                    // Полоска здоровья города
                    const hpPercent = tile.city.health / tile.city.maxHealth;
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
                    ctx.fillRect(screenX + 4, screenY + this.tileSize - 8, this.tileSize - 8, 4);
                    ctx.fillStyle = hpPercent > 0.5 ? '#4caf50' : '#f44336';
                    ctx.fillRect(screenX + 4, screenY + this.tileSize - 8, (this.tileSize - 8) * hpPercent, 4);
                }
                
                // Hover эффект
                if (this.hoveredTile && this.hoveredTile.x === x && this.hoveredTile.y === y) {
                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
                    ctx.lineWidth = 2;
                    ctx.strokeRect(screenX + 2, screenY + 2, this.tileSize - 4, this.tileSize - 4);
                }
            }
        }
        
        // Рендеринг юнитов
        [...this.units, ...this.enemyUnits].forEach(unit => {
            const screenX = unit.pixelX - this.cameraX;
            const screenY = unit.pixelY - this.cameraY;
            
            // Тень
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.beginPath();
            ctx.ellipse(screenX + this.tileSize / 2, screenY + this.tileSize - 8, 12, 6, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // Юнит
            ctx.font = '32px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
            ctx.shadowBlur = 8;
            
            // Подсветка выбранного юнита
            if (unit === this.selectedUnit) {
                ctx.shadowColor = '#4a9eff';
                ctx.shadowBlur = 20;
                
                // Кольцо выделения
                ctx.strokeStyle = '#4a9eff';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(screenX + this.tileSize / 2, screenY + this.tileSize / 2, this.tileSize / 2 - 4, 0, Math.PI * 2);
                ctx.stroke();
            }
            
            ctx.fillText(unit.symbol, screenX + this.tileSize / 2, screenY + this.tileSize / 2);
            ctx.shadowBlur = 0;
            
            // Полоска здоровья
            const hpPercent = unit.hp / unit.maxHp;
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(screenX + 4, screenY - 4, this.tileSize - 8, 4);
            ctx.fillStyle = hpPercent > 0.5 ? '#4caf50' : hpPercent > 0.25 ? '#ff9800' : '#f44336';
            ctx.fillRect(screenX + 4, screenY - 4, (this.tileSize - 8) * hpPercent, 4);
            
            // Индикатор движения
            if (unit.moving) {
                ctx.fillStyle = '#4a9eff';
                ctx.beginPath();
                ctx.arc(screenX + this.tileSize / 2, screenY + this.tileSize / 2, 4, 0, Math.PI * 2);
                ctx.fill();
            }
        });
        
        // Рендеринг частиц
        this.particles.forEach(p => {
            const screenX = p.x - this.cameraX;
            const screenY = p.y - this.cameraY;
            
            ctx.globalAlpha = p.life;
            ctx.font = '24px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(p.symbol, screenX, screenY);
            ctx.globalAlpha = 1;
        });
    }

    renderMinimap() {
        const ctx = this.minimapCtx;
        const scale = 200 / Math.max(this.mapWidth, this.mapHeight);
        
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, 200, 200);
        
        // Рендеринг местности
        for (let y = 0; y < this.mapHeight; y++) {
            for (let x = 0; x < this.mapWidth; x++) {
                const terrain = this.terrainTypes[this.map[y][x].terrain];
                ctx.fillStyle = terrain.color;
                ctx.fillRect(x * scale, y * scale, scale, scale);
            }
        }
        
        // Города
        [...this.cities, ...this.enemyCities].forEach(city => {
            ctx.fillStyle = city.owner === 'player' ? '#4a9eff' : '#f44336';
            ctx.fillRect(city.x * scale - 2, city.y * scale - 2, 6, 6);
        });
        
        // Юниты
        this.units.forEach(unit => {
            ctx.fillStyle = '#4a9eff';
            ctx.beginPath();
            ctx.arc(unit.x * scale, unit.y * scale, 2, 0, Math.PI * 2);
            ctx.fill();
        });
        
        this.enemyUnits.forEach(unit => {
            ctx.fillStyle = '#f44336';
            ctx.beginPath();
            ctx.arc(unit.x * scale, unit.y * scale, 2, 0, Math.PI * 2);
            ctx.fill();
        });
        
        // Камера
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.strokeRect(
            this.cameraX * scale / this.tileSize,
            this.cameraY * scale / this.tileSize,
            this.canvas.width * scale / this.tileSize,
            this.canvas.height * scale / this.tileSize
        );
    }

    updateUI() {
        // Ресурсы
        document.getElementById('food').textContent = Math.floor(this.resources.food);
        document.getElementById('gold').textContent = Math.floor(this.resources.gold);
        document.getElementById('science').textContent = Math.floor(this.resources.science);
        document.getElementById('culture').textContent = Math.floor(this.resources.culture);
        
        // Города
        const citiesList = document.getElementById('cities-list');
        citiesList.innerHTML = '';
        this.cities.forEach(city => {
            const div = document.createElement('div');
            div.className = 'civ-item';
            div.innerHTML = `
                <span class="civ-flag">🏰</span>
                <div class="civ-info">
                    <div class="civ-name">${city.name}</div>
                    <div class="civ-status">Население: ${city.population}</div>
                </div>
            `;
            citiesList.appendChild(div);
        });
        
        // Технологии
        const techList = document.getElementById('tech-list');
        techList.innerHTML = '';
        this.techs.forEach(tech => {
            const div = document.createElement('div');
            div.style.marginBottom = '8px';
            
            const percent = tech.researched ? 100 : Math.min(100, (tech.progress / tech.cost) * 100);
            
            div.innerHTML = `
                <div style="display: flex; justify-content: space-between; font-size: 12px;">
                    <span>${tech.name} ${tech.researched ? '✅' : ''}</span>
                    <span>${tech.researched ? 'Изучено' : Math.floor(percent) + '%'}</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${percent}%"></div>
                </div>
            `;
            techList.appendChild(div);
        });
        
        // Кнопки
        document.getElementById('btn-found-city').disabled = this.resources.gold < 100;
        document.getElementById('btn-train-warrior').disabled = this.resources.gold < 50 || this.resources.food < 10;
        document.getElementById('btn-train-archer').disabled = this.resources.gold < 80 || this.resources.food < 15;
        document.getElementById('btn-train-cavalry').disabled = this.resources.gold < 120 || this.resources.food < 20;
        
        // Информация о юните
        if (this.selectedUnit) {
            this.updateUnitInfo();
        }
    }

    updateCivsList() {
        const civsList = document.getElementById('civs-list');
        civsList.innerHTML = '';
        
        this.civilizations.forEach(civ => {
            const div = document.createElement('div');
            div.className = 'civ-item';
            div.innerHTML = `
                <span class="civ-flag">${civ.flag}</span>
                <div class="civ-info">
                    <div class="civ-name">${civ.name}</div>
                    <div class="civ-status hostile">⚔️ Враг</div>
                </div>
            `;
            civsList.appendChild(div);
        });
        
        // Добавить игрока
        const playerDiv = document.createElement('div');
        playerDiv.className = 'civ-item';
        playerDiv.innerHTML = `
            <span class="civ-flag">🎮</span>
            <div class="civ-info">
                <div class="civ-name">Вы</div>
                <div class="civ-status friendly">Игрок</div>
            </div>
        `;
        civsList.appendChild(playerDiv);
    }

    showNotification(message) {
        const container = document.getElementById('notifications');
        const div = document.createElement('div');
        div.className = 'notification';
        div.textContent = message;
        container.appendChild(div);
        
        setTimeout(() => {
            div.style.opacity = '0';
            div.style.transition = 'opacity 0.3s';
            setTimeout(() => div.remove(), 300);
        }, 3000);
    }
}

// Глобальные функции
let game = null;

function startGame() {
    document.getElementById('main-menu').style.display = 'none';
    document.getElementById('game-container').style.display = 'flex';
    
    game = new Game();
}

function foundCity() {
    if (!game || game.resources.gold < 100) return;
    
    // Найти свободного юнита-поселенца или создать нового
    const settlers = game.units.filter(u => u.type === 'settler' && !u.moving);
    
    if (settlers.length > 0) {
        const settler = settlers[0];
        game.resources.gold -= 100;
        game.createPlayerCity(Math.round(settler.x), Math.round(settler.y));
        
        // Удалить поселенца
        const idx = game.units.indexOf(settler);
        if (idx > -1) game.units.splice(idx, 1);
        if (game.selectedUnit === settler) game.deselectUnit();
    } else {
        game.showNotification('Нужен поселенец!');
    }
}

function trainUnit(type) {
    if (!game) return;
    
    const costs = {
        warrior: { gold: 50, food: 10 },
        archer: { gold: 80, food: 15 },
        cavalry: { gold: 120, food: 20 }
    };
    
    const cost = costs[type];
    if (game.resources.gold >= cost.gold && game.resources.food >= cost.food) {
        game.resources.gold -= cost.gold;
        game.resources.food -= cost.food;
        
        // Найти город для производства
        const city = game.cities[0];
        if (city) {
            city.producing = type;
            city.production = 0;
            game.showNotification(`Производство: ${type}`);
        }
    }
}
