class Game {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.minimap = document.getElementById('minimap');
        this.minimapCtx = this.minimap.getContext('2d');
        
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        
        // Игровые ресурсы
        this.resources = {
            food: 200,
            gold: 150,
            science: 0,
            culture: 0
        };
        
        // Игровые объекты
        this.cities = [];
        this.units = [];
        this.tiles = [];
        this.techs = [];
        this.currentTech = null;
        this.techProgress = 0;
        
        // Настройки карты
        this.tileSize = 40;
        this.mapWidth = Math.floor(this.canvas.width / this.tileSize);
        this.mapHeight = Math.floor(this.canvas.height / this.tileSize);
        
        // Типы местности
        this.terrainTypes = ['grassland', 'forest', 'mountain', 'water', 'desert'];
        this.terrainColors = {
            grassland: '#4a7c23',
            forest: '#2d5a1a',
            mountain: '#8b7355',
            water: '#1e90ff',
            desert: '#f4a460'
        };
        
        // Юниты
        this.unitTypes = {
            warrior: { cost: 50, strength: 10, speed: 2, symbol: '⚔️' },
            archer: { cost: 75, strength: 8, speed: 2, symbol: '🏹' },
            cavalry: { cost: 120, strength: 15, speed: 4, symbol: '🐎' }
        };
        
        // Технологии
        this.availableTechs = [
            { name: 'Земледелие', cost: 50, bonus: 'food' },
            { name: 'Добыча золота', cost: 75, bonus: 'gold' },
            { name: 'Письменность', cost: 100, bonus: 'science' },
            { name: 'Философия', cost: 150, bonus: 'culture' },
            { name: 'Металлургия', cost: 200, bonus: 'strength' }
        ];
        
        // Камера
        this.camera = { x: 0, y: 0 };
        this.isDragging = false;
        this.lastMouseX = 0;
        this.lastMouseY = 0;
        
        // Инициализация
        this.initMap();
        this.setupEventListeners();
        this.startGameLoop();
        
        // Стартовый город
        this.foundCity(true);
        
        this.showNotification('Добро пожаловать в Real-Time Civilization!');
    }
    
    resizeCanvas() {
        this.canvas.width = window.innerWidth - 300;
        this.canvas.height = window.innerHeight;
        this.mapWidth = Math.floor(this.canvas.width / this.tileSize);
        this.mapHeight = Math.floor(this.canvas.height / this.tileSize);
    }
    
    initMap() {
        this.tiles = [];
        for (let x = 0; x < 50; x++) {
            this.tiles[x] = [];
            for (let y = 0; y < 50; y++) {
                const rand = Math.random();
                let terrain;
                if (rand < 0.4) terrain = 'grassland';
                else if (rand < 0.6) terrain = 'forest';
                else if (rand < 0.75) terrain = 'mountain';
                else if (rand < 0.85) terrain = 'desert';
                else terrain = 'water';
                
                this.tiles[x][y] = {
                    x, y,
                    terrain,
                    resources: this.generateResources(terrain),
                    owner: null,
                    city: null
                };
            }
        }
    }
    
    generateResources(terrain) {
        const resources = [];
        const rand = Math.random();
        
        if (terrain === 'grassland' && rand < 0.3) {
            resources.push({ type: 'wheat', amount: 2 });
        } else if (terrain === 'forest' && rand < 0.2) {
            resources.push({ type: 'wood', amount: 1 });
        } else if (terrain === 'mountain' && rand < 0.15) {
            resources.push({ type: 'gold_ore', amount: 3 });
        } else if (terrain === 'desert' && rand < 0.1) {
            resources.push({ type: 'oil', amount: 4 });
        }
        
        return resources;
    }
    
    setupEventListeners() {
        this.canvas.addEventListener('mousedown', (e) => {
            this.isDragging = true;
            this.lastMouseX = e.clientX;
            this.lastMouseY = e.clientY;
        });
        
        this.canvas.addEventListener('mousemove', (e) => {
            if (this.isDragging) {
                const dx = e.clientX - this.lastMouseX;
                const dy = e.clientY - this.lastMouseY;
                this.camera.x += dx;
                this.camera.y += dy;
                this.lastMouseX = e.clientX;
                this.lastMouseY = e.clientY;
            }
        });
        
        this.canvas.addEventListener('mouseup', () => {
            this.isDragging = false;
        });
        
        this.canvas.addEventListener('click', (e) => {
            if (!this.isDragging) {
                const rect = this.canvas.getBoundingClientRect();
                const x = Math.floor((e.clientX - rect.left + this.camera.x) / this.tileSize);
                const y = Math.floor((e.clientY - rect.top + this.camera.y) / this.tileSize);
                this.handleTileClick(x, y);
            }
        });
    }
    
    handleTileClick(x, y) {
        if (x >= 0 && x < 50 && y >= 0 && y < 50) {
            const tile = this.tiles[x][y];
            console.log(`Клик по клетке ${x},${y}: ${tile.terrain}`);
            
            // Выбор юнита для перемещения
            const selectedUnit = this.units.find(u => 
                Math.abs(u.x - x) <= 1 && Math.abs(u.y - y) <= 1 && u.selected
            );
            
            if (selectedUnit) {
                this.moveUnit(selectedUnit, x, y);
            }
        }
    }
    
    foundCity(isFree = false) {
        const cost = isFree ? 0 : 100;
        if (this.resources.gold < cost && !isFree) {
            this.showNotification('Недостаточно золота!');
            return;
        }
        
        if (!isFree) {
            this.resources.gold -= cost;
        }
        
        // Найти подходящее место для города
        let placed = false;
        for (let attempts = 0; attempts < 100 && !placed; attempts++) {
            const x = Math.floor(Math.random() * 50);
            const y = Math.floor(Math.random() * 50);
            const tile = this.tiles[x][y];
            
            if (tile.terrain !== 'water' && tile.terrain !== 'mountain' && !tile.city) {
                const city = {
                    id: Date.now(),
                    x, y,
                    name: `Город ${this.cities.length + 1}`,
                    population: 1,
                    health: 100,
                    maxHealth: 100,
                    production: 5,
                    foodProduction: 3,
                    owner: 'player'
                };
                
                this.cities.push(city);
                tile.city = city;
                tile.owner = 'player';
                
                // Заявить права на соседние клетки
                for (let dx = -2; dx <= 2; dx++) {
                    for (let dy = -2; dy <= 2; dy++) {
                        const nx = x + dx;
                        const ny = y + dy;
                        if (nx >= 0 && nx < 50 && ny >= 0 && ny < 50) {
                            this.tiles[nx][ny].owner = 'player';
                        }
                    }
                }
                
                placed = true;
                this.showNotification(`Основан ${city.name}!`);
                this.updateUI();
            }
        }
        
        if (!placed) {
            this.showNotification('Не удалось найти место для города!');
            if (!isFree) {
                this.resources.gold += cost;
            }
        }
    }
    
    trainUnit(type) {
        const unitData = this.unitTypes[type];
        if (this.resources.gold < unitData.cost) {
            this.showNotification('Недостаточно золота!');
            return;
        }
        
        if (this.cities.length === 0) {
            this.showNotification('Нужен город для производства юнитов!');
            return;
        }
        
        this.resources.gold -= unitData.cost;
        
        // Создать юнита рядом с городом
        const city = this.cities[0];
        let placed = false;
        
        for (let dx = -1; dx <= 1 && !placed; dx++) {
            for (let dy = -1; dy <= 1 && !placed; dy++) {
                const x = city.x + dx;
                const y = city.y + dy;
                if (x >= 0 && x < 50 && y >= 0 && y < 50) {
                    const tile = this.tiles[x][y];
                    if (tile.terrain !== 'water' && tile.terrain !== 'mountain') {
                        const unit = {
                            id: Date.now() + Math.random(),
                            x, y,
                            type,
                            ...unitData,
                            owner: 'player',
                            selected: false,
                            targetX: null,
                            targetY: null
                        };
                        
                        this.units.push(unit);
                        placed = true;
                        this.showNotification(`Создан ${type === 'warrior' ? 'воин' : type === 'archer' ? 'лучник' : 'кавалерист'}!`);
                    }
                }
            }
        }
        
        this.updateUI();
    }
    
    moveUnit(unit, targetX, targetY) {
        if (targetX < 0 || targetX >= 50 || targetY < 0 || targetY >= 50) return;
        
        const tile = this.tiles[targetX][targetY];
        if (tile.terrain === 'water' || tile.terrain === 'mountain') {
            this.showNotification('Нельзя переместиться сюда!');
            return;
        }
        
        unit.targetX = targetX;
        unit.targetY = targetY;
        unit.selected = false;
    }
    
    researchTech() {
        if (this.currentTech) {
            this.showNotification('Технология уже исследуется!');
            return;
        }
        
        if (this.resources.science < 50) {
            this.showNotification('Недостаточно науки!');
            return;
        }
        
        this.resources.science -= 50;
        const availableTech = this.availableTechs.find(t => !this.techs.includes(t));
        
        if (availableTech) {
            this.currentTech = availableTech;
            this.techProgress = 0;
            this.showNotification(`Исследование: ${availableTech.name}`);
        } else {
            this.showNotification('Все технологии изучены!');
            this.resources.science += 50;
        }
        
        this.updateUI();
    }
    
    completeTech() {
        if (this.currentTech) {
            this.techs.push(this.currentTech);
            
            // Применить бонус
            switch (this.currentTech.bonus) {
                case 'food':
                    this.resources.food += 100;
                    break;
                case 'gold':
                    this.resources.gold += 100;
                    break;
                case 'science':
                    this.resources.science += 50;
                    break;
                case 'culture':
                    this.resources.culture += 50;
                    break;
                case 'strength':
                    this.units.forEach(u => u.strength += 2);
                    break;
            }
            
            this.showNotification(`Изучена технология: ${this.currentTech.name}!`);
            this.currentTech = null;
            this.techProgress = 0;
        }
    }
    
    updateGameLogic() {
        // Производство ресурсов городами
        this.cities.forEach(city => {
            this.resources.food += city.foodProduction * 0.1;
            this.resources.gold += city.production * 0.1;
            this.resources.science += city.population * 0.05;
            this.resources.culture += city.population * 0.03;
        });
        
        // Движение юнитов
        this.units.forEach(unit => {
            if (unit.targetX !== null && unit.targetY !== null) {
                const dx = unit.targetX - unit.x;
                const dy = unit.targetY - unit.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist > 0) {
                    const speed = unit.speed * 0.05;
                    const moveX = (dx / dist) * speed;
                    const moveY = (dy / dist) * speed;
                    
                    unit.x += moveX;
                    unit.y += moveY;
                    
                    if (dist < speed) {
                        unit.x = unit.targetX;
                        unit.y = unit.targetY;
                        unit.targetX = null;
                        unit.targetY = null;
                    }
                }
            }
        });
        
        // Исследование технологий
        if (this.currentTech) {
            this.techProgress += 0.5;
            if (this.techProgress >= 100) {
                this.completeTech();
            }
        }
        
        this.updateUI();
    }
    
    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Отрисовка карты
        const startX = Math.floor(-this.camera.x / this.tileSize);
        const startY = Math.floor(-this.camera.y / this.tileSize);
        const endX = startX + this.mapWidth + 1;
        const endY = startY + this.mapHeight + 1;
        
        for (let x = startX; x < endX; x++) {
            for (let y = startY; y < endY; y++) {
                if (x >= 0 && x < 50 && y >= 0 && y < 50) {
                    const tile = this.tiles[x][y];
                    const screenX = x * this.tileSize + this.camera.x;
                    const screenY = y * this.tileSize + this.camera.y;
                    
                    // Цвет местности
                    this.ctx.fillStyle = this.terrainColors[tile.terrain];
                    this.ctx.fillRect(screenX, screenY, this.tileSize, this.tileSize);
                    
                    // Границы территории
                    if (tile.owner === 'player') {
                        this.ctx.strokeStyle = '#4a90e2';
                        this.ctx.lineWidth = 1;
                        this.ctx.strokeRect(screenX, screenY, this.tileSize, this.tileSize);
                    }
                    
                    // Ресурсы
                    tile.resources.forEach(res => {
                        this.ctx.fillStyle = '#fff';
                        this.ctx.font = '12px Arial';
                        this.ctx.fillText(this.getResourceSymbol(res.type), screenX + 5, screenY + 15);
                    });
                    
                    // Город
                    if (tile.city) {
                        this.ctx.fillStyle = '#ffd700';
                        this.ctx.beginPath();
                        this.ctx.arc(screenX + this.tileSize/2, screenY + this.tileSize/2, 15, 0, Math.PI * 2);
                        this.ctx.fill();
                        this.ctx.fillStyle = '#000';
                        this.ctx.font = 'bold 14px Arial';
                        this.ctx.fillText('🏛️', screenX + 12, screenY + 25);
                    }
                }
            }
        }
        
        // Отрисовка юнитов
        this.units.forEach(unit => {
            const screenX = Math.floor(unit.x) * this.tileSize + this.camera.x;
            const screenY = Math.floor(unit.y) * this.tileSize + this.camera.y;
            
            // Выделение
            if (unit.selected) {
                this.ctx.strokeStyle = '#00ff00';
                this.ctx.lineWidth = 3;
                this.ctx.beginPath();
                this.ctx.arc(screenX + this.tileSize/2, screenY + this.tileSize/2, 18, 0, Math.PI * 2);
                this.ctx.stroke();
            }
            
            // Юнит
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '20px Arial';
            this.ctx.fillText(unit.symbol, screenX + 10, screenY + 28);
            
            // Полоска здоровья
            this.ctx.fillStyle = '#333';
            this.ctx.fillRect(screenX + 5, screenY + 32, 30, 4);
            this.ctx.fillStyle = '#0f0';
            this.ctx.fillRect(screenX + 5, screenY + 32, 30 * (unit.health / unit.maxHealth), 4);
        });
        
        // Миникарта
        this.renderMinimap();
    }
    
    renderMinimap() {
        this.minimapCtx.clearRect(0, 0, this.minimap.width, this.minimap.height);
        
        const scaleX = this.minimap.width / 50;
        const scaleY = this.minimap.height / 50;
        
        for (let x = 0; x < 50; x++) {
            for (let y = 0; y < 50; y++) {
                const tile = this.tiles[x][y];
                this.minimapCtx.fillStyle = this.terrainColors[tile.terrain];
                
                if (tile.owner === 'player') {
                    this.minimapCtx.fillStyle = '#4a90e2';
                }
                
                this.minimapCtx.fillRect(x * scaleX, y * scaleY, scaleX, scaleY);
            }
        }
        
        // Города на миникарте
        this.minimapCtx.fillStyle = '#ffd700';
        this.cities.forEach(city => {
            this.minimapCtx.fillRect(city.x * scaleX - 1, city.y * scaleY - 1, 4, 4);
        });
        
        // Юниты на миникарте
        this.minimapCtx.fillStyle = '#fff';
        this.units.forEach(unit => {
            this.minimapCtx.fillRect(unit.x * scaleX - 1, unit.y * scaleY - 1, 3, 3);
        });
    }
    
    getResourceSymbol(type) {
        const symbols = {
            wheat: '🌾',
            wood: '🌲',
            gold_ore: '💰',
            oil: '🛢️'
        };
        return symbols[type] || '❓';
    }
    
    updateUI() {
        document.getElementById('food').textContent = Math.floor(this.resources.food);
        document.getElementById('gold').textContent = Math.floor(this.resources.gold);
        document.getElementById('science').textContent = Math.floor(this.resources.science);
        document.getElementById('culture').textContent = Math.floor(this.resources.culture);
        
        // Список городов
        const citiesList = document.getElementById('cities-list');
        citiesList.innerHTML = '';
        this.cities.forEach(city => {
            const div = document.createElement('div');
            div.className = 'city-info';
            div.innerHTML = `
                <strong>${city.name}</strong><br>
                👥 ${Math.floor(city.population)} | ❤️ ${city.health}/${city.maxHealth}<br>
                🍞 +${city.foodProduction.toFixed(1)} | 💰 +${city.production.toFixed(1)}
            `;
            citiesList.appendChild(div);
        });
        
        // Прогресс технологии
        const techProgress = document.getElementById('tech-progress');
        if (this.currentTech) {
            techProgress.innerHTML = `
                <div style="margin: 10px 0;">
                    <div>${this.currentTech.name}</div>
                    <div style="background: #333; height: 10px; border-radius: 5px; margin-top: 5px;">
                        <div style="background: #e94560; height: 100%; width: ${this.techProgress}%; border-radius: 5px; transition: width 0.3s;"></div>
                    </div>
                </div>
            `;
        } else {
            techProgress.innerHTML = '<em>Нет активной технологии</em>';
        }
    }
    
    showNotification(message) {
        const notifications = document.getElementById('notifications');
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;
        notifications.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
    
    startGameLoop() {
        let lastTime = 0;
        let logicAccumulator = 0;
        const logicInterval = 100; // Обновление логики каждые 100мс
        
        const gameLoop = (timestamp) => {
            const deltaTime = timestamp - lastTime;
            lastTime = timestamp;
            
            logicAccumulator += deltaTime;
            while (logicAccumulator >= logicInterval) {
                this.updateGameLogic();
                logicAccumulator -= logicInterval;
            }
            
            this.render();
            requestAnimationFrame(gameLoop);
        };
        
        requestAnimationFrame(gameLoop);
    }
}

// Запуск игры
const game = new Game();
