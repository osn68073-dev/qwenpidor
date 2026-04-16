// Real-Time Civilization Game Engine
// Modern graphics with gradients, shadows, animations, and particle effects

class Game {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.minimapCanvas = document.getElementById('minimap');
        this.minimapCtx = this.minimapCanvas.getContext('2d');
        
        this.mapWidth = 50;
        this.mapHeight = 50;
        this.tileSize = 40;
        this.cameraX = 0;
        this.cameraY = 0;
        this.isDragging = false;
        this.lastMouseX = 0;
        this.lastMouseY = 0;
        this.hoveredTile = null;
        this.selectedUnit = null;
        this.particles = [];
        
        // Terrain types with beautiful colors
        this.terrainTypes = {
           平原: { color: '#7cb342', color2: '#8bc34a', name: 'Равнина' },
            лес: { color: '#2d5a27', color2: '#388e3c', name: 'Лес' },
            горы: { color: '#8b7355', color2: '#a1887f', name: 'Горы' },
            пустыня: { color: '#d4c685', color2: '#e6c896', name: 'Пустыня' },
            вода: { color: '#4a9eff', color2: '#64b5f6', name: 'Вода' }
        };
        
        // Resources
        this.resources = {
            food: 200,
            gold: 150,
            science: 0,
            culture: 0
        };
        
        this.resourceRates = {
            food: 0,
            gold: 0,
            science: 0,
            culture: 0
        };
        
        this.cities = [];
        this.units = [];
        this.techs = [
            { id: 'agriculture', name: 'Земледелие', cost: 100, progress: 0, researched: false, bonus: '+2 еды за город' },
            { id: 'mining', name: 'Горное дело', cost: 150, progress: 0, researched: false, bonus: '+2 золота за город' },
            { id: 'writing', name: 'Письменность', cost: 200, progress: 0, researched: false, bonus: '+2 науки за город' },
            { id: 'philosophy', name: 'Философия', cost: 300, progress: 0, researched: false, bonus: '+2 культуры за город' },
            { id: 'steel', name: 'Сталь', cost: 500, progress: 0, researched: false, bonus: '+50% к силе юнитов' }
        ];
        
        this.unitTypes = {
            warrior: { name: 'Воин', cost: 50, attack: 10, defense: 15, speed: 2, symbol: '⚔️', color: '#e74c3c' },
            archer: { name: 'Лучник', cost: 75, attack: 15, defense: 8, speed: 2.5, symbol: '🏹', color: '#9b59b6' },
            cavalry: { name: 'Кавалерия', cost: 100, attack: 20, defense: 12, speed: 3.5, symbol: '🐎', color: '#f39c12' }
        };
        
        this.init();
    }
    
    init() {
        this.resize();
        this.generateMap();
        this.setupEventListeners();
        this.spawnStarterCity();
        this.startGameLoop();
        this.updateUI();
    }
    
    resize() {
        const container = document.getElementById('main-view');
        this.canvas.width = container.clientWidth;
        this.canvas.height = container.clientHeight;
        
        // Center camera on map
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
                
                if (rand < 0.15) terrain = 'вода';
                else if (rand < 0.35) terrain = 'лес';
                else if (rand < 0.50) terrain = 'горы';
                else if (rand < 0.70) terrain = 'пустыня';
                else terrain = '平原';
                
                this.map[y][x] = {
                    terrain: terrain,
                    resource: Math.random() < 0.1 ? this.getRandomResource() : null,
                    owner: null
                };
            }
        }
        
        // Smooth the map
        this.smoothMap();
    }
    
    getRandomResource() {
        const resources = ['пшеница', 'золото', 'камень', 'шелк'];
        return resources[Math.floor(Math.random() * resources.length)];
    }
    
    smoothMap() {
        // Simple smoothing pass
        for (let pass = 0; pass < 2; pass++) {
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
                    let dominant = this.map[y][x].terrain;
                    for (const [terrain, count] of Object.entries(counts)) {
                        if (count > maxCount) {
                            maxCount = count;
                            dominant = terrain;
                        }
                    }
                    
                    if (maxCount >= 3) {
                        newMap[y][x].terrain = dominant;
                    }
                }
            }
            this.map = newMap;
        }
    }
    
    spawnStarterCity() {
        // Find a good spot for starter city
        let startX = Math.floor(this.mapWidth / 2);
        let startY = Math.floor(this.mapHeight / 2);
        
        // Make sure it's not on water or mountains
        while (['вода', 'горы'].includes(this.map[startY][startX].terrain)) {
            startX = Math.floor(Math.random() * this.mapWidth);
            startY = Math.floor(Math.random() * this.mapHeight);
        }
        
        this.foundCity(startX, startY, 'Столица');
        
        // Give starter units
        this.spawnUnit(startX + 1, startY, 'warrior');
        this.spawnUnit(startX - 1, startY, 'warrior');
    }
    
    foundCity(x, y, name = null) {
        if (!name) {
            const cityNames = ['Новгород', 'Казань', 'Владивосток', 'Самара', 'Омск', 'Уфа', 'Красноярск', 'Пермь', 'Волгоград'];
            name = cityNames[this.cities.length] || `Город ${this.cities.length + 1}`;
        }
        
        const city = {
            x: x,
            y: y,
            name: name,
            population: 1,
            production: 0,
            health: 100,
            maxHealth: 100,
            tiles: [{x, y}]
        };
        
        this.cities.push(city);
        this.map[y][x].owner = 'player';
        
        // Claim surrounding tiles
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                const nx = x + dx;
                const ny = y + dy;
                if (nx >= 0 && nx < this.mapWidth && ny >= 0 && ny < this.mapHeight) {
                    this.map[ny][nx].owner = 'player';
                    if (dx !== 0 || dy !== 0) {
                        city.tiles.push({x: nx, y: ny});
                    }
                }
            }
        }
        
        this.createParticles(x * this.tileSize + this.tileSize/2, y * this.tileSize + this.tileSize/2, '#ffd700', 20);
        this.showNotification(`Основан город: ${name}!`);
    }
    
    spawnUnit(x, y, type) {
        const unitData = this.unitTypes[type];
        const unit = {
            id: Date.now() + Math.random(),
            x: x * this.tileSize + this.tileSize / 2,
            y: y * this.tileSize + this.tileSize / 2,
            targetX: x * this.tileSize + this.tileSize / 2,
            targetY: y * this.tileSize + this.tileSize / 2,
            type: type,
            ...unitData,
            health: 100,
            maxHealth: 100,
            exp: 0,
            level: 1
        };
        
        this.units.push(unit);
        return unit;
    }
    
    setupEventListeners() {
        window.addEventListener('resize', () => this.resize());
        
        this.canvas.addEventListener('mousedown', (e) => {
            this.isDragging = true;
            this.lastMouseX = e.clientX;
            this.lastMouseY = e.clientY;
        });
        
        this.canvas.addEventListener('mousemove', (e) => {
            if (this.isDragging) {
                const dx = e.clientX - this.lastMouseX;
                const dy = e.clientY - this.lastMouseY;
                this.cameraX -= dx;
                this.cameraY -= dy;
                this.lastMouseX = e.clientX;
                this.lastMouseY = e.clientY;
            }
            
            // Calculate hovered tile
            const rect = this.canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            const tileX = Math.floor((mouseX + this.cameraX) / this.tileSize);
            const tileY = Math.floor((mouseY + this.cameraY) / this.tileSize);
            
            if (tileX >= 0 && tileX < this.mapWidth && tileY >= 0 && tileY < this.mapHeight) {
                this.hoveredTile = { x: tileX, y: tileY };
                this.updateTooltip(e.clientX, e.clientY);
            } else {
                this.hoveredTile = null;
                document.getElementById('tooltip').style.display = 'none';
            }
        });
        
        this.canvas.addEventListener('mouseup', () => {
            this.isDragging = false;
        });
        
        this.canvas.addEventListener('mouseleave', () => {
            this.isDragging = false;
        });
        
        this.canvas.addEventListener('click', (e) => {
            if (!this.isDragging && this.hoveredTile) {
                this.handleTileClick(this.hoveredTile.x, this.hoveredTile.y);
            }
        });
        
        // Button listeners
        document.getElementById('found-city-btn').addEventListener('click', () => {
            if (this.resources.gold >= 100 && this.selectedUnit) {
                const tileX = Math.floor(this.selectedUnit.x / this.tileSize);
                const tileY = Math.floor(this.selectedUnit.y / this.tileSize);
                this.resources.gold -= 100;
                this.foundCity(tileX, tileY);
                // Remove the unit
                this.units = this.units.filter(u => u.id !== this.selectedUnit.id);
                this.selectedUnit = null;
                this.updateUI();
            }
        });
        
        document.getElementById('train-warrior-btn').addEventListener('click', () => {
            this.trainUnit('warrior');
        });
        
        document.getElementById('train-archer-btn').addEventListener('click', () => {
            this.trainUnit('archer');
        });
        
        document.getElementById('train-cavalry-btn').addEventListener('click', () => {
            this.trainUnit('cavalry');
        });
    }
    
    handleTileClick(x, y) {
        const screenX = x * this.tileSize - this.cameraX;
        const screenY = y * this.tileSize - this.cameraY;
        
        // Check if clicked on a unit
        for (const unit of this.units) {
            const unitScreenX = unit.x - this.cameraX;
            const unitScreenY = unit.y - this.cameraY;
            const dist = Math.sqrt((screenX - unitScreenX) ** 2 + (screenY - unitScreenY) ** 2);
            
            if (dist < this.tileSize / 2) {
                this.selectedUnit = unit;
                this.createParticles(unit.x, unit.y, '#4a9eff', 10);
                break;
            }
        }
    }
    
    trainUnit(type) {
        const unitData = this.unitTypes[type];
        if (this.resources.gold >= unitData.cost && this.cities.length > 0) {
            this.resources.gold -= unitData.cost;
            const city = this.cities[0];
            this.spawnUnit(city.x + 1, city.y, type);
            this.createParticles(
                (city.x + 1) * this.tileSize + this.tileSize/2,
                city.y * this.tileSize + this.tileSize/2,
                unitData.color,
                15
            );
            this.updateUI();
        }
    }
    
    createParticles(x, y, color, count) {
        for (let i = 0; i < count; i++) {
            this.particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 4,
                vy: (Math.random() - 0.5) * 4,
                life: 1,
                color: color,
                size: Math.random() * 4 + 2
            });
        }
    }
    
    updateParticles(dt) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.1; // gravity
            p.life -= dt * 2;
            
            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }
    
    updateUnits(dt) {
        for (const unit of this.units) {
            // Move towards target
            const dx = unit.targetX - unit.x;
            const dy = unit.targetY - unit.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist > 1) {
                const speed = unit.speed * this.tileSize * dt;
                unit.x += (dx / dist) * speed;
                unit.y += (dy / dist) * speed;
            }
            
            // Random wandering for unselected units
            if (unit !== this.selectedUnit && Math.random() < 0.01) {
                const angle = Math.random() * Math.PI * 2;
                const wanderDist = this.tileSize * (1 + Math.random() * 2);
                unit.targetX = unit.x + Math.cos(angle) * wanderDist;
                unit.targetY = unit.y + Math.sin(angle) * wanderDist;
                
                // Keep in bounds
                unit.targetX = Math.max(this.tileSize/2, Math.min((this.mapWidth - 0.5) * this.tileSize, unit.targetX));
                unit.targetY = Math.max(this.tileSize/2, Math.min((this.mapHeight - 0.5) * this.tileSize, unit.targetY));
            }
        }
    }
    
    updateResources(dt) {
        // Calculate resource rates from cities
        let foodRate = 0, goldRate = 0, scienceRate = 0, cultureRate = 0;
        
        for (const city of this.cities) {
            foodRate += 2 + city.population;
            goldRate += 2;
            scienceRate += 1;
            cultureRate += 1;
        }
        
        // Apply tech bonuses
        if (this.techs[0].researched) foodRate += this.cities.length * 2;
        if (this.techs[1].researched) goldRate += this.cities.length * 2;
        if (this.techs[2].researched) scienceRate += this.cities.length * 2;
        if (this.techs[3].researched) cultureRate += this.cities.length * 2;
        
        this.resourceRates = { food: foodRate, gold: goldRate, science: scienceRate, culture: cultureRate };
        
        // Add resources
        this.resources.food += foodRate * dt;
        this.resources.gold += goldRate * dt;
        this.resources.science += scienceRate * dt;
        this.resources.culture += cultureRate * dt;
        
        // Update tech progress
        for (const tech of this.techs) {
            if (!tech.researched) {
                tech.progress += scienceRate * dt;
                if (tech.progress >= tech.cost) {
                    tech.progress = tech.cost;
                    tech.researched = true;
                    this.showNotification(`Исследовано: ${tech.name}!`);
                    this.createParticles(
                        this.canvas.width / 2,
                        this.canvas.height / 2,
                        '#4a9eff',
                        30
                    );
                }
            }
        }
    }
    
    showNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;
        document.getElementById('main-view').appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
    
    updateTooltip(mouseX, mouseY) {
        const tooltip = document.getElementById('tooltip');
        
        if (this.hoveredTile) {
            const tile = this.map[this.hoveredTile.y][this.hoveredTile.x];
            const terrain = this.terrainTypes[tile.terrain];
            
            let content = `<strong>${terrain.name}</strong>`;
            
            if (tile.resource) {
                content += `<br>📦 Ресурс: ${tile.resource}`;
            }
            
            if (tile.owner) {
                content += `<br>🏛️ Владелец: Вы`;
            }
            
            // Check for units
            for (const unit of this.units) {
                const unitTileX = Math.floor(unit.x / this.tileSize);
                const unitTileY = Math.floor(unit.y / this.tileSize);
                if (unitTileX === this.hoveredTile.x && unitTileY === this.hoveredTile.y) {
                    content += `<br>⚔️ ${unit.name} (HP: ${Math.round(unit.health)})`;
                }
            }
            
            // Check for cities
            for (const city of this.cities) {
                if (city.x === this.hoveredTile.x && city.y === this.hoveredTile.y) {
                    content += `<br>🏙️ ${city.name} (Население: ${city.population})`;
                }
            }
            
            tooltip.innerHTML = content;
            tooltip.style.display = 'block';
            tooltip.style.left = (mouseX + 15) + 'px';
            tooltip.style.top = (mouseY + 15) + 'px';
        }
    }
    
    updateUI() {
        document.getElementById('food').textContent = Math.floor(this.resources.food);
        document.getElementById('gold').textContent = Math.floor(this.resources.gold);
        document.getElementById('science').textContent = Math.floor(this.resources.science);
        document.getElementById('culture').textContent = Math.floor(this.resources.culture);
        
        // Update tech list
        const techList = document.getElementById('tech-list');
        techList.innerHTML = '';
        for (const tech of this.techs) {
            const progress = tech.researched ? 100 : (tech.progress / tech.cost * 100);
            const techItem = document.createElement('div');
            techItem.className = 'tech-item';
            techItem.innerHTML = `
                <div class="tech-name">${tech.researched ? '✅' : '🔬'} ${tech.name}</div>
                <div class="unit-stats">${tech.bonus}</div>
                <div class="tech-progress">
                    <div class="tech-progress-bar" style="width: ${progress}%"></div>
                </div>
            `;
            techList.appendChild(techItem);
        }
        
        // Update city list
        const cityList = document.getElementById('city-list');
        cityList.innerHTML = '';
        for (const city of this.cities) {
            const cityItem = document.createElement('div');
            cityItem.className = 'city-item';
            cityItem.innerHTML = `
                <div class="city-name">🏙️ ${city.name}</div>
                <div class="city-stats">Население: ${city.population} | HP: ${city.health}</div>
            `;
            cityList.appendChild(cityItem);
        }
        
        // Update unit list
        const unitList = document.getElementById('unit-list');
        unitList.innerHTML = '';
        for (const unit of this.units) {
            const unitItem = document.createElement('div');
            unitItem.className = 'unit-item';
            unitItem.style.borderLeftColor = unit === this.selectedUnit ? '#ffd700' : '#4a9eff';
            unitItem.innerHTML = `
                <div class="unit-name">${unit.symbol} ${unit.name} (Ур. ${unit.level})</div>
                <div class="unit-stats">ATK: ${unit.attack} | DEF: ${unit.defense} | HP: ${Math.round(unit.health)}</div>
            `;
            unitList.appendChild(unitItem);
        }
        
        // Update button states
        document.getElementById('found-city-btn').disabled = this.resources.gold < 100 || !this.selectedUnit;
        document.getElementById('train-warrior-btn').disabled = this.resources.gold < 50 || this.cities.length === 0;
        document.getElementById('train-archer-btn').disabled = this.resources.gold < 75 || this.cities.length === 0;
        document.getElementById('train-cavalry-btn').disabled = this.resources.gold < 100 || this.cities.length === 0;
    }
    
    drawMap() {
        const startCol = Math.floor(this.cameraX / this.tileSize);
        const endCol = startCol + (this.canvas.width / this.tileSize) + 1;
        const startRow = Math.floor(this.cameraY / this.tileSize);
        const endRow = startRow + (this.canvas.height / this.tileSize) + 1;
        
        for (let y = startRow; y <= endRow; y++) {
            for (let x = startCol; x <= endCol; x++) {
                if (y >= 0 && y < this.mapHeight && x >= 0 && x < this.mapWidth) {
                    const tile = this.map[y][x];
                    const screenX = x * this.tileSize - this.cameraX;
                    const screenY = y * this.tileSize - this.cameraY;
                    
                    const terrain = this.terrainTypes[tile.terrain];
                    
                    // Draw terrain with gradient
                    const gradient = this.ctx.createLinearGradient(
                        screenX, screenY,
                        screenX + this.tileSize, screenY + this.tileSize
                    );
                    gradient.addColorStop(0, terrain.color);
                    gradient.addColorStop(1, terrain.color2);
                    
                    this.ctx.fillStyle = gradient;
                    this.ctx.fillRect(screenX, screenY, this.tileSize, this.tileSize);
                    
                    // Add texture pattern
                    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
                    this.ctx.lineWidth = 1;
                    this.ctx.strokeRect(screenX, screenY, this.tileSize, this.tileSize);
                    
                    // Draw resource icon
                    if (tile.resource) {
                        this.ctx.font = '20px Arial';
                        this.ctx.textAlign = 'center';
                        this.ctx.textBaseline = 'middle';
                        const icons = { 'пшеница': '🌾', 'золото': '💰', 'камень': '🪨', 'шелк': '🧵' };
                        this.ctx.fillText(icons[tile.resource] || '📦', screenX + this.tileSize/2, screenY + this.tileSize/2);
                    }
                    
                    // Draw ownership indicator
                    if (tile.owner) {
                        this.ctx.strokeStyle = '#4a9eff';
                        this.ctx.lineWidth = 2;
                        this.ctx.strokeRect(screenX + 2, screenY + 2, this.tileSize - 4, this.tileSize - 4);
                    }
                    
                    // Highlight hovered tile
                    if (this.hoveredTile && this.hoveredTile.x === x && this.hoveredTile.y === y) {
                        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
                        this.ctx.fillRect(screenX, screenY, this.tileSize, this.tileSize);
                        this.ctx.strokeStyle = '#ffd700';
                        this.ctx.lineWidth = 3;
                        this.ctx.strokeRect(screenX + 1, screenY + 1, this.tileSize - 2, this.tileSize - 2);
                    }
                }
            }
        }
    }
    
    drawCities() {
        for (const city of this.cities) {
            const screenX = city.x * this.tileSize - this.cameraX;
            const screenY = city.y * this.tileSize - this.cameraY;
            
            // City glow effect
            const gradient = this.ctx.createRadialGradient(
                screenX + this.tileSize/2, screenY + this.tileSize/2, 0,
                screenX + this.tileSize/2, screenY + this.tileSize/2, this.tileSize
            );
            gradient.addColorStop(0, 'rgba(255, 215, 0, 0.3)');
            gradient.addColorStop(1, 'rgba(255, 215, 0, 0)');
            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(screenX - this.tileSize/2, screenY - this.tileSize/2, this.tileSize * 2, this.tileSize * 2);
            
            // City building
            this.ctx.font = '30px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText('🏛️', screenX + this.tileSize/2, screenY + this.tileSize/2);
            
            // City name
            this.ctx.font = 'bold 12px Arial';
            this.ctx.fillStyle = '#fff';
            this.ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
            this.ctx.shadowBlur = 4;
            this.ctx.fillText(city.name, screenX + this.tileSize/2, screenY - 5);
            this.ctx.shadowBlur = 0;
            
            // Health bar
            const healthPercent = city.health / city.maxHealth;
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            this.ctx.fillRect(screenX + 5, screenY + this.tileSize - 8, this.tileSize - 10, 5);
            this.ctx.fillStyle = healthPercent > 0.5 ? '#2ecc71' : healthPercent > 0.25 ? '#f39c12' : '#e74c3c';
            this.ctx.fillRect(screenX + 5, screenY + this.tileSize - 8, (this.tileSize - 10) * healthPercent, 5);
        }
    }
    
    drawUnits() {
        for (const unit of this.units) {
            const screenX = unit.x - this.cameraX;
            const screenY = unit.y - this.cameraY;
            
            // Selection glow
            if (unit === this.selectedUnit) {
                const selectionGradient = this.ctx.createRadialGradient(
                    screenX, screenY, 0,
                    screenX, screenY, this.tileSize * 0.8
                );
                selectionGradient.addColorStop(0, 'rgba(74, 158, 255, 0.4)');
                selectionGradient.addColorStop(1, 'rgba(74, 158, 255, 0)');
                this.ctx.fillStyle = selectionGradient;
                this.ctx.beginPath();
                this.ctx.arc(screenX, screenY, this.tileSize * 0.8, 0, Math.PI * 2);
                this.ctx.fill();
                
                // Selection ring
                this.ctx.strokeStyle = '#4a9eff';
                this.ctx.lineWidth = 3;
                this.ctx.beginPath();
                this.ctx.arc(screenX, screenY, this.tileSize * 0.6, 0, Math.PI * 2);
                this.ctx.stroke();
            }
            
            // Unit shadow
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            this.ctx.beginPath();
            this.ctx.ellipse(screenX, screenY + this.tileSize * 0.4, this.tileSize * 0.3, this.tileSize * 0.15, 0, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Unit symbol
            this.ctx.font = '24px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(unit.symbol, screenX, screenY);
            
            // Health bar
            const healthPercent = unit.health / unit.maxHealth;
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            this.ctx.fillRect(screenX - 15, screenY - this.tileSize * 0.4, 30, 4);
            this.ctx.fillStyle = healthPercent > 0.5 ? '#2ecc71' : healthPercent > 0.25 ? '#f39c12' : '#e74c3c';
            this.ctx.fillRect(screenX - 15, screenY - this.tileSize * 0.4, 30 * healthPercent, 4);
            
            // Level indicator
            if (unit.level > 1) {
                this.ctx.font = 'bold 10px Arial';
                this.ctx.fillStyle = '#ffd700';
                this.ctx.fillText(`★${unit.level}`, screenX + 15, screenY - this.tileSize * 0.4);
            }
        }
    }
    
    drawParticles() {
        for (const p of this.particles) {
            this.ctx.globalAlpha = p.life;
            this.ctx.fillStyle = p.color;
            this.ctx.beginPath();
            this.ctx.arc(p.x - this.cameraX, p.y - this.cameraY, p.size * p.life, 0, Math.PI * 2);
            this.ctx.fill();
        }
        this.ctx.globalAlpha = 1;
    }
    
    drawMinimap() {
        const minimapScale = 200 / Math.max(this.mapWidth * this.tileSize, this.mapHeight * this.tileSize);
        
        this.minimapCtx.clearRect(0, 0, 200, 200);
        
        // Draw terrain
        for (let y = 0; y < this.mapHeight; y++) {
            for (let x = 0; x < this.mapWidth; x++) {
                const terrain = this.terrainTypes[this.map[y][x].terrain];
                this.minimapCtx.fillStyle = terrain.color;
                this.minimapCtx.fillRect(
                    x * this.tileSize * minimapScale,
                    y * this.tileSize * minimapScale,
                    this.tileSize * minimapScale + 1,
                    this.tileSize * minimapScale + 1
                );
            }
        }
        
        // Draw cities
        this.minimapCtx.fillStyle = '#ffd700';
        for (const city of this.cities) {
            this.minimapCtx.fillRect(
                city.x * this.tileSize * minimapScale - 2,
                city.y * this.tileSize * minimapScale - 2,
                5, 5
            );
        }
        
        // Draw units
        this.minimapCtx.fillStyle = '#fff';
        for (const unit of this.units) {
            this.minimapCtx.fillRect(
                (unit.x / this.tileSize) * this.tileSize * minimapScale - 1,
                (unit.y / this.tileSize) * this.tileSize * minimapScale - 1,
                3, 3
            );
        }
        
        // Draw camera viewport
        this.minimapCtx.strokeStyle = '#ff0000';
        this.minimapCtx.lineWidth = 2;
        this.minimapCtx.strokeRect(
            this.cameraX * minimapScale,
            this.cameraY * minimapScale,
            this.canvas.width * minimapScale,
            this.canvas.height * minimapScale
        );
    }
    
    gameLoop(lastTime = 0) {
        const currentTime = performance.now();
        const dt = (currentTime - lastTime) / 1000;
        
        if (dt < 0.1) { // Prevent huge delta times
            this.update(dt);
            this.render();
        }
        
        requestAnimationFrame((time) => this.gameLoop(time));
    }
    
    update(dt) {
        this.updateResources(dt);
        this.updateUnits(dt);
        this.updateParticles(dt);
        this.updateUI();
    }
    
    render() {
        // Clear canvas
        this.ctx.fillStyle = '#1a1a2e';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.drawMap();
        this.drawCities();
        this.drawUnits();
        this.drawParticles();
        this.drawMinimap();
    }
    
    startGameLoop() {
        requestAnimationFrame((time) => this.gameLoop(time));
    }
}

// Start the game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const game = new Game();
});
