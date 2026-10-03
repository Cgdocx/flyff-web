import { PlayerStats } from '../network/protocol';

export class FlyffHUD {
  private container: HTMLElement;
  private onSendMessageCallback?: (msg: string) => void;
  private onAttackTargetCallback?: () => void;

  constructor(container: HTMLElement) {
    this.container = container;
    this.injectStyles();
    this.buildHUD();
  }

  public setCallbacks(callbacks: {
    onSendMessage: (msg: string) => void;
    onAttackTarget: () => void;
  }): void {
    this.onSendMessageCallback = callbacks.onSendMessage;
    this.onAttackTargetCallback = callbacks.onAttackTarget;
  }

  private injectStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      .flyff-hud {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        user-select: none;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      }
      .hud-interactive {
        pointer-events: auto;
      }

      /* Player Status Bar */
      .player-status-box {
        position: absolute;
        top: 15px;
        left: 15px;
        background: linear-gradient(180deg, rgba(30, 40, 55, 0.92) 0%, rgba(15, 20, 30, 0.95) 100%);
        border: 2px solid #5a7590;
        border-radius: 8px;
        padding: 10px 14px;
        color: #fff;
        box-shadow: 0 4px 15px rgba(0,0,0,0.5);
        min-width: 250px;
      }
      .player-info-row {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 6px;
      }
      .player-level-badge {
        background: #e67e22;
        color: #fff;
        font-weight: bold;
        font-size: 11px;
        padding: 2px 6px;
        border-radius: 4px;
      }
      .player-name {
        font-weight: bold;
        font-size: 15px;
        text-shadow: 1px 1px 2px #000;
      }
      .player-job {
        font-size: 11px;
        color: #95a5a6;
      }

      /* Gauges */
      .gauge-row {
        display: flex;
        align-items: center;
        margin: 3px 0;
        font-size: 10px;
        font-weight: bold;
      }
      .gauge-label {
        width: 24px;
        text-shadow: 1px 1px 1px #000;
      }
      .gauge-track {
        flex: 1;
        height: 12px;
        background: rgba(0,0,0,0.6);
        border: 1px solid #444;
        border-radius: 3px;
        overflow: hidden;
        position: relative;
      }
      .gauge-fill {
        height: 100%;
        transition: width 0.2s ease-out;
      }
      .gauge-hp { background: linear-gradient(90deg, #e74c3c, #2ecc71); }
      .gauge-mp { background: linear-gradient(90deg, #2980b9, #3498db); }
      .gauge-fp { background: linear-gradient(90deg, #f39c12, #f1c40f); }
      .gauge-exp { background: linear-gradient(90deg, #8e44ad, #9b59b6); }

      .gauge-text {
        position: absolute;
        width: 100%;
        text-align: center;
        top: 0;
        line-height: 12px;
        font-size: 9px;
        color: #fff;
        text-shadow: 1px 1px 1px #000;
      }

      /* Target Bar */
      .target-status-box {
        position: absolute;
        top: 15px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(20, 20, 25, 0.9);
        border: 2px solid #e74c3c;
        border-radius: 6px;
        padding: 8px 16px;
        color: #fff;
        min-width: 240px;
        display: none;
        box-shadow: 0 4px 15px rgba(231, 76, 60, 0.3);
      }
      .target-header {
        display: flex;
        justify-content: space-between;
        font-size: 13px;
        font-weight: bold;
        margin-bottom: 4px;
      }

      /* Chat Window */
      .chat-box {
        position: absolute;
        bottom: 75px;
        left: 15px;
        width: 380px;
        height: 180px;
        background: rgba(10, 15, 25, 0.85);
        border: 1px solid #34495e;
        border-radius: 6px;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }
      .chat-messages {
        flex: 1;
        padding: 8px;
        overflow-y: auto;
        font-size: 12px;
        color: #ecf0f1;
        display: flex;
        flex-direction: column;
        gap: 3px;
      }
      .chat-msg-system { color: #f1c40f; }
      .chat-msg-user { color: #ecf0f1; }
      .chat-msg-combat { color: #e74c3c; }
      .chat-input-bar {
        display: flex;
        border-top: 1px solid #34495e;
        background: rgba(15, 20, 30, 0.95);
      }
      .chat-input-bar input {
        flex: 1;
        background: transparent;
        border: none;
        padding: 6px 10px;
        color: #fff;
        font-size: 12px;
        outline: none;
      }

      /* Action Bar */
      .action-bar {
        position: absolute;
        bottom: 15px;
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        gap: 6px;
        background: rgba(15, 20, 30, 0.85);
        border: 2px solid #5a7590;
        border-radius: 8px;
        padding: 6px 10px;
      }
      .action-slot {
        width: 44px;
        height: 44px;
        background: rgba(30, 40, 50, 0.9);
        border: 1px solid #7f8c8d;
        border-radius: 4px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        color: #bdc3c7;
        font-size: 11px;
        cursor: pointer;
        position: relative;
        transition: all 0.1s;
      }
      .action-slot:hover {
        border-color: #f1c40f;
        background: rgba(45, 60, 80, 0.9);
      }
      .action-key {
        position: absolute;
        top: 2px;
        left: 4px;
        font-size: 9px;
        color: #95a5a6;
      }
      .action-name {
        margin-top: 8px;
        font-size: 10px;
        color: #fff;
      }

      /* Minimap */
      .minimap-box {
        position: absolute;
        top: 15px;
        right: 15px;
        width: 140px;
        height: 140px;
        border-radius: 50%;
        border: 3px solid #5a7590;
        background: radial-gradient(circle, #2d5a27 0%, #173812 80%, #0d200a 100%);
        box-shadow: 0 4px 15px rgba(0,0,0,0.6);
        position: relative;
        overflow: hidden;
      }
      .minimap-center {
        position: absolute;
        top: 50%;
        left: 50%;
        width: 8px;
        height: 8px;
        background: #f1c40f;
        border: 1px solid #000;
        border-radius: 50%;
        transform: translate(-50%, -50%);
      }
      .minimap-label {
        position: absolute;
        bottom: 6px;
        width: 100%;
        text-align: center;
        font-size: 10px;
        color: #ecf0f1;
        font-weight: bold;
        text-shadow: 1px 1px 2px #000;
      }
    `;
    document.head.appendChild(style);
  }

  private buildHUD(): void {
    const hud = document.createElement('div');
    hud.className = 'flyff-hud';
    hud.innerHTML = `
      <!-- Player Status -->
      <div class="player-status-box hud-interactive">
        <div class="player-info-row">
          <span class="player-level-badge" id="hud-level">Lv. 1</span>
          <span class="player-name" id="hud-name">Madrigal Adventurer</span>
          <span class="player-job" id="hud-job">(Vagrant)</span>
        </div>
        <div class="gauge-row">
          <span class="gauge-label" style="color: #e74c3c;">HP</span>
          <div class="gauge-track">
            <div class="gauge-fill gauge-hp" id="bar-hp" style="width: 100%;"></div>
            <div class="gauge-text" id="txt-hp">100 / 100</div>
          </div>
        </div>
        <div class="gauge-row">
          <span class="gauge-label" style="color: #3498db;">MP</span>
          <div class="gauge-track">
            <div class="gauge-fill gauge-mp" id="bar-mp" style="width: 100%;"></div>
            <div class="gauge-text" id="txt-mp">50 / 50</div>
          </div>
        </div>
        <div class="gauge-row">
          <span class="gauge-label" style="color: #f1c40f;">FP</span>
          <div class="gauge-track">
            <div class="gauge-fill gauge-fp" id="bar-fp" style="width: 100%;"></div>
            <div class="gauge-text" id="txt-fp">50 / 50</div>
          </div>
        </div>
        <div class="gauge-row">
          <span class="gauge-label" style="color: #9b59b6;">EXP</span>
          <div class="gauge-track">
            <div class="gauge-fill gauge-exp" id="bar-exp" style="width: 0%;"></div>
            <div class="gauge-text" id="txt-exp">0.00%</div>
          </div>
        </div>
      </div>

      <!-- Target Box -->
      <div class="target-status-box hud-interactive" id="target-box">
        <div class="target-header">
          <span id="target-name">Target</span>
          <span id="target-level" style="color: #e67e22;">Lv. 1</span>
        </div>
        <div class="gauge-track">
          <div class="gauge-fill gauge-hp" id="target-hp-bar" style="width: 100%;"></div>
          <div class="gauge-text" id="target-hp-txt">100%</div>
        </div>
      </div>

      <!-- Chat Box -->
      <div class="chat-box hud-interactive">
        <div class="chat-messages" id="chat-messages">
          <div class="chat-msg-system">★ Welcome to FlyFF Web Client (Flyff Universe Architecture)</div>
          <div class="chat-msg-system">Controls: Left-Click ground to move | Click monster to target | Right-Click + Drag to rotate camera</div>
        </div>
        <div class="chat-input-bar">
          <input type="text" id="chat-input" placeholder="Press Enter to chat..." />
        </div>
      </div>

      <!-- Action Bar -->
      <div class="action-bar hud-interactive">
        <div class="action-slot" id="action-attack">
          <span class="action-key">1</span>
          <span class="action-name">⚔️ Attack</span>
        </div>
        <div class="action-slot" id="action-skill1">
          <span class="action-key">2</span>
          <span class="action-name">💥 Slash</span>
        </div>
        <div class="action-slot" id="action-potion-hp">
          <span class="action-key">3</span>
          <span class="action-name">🧪 HP Pot</span>
        </div>
        <div class="action-slot" id="action-fly">
          <span class="action-key">4</span>
          <span class="action-name">🧹 Broom</span>
        </div>
        <div class="action-slot">
          <span class="action-key">5</span>
          <span class="action-name">-</span>
        </div>
      </div>

      <!-- Minimap -->
      <div class="minimap-box">
        <div class="minimap-center"></div>
        <div class="minimap-label">Flaris</div>
      </div>
    `;

    this.container.appendChild(hud);

    // Setup Chat Input Listeners
    const chatInput = document.getElementById('chat-input') as HTMLInputElement;
    chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const text = chatInput.value.trim();
        if (text) {
          if (this.onSendMessageCallback) {
            this.onSendMessageCallback(text);
          } else {
            this.addChatMessage('You', text, 'user');
          }
          chatInput.value = '';
        }
      }
    });

    // Action Bar Attack Button
    const attackBtn = document.getElementById('action-attack');
    attackBtn?.addEventListener('click', () => {
      if (this.onAttackTargetCallback) {
        this.onAttackTargetCallback();
      }
    });
  }

  public updatePlayerStats(stats: PlayerStats): void {
    const elName = document.getElementById('hud-name');
    const elLevel = document.getElementById('hud-level');
    const elJob = document.getElementById('hud-job');

    if (elName) elName.textContent = stats.name;
    if (elLevel) elLevel.textContent = `Lv. ${stats.level}`;
    if (elJob) elJob.textContent = `(${stats.job})`;

    this.setGauge('hp', stats.hp, stats.maxHp);
    this.setGauge('mp', stats.mp, stats.maxMp);
    this.setGauge('fp', stats.fp, stats.maxFp);

    const expPercent = stats.maxExp > 0 ? (stats.exp / stats.maxExp) * 100 : 0;
    const barExp = document.getElementById('bar-exp');
    const txtExp = document.getElementById('txt-exp');
    if (barExp) barExp.style.width = `${expPercent}%`;
    if (txtExp) txtExp.textContent = `${expPercent.toFixed(2)}%`;
  }

  private setGauge(type: 'hp' | 'mp' | 'fp', val: number, max: number): void {
    const percent = Math.max(0, Math.min(100, (val / max) * 100));
    const bar = document.getElementById(`bar-${type}`);
    const txt = document.getElementById(`txt-${type}`);
    if (bar) bar.style.width = `${percent}%`;
    if (txt) txt.textContent = `${Math.floor(val)} / ${max}`;
  }

  public showTarget(name: string, level: number, hpPercent: number): void {
    const box = document.getElementById('target-box');
    const tName = document.getElementById('target-name');
    const tLevel = document.getElementById('target-level');
    const bar = document.getElementById('target-hp-bar');
    const txt = document.getElementById('target-hp-txt');

    if (box) box.style.display = 'block';
    if (tName) tName.textContent = name;
    if (tLevel) tLevel.textContent = `Lv. ${level}`;
    if (bar) bar.style.width = `${Math.max(0, hpPercent)}%`;
    if (txt) txt.textContent = `${Math.floor(Math.max(0, hpPercent))}%`;
  }

  public hideTarget(): void {
    const box = document.getElementById('target-box');
    if (box) box.style.display = 'none';
  }

  public addChatMessage(sender: string, text: string, type: 'system' | 'user' | 'combat' = 'user'): void {
    const messages = document.getElementById('chat-messages');
    if (!messages) return;

    const div = document.createElement('div');
    div.className = `chat-msg-${type}`;
    div.textContent = sender ? `${sender}: ${text}` : text;
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
  }
}
