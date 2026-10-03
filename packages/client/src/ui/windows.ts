import { InventorySystem, ItemData } from '../systems/inventory';
import { PlayerStats } from '../network/protocol';

export class WindowManager {
  private container: HTMLElement;
  private inventorySystem: InventorySystem;
  private playerStats: PlayerStats;

  // Window elements
  private inventoryWindow!: HTMLElement;
  private statusWindow!: HTMLElement;
  private skillWindow!: HTMLElement;

  // Callbacks
  private onUseItemCallback?: (item: ItemData, slotIndex: number) => void;
  private onStatPointAllocated?: (stat: 'str' | 'sta' | 'dex' | 'int') => void;

  constructor(container: HTMLElement, inventory: InventorySystem, stats: PlayerStats) {
    this.container = container;
    this.inventorySystem = inventory;
    this.playerStats = stats;

    this.injectStyles();
    this.buildInventoryWindow();
    this.buildStatusWindow();
    this.buildSkillWindow();
    this.setupShortcuts();

    this.inventorySystem.setOnChangeCallback(() => {
      this.refreshInventoryUI();
    });
  }

  public setCallbacks(callbacks: {
    onUseItem: (item: ItemData, slotIndex: number) => void;
    onStatPointAllocated: (stat: 'str' | 'sta' | 'dex' | 'int') => void;
  }): void {
    this.onUseItemCallback = callbacks.onUseItem;
    this.onStatPointAllocated = callbacks.onStatPointAllocated;
  }

  private injectStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      .flyff-win {
        position: absolute;
        background: linear-gradient(180deg, rgba(25, 35, 50, 0.96) 0%, rgba(15, 20, 30, 0.98) 100%);
        border: 2px solid #5a7590;
        border-radius: 6px;
        box-shadow: 0 8px 25px rgba(0,0,0,0.7);
        color: #ecf0f1;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        display: none;
        user-select: none;
        z-index: 100;
        pointer-events: auto;
      }
      .win-header {
        background: linear-gradient(90deg, #2c3e50, #34495e);
        padding: 6px 10px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 1px solid #4a627a;
        cursor: move;
        font-weight: bold;
        font-size: 13px;
        color: #f1c40f;
      }
      .win-close-btn {
        background: #c0392b;
        color: #fff;
        border: none;
        border-radius: 3px;
        width: 18px;
        height: 18px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 11px;
        font-weight: bold;
      }
      .win-close-btn:hover { background: #e74c3c; }

      /* Inventory Window */
      .inv-grid {
        display: grid;
        grid-template-columns: repeat(6, 42px);
        gap: 4px;
        padding: 10px;
        background: rgba(10, 15, 20, 0.6);
      }
      .inv-slot {
        width: 42px;
        height: 42px;
        background: rgba(30, 42, 58, 0.8);
        border: 1px solid #4a627a;
        border-radius: 4px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        position: relative;
        cursor: pointer;
        font-size: 20px;
      }
      .inv-slot:hover {
        border-color: #f1c40f;
        background: rgba(52, 73, 94, 0.9);
      }
      .inv-slot-count {
        position: absolute;
        bottom: 1px;
        right: 3px;
        font-size: 10px;
        font-weight: bold;
        color: #fff;
        text-shadow: 1px 1px 2px #000;
      }
      .inv-footer {
        padding: 8px 10px;
        border-top: 1px solid #4a627a;
        display: flex;
        justify-content: space-between;
        font-size: 11px;
        color: #f39c12;
      }

      /* Status Window */
      .status-content {
        padding: 12px;
        min-width: 260px;
      }
      .status-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 4px 0;
        border-bottom: 1px solid rgba(255,255,255,0.08);
        font-size: 12px;
      }
      .status-stat-btn {
        background: #27ae60;
        color: #fff;
        border: none;
        border-radius: 3px;
        padding: 2px 6px;
        font-size: 10px;
        cursor: pointer;
      }
      .status-stat-btn:hover { background: #2ecc71; }

      /* Skill Window */
      .skill-list {
        padding: 10px;
        display: flex;
        flex-direction: column;
        gap: 6px;
        min-width: 280px;
      }
      .skill-item {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 6px;
        background: rgba(30, 42, 58, 0.7);
        border: 1px solid #4a627a;
        border-radius: 4px;
        cursor: pointer;
      }
      .skill-item:hover { border-color: #3498db; }
      .skill-icon { font-size: 24px; }
      .skill-details { flex: 1; }
      .skill-name { font-weight: bold; font-size: 12px; color: #fff; }
      .skill-desc { font-size: 10px; color: #bdc3c7; }
    `;
    document.head.appendChild(style);
  }

  private buildInventoryWindow(): void {
    this.inventoryWindow = document.createElement('div');
    this.inventoryWindow.className = 'flyff-win';
    this.inventoryWindow.style.top = '120px';
    this.inventoryWindow.style.right = '20px';

    this.inventoryWindow.innerHTML = `
      <div class="win-header">
        <span>🎒 Inventory (I)</span>
        <button class="win-close-btn" id="btn-close-inv">×</button>
      </div>
      <div class="inv-grid" id="inv-grid-container"></div>
      <div class="inv-footer">
        <span>💰 Penya: <b id="inv-penya">500</b></span>
        <span>Slots: 42</span>
      </div>
    `;

    this.container.appendChild(this.inventoryWindow);
    this.makeDraggable(this.inventoryWindow);

    document.getElementById('btn-close-inv')?.addEventListener('click', () => {
      this.toggleWindow('inventory');
    });

    this.refreshInventoryUI();
  }

  private buildStatusWindow(): void {
    this.statusWindow = document.createElement('div');
    this.statusWindow.className = 'flyff-win';
    this.statusWindow.style.top = '120px';
    this.statusWindow.style.left = '20px';

    this.statusWindow.innerHTML = `
      <div class="win-header">
        <span>📜 Character Status (C)</span>
        <button class="win-close-btn" id="btn-close-status">×</button>
      </div>
      <div class="status-content">
        <div class="status-row"><span>Name:</span><b id="st-name">${this.playerStats.name}</b></div>
        <div class="status-row"><span>Job:</span><b id="st-job">${this.playerStats.job}</b></div>
        <div class="status-row"><span>Level:</span><b id="st-level">${this.playerStats.level}</b></div>
        <div class="status-row"><span>HP:</span><b id="st-hp">${this.playerStats.hp} / ${this.playerStats.maxHp}</b></div>
        <div class="status-row"><span>MP:</span><b id="st-mp">${this.playerStats.mp} / ${this.playerStats.maxMp}</b></div>
        <div class="status-row"><span>FP:</span><b id="st-fp">${this.playerStats.fp} / ${this.playerStats.maxFp}</b></div>
        <div class="status-row">
          <span>STR (Strength):</span>
          <div><b>15</b> <button class="status-stat-btn" data-stat="str">+</button></div>
        </div>
        <div class="status-row">
          <span>STA (Stamina):</span>
          <div><b>15</b> <button class="status-stat-btn" data-stat="sta">+</button></div>
        </div>
        <div class="status-row">
          <span>DEX (Dexterity):</span>
          <div><b>15</b> <button class="status-stat-btn" data-stat="dex">+</button></div>
        </div>
        <div class="status-row">
          <span>INT (Intelligence):</span>
          <div><b>15</b> <button class="status-stat-btn" data-stat="int">+</button></div>
        </div>
      </div>
    `;

    this.container.appendChild(this.statusWindow);
    this.makeDraggable(this.statusWindow);

    document.getElementById('btn-close-status')?.addEventListener('click', () => {
      this.toggleWindow('status');
    });

    this.statusWindow.querySelectorAll('.status-stat-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const stat = (e.target as HTMLElement).getAttribute('data-stat') as 'str' | 'sta' | 'dex' | 'int';
        if (this.onStatPointAllocated) {
          this.onStatPointAllocated(stat);
        }
      });
    });
  }

  private buildSkillWindow(): void {
    this.skillWindow = document.createElement('div');
    this.skillWindow.className = 'flyff-win';
    this.skillWindow.style.top = '160px';
    this.skillWindow.style.left = '320px';

    this.skillWindow.innerHTML = `
      <div class="win-header">
        <span>⚔️ Skill Tree (K)</span>
        <button class="win-close-btn" id="btn-close-skills">×</button>
      </div>
      <div class="skill-list">
        <div class="skill-item">
          <div class="skill-icon">🗡️</div>
          <div class="skill-details">
            <div class="skill-name">Clean Hit (Lv. 1)</div>
            <div class="skill-desc">Basic melee strike dealing 120% weapon damage. (FP: 10)</div>
          </div>
        </div>
        <div class="skill-item">
          <div class="skill-icon">🌪️</div>
          <div class="skill-details">
            <div class="skill-name">Flurry (Lv. 1)</div>
            <div class="skill-desc">Rapid two-hit combo striking target enemy. (FP: 15)</div>
          </div>
        </div>
        <div class="skill-item">
          <div class="skill-icon">✨</div>
          <div class="skill-details">
            <div class="skill-name">Mental Sign (Lv. 1)</div>
            <div class="skill-desc">Increases INT by +5 for 180 seconds. (MP: 25)</div>
          </div>
        </div>
      </div>
    `;

    this.container.appendChild(this.skillWindow);
    this.makeDraggable(this.skillWindow);

    document.getElementById('btn-close-skills')?.addEventListener('click', () => {
      this.toggleWindow('skill');
    });
  }

  private setupShortcuts(): void {
    window.addEventListener('keydown', (e) => {
      if ((e.target as HTMLElement).tagName === 'INPUT') return;

      if (e.key === 'i' || e.key === 'I') {
        this.toggleWindow('inventory');
      } else if (e.key === 'c' || e.key === 'C') {
        this.toggleWindow('status');
      } else if (e.key === 'k' || e.key === 'K') {
        this.toggleWindow('skill');
      }
    });
  }

  public toggleWindow(type: 'inventory' | 'status' | 'skill'): void {
    let win: HTMLElement | null = null;
    if (type === 'inventory') win = this.inventoryWindow;
    if (type === 'status') win = this.statusWindow;
    if (type === 'skill') win = this.skillWindow;

    if (win) {
      const isVisible = win.style.display === 'block';
      win.style.display = isVisible ? 'none' : 'block';
    }
  }

  public refreshInventoryUI(): void {
    const grid = document.getElementById('inv-grid-container');
    if (!grid) return;
    grid.innerHTML = '';

    const slots = this.inventorySystem.getSlots();
    slots.forEach((slot) => {
      const div = document.createElement('div');
      div.className = 'inv-slot';
      div.setAttribute('data-slot', slot.slotIndex.toString());

      if (slot.item) {
        div.innerHTML = `
          <span>${slot.item.icon}</span>
          ${slot.item.count > 1 ? `<span class="inv-slot-count">${slot.item.count}</span>` : ''}
        `;
        div.title = `${slot.item.name}\n${slot.item.description}`;

        // Right-Click to Use item
        div.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          if (slot.item && this.onUseItemCallback) {
            this.onUseItemCallback(slot.item, slot.slotIndex);
          }
        });
      }

      grid.appendChild(div);
    });
  }

  public updateStats(stats: PlayerStats): void {
    this.playerStats = stats;
    const elHp = document.getElementById('st-hp');
    const elMp = document.getElementById('st-mp');
    const elFp = document.getElementById('st-fp');
    const elLevel = document.getElementById('st-level');
    const elPenya = document.getElementById('inv-penya');

    if (elHp) elHp.textContent = `${Math.floor(stats.hp)} / ${stats.maxHp}`;
    if (elMp) elMp.textContent = `${Math.floor(stats.mp)} / ${stats.maxMp}`;
    if (elFp) elFp.textContent = `${Math.floor(stats.fp)} / ${stats.maxFp}`;
    if (elLevel) elLevel.textContent = stats.level.toString();
    if (elPenya) elPenya.textContent = stats.penya.toLocaleString();
  }

  private makeDraggable(win: HTMLElement): void {
    const header = win.querySelector('.win-header') as HTMLElement;
    if (!header) return;

    let isDragging = false;
    let startX = 0;
    let startY = 0;

    header.addEventListener('mousedown', (e) => {
      isDragging = true;
      startX = e.clientX - win.offsetLeft;
      startY = e.clientY - win.offsetTop;
      win.style.zIndex = '200';
    });

    window.addEventListener('mousemove', (e) => {
      if (isDragging) {
        win.style.left = `${Math.max(0, e.clientX - startX)}px`;
        win.style.top = `${Math.max(0, e.clientY - startY)}px`;
      }
    });

    window.addEventListener('mouseup', () => {
      isDragging = false;
      win.style.zIndex = '100';
    });
  }
}
