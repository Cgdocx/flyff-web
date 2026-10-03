export interface TouchJoystickOutput {
  moveX: number;
  moveY: number;
  isActive: boolean;
}

export class TouchController {
  private container: HTMLElement;
  public joystickOutput: TouchJoystickOutput = { moveX: 0, moveY: 0, isActive: false };

  // Callbacks
  private onAttackCallback?: () => void;
  private onFlyCallback?: () => void;
  private onTabCallback?: () => void;
  private onToggleInvCallback?: () => void;
  private onToggleStatCallback?: () => void;

  private joystickBase!: HTMLElement;
  private joystickThumb!: HTMLElement;
  private joystickTouchId: number | null = null;
  private joystickCenter = { x: 0, y: 0 };
  private readonly maxRadius = 45;

  constructor(container: HTMLElement) {
    this.container = container;
    this.injectMobileStyles();
    this.buildMobileUI();
    this.setupJoystickEvents();
  }

  public setCallbacks(callbacks: {
    onAttack: () => void;
    onFly: () => void;
    onTab: () => void;
    onToggleInv: () => void;
    onToggleStat: () => void;
  }): void {
    this.onAttackCallback = callbacks.onAttack;
    this.onFlyCallback = callbacks.onFly;
    this.onTabCallback = callbacks.onTab;
    this.onToggleInvCallback = callbacks.onToggleInv;
    this.onToggleStatCallback = callbacks.onToggleStat;
  }

  private injectMobileStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      /* Mobile Touch Virtual Joystick & Buttons */
      .mobile-touch-layer {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 150;
        user-select: none;
        touch-action: none;
      }
      .mobile-touch-interactive {
        pointer-events: auto;
      }

      /* Virtual Joystick on Left */
      .virtual-joystick-base {
        position: absolute;
        bottom: 35px;
        left: 35px;
        width: 110px;
        height: 110px;
        background: radial-gradient(circle, rgba(255,255,255,0.15) 0%, rgba(0,0,0,0.45) 80%);
        border: 2px solid rgba(255, 255, 255, 0.4);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        touch-action: none;
      }
      .virtual-joystick-thumb {
        width: 48px;
        height: 48px;
        background: radial-gradient(circle, #f39c12 0%, #d35400 100%);
        border: 2px solid #fff;
        border-radius: 50%;
        box-shadow: 0 4px 10px rgba(0,0,0,0.5);
        position: absolute;
        transform: translate(0px, 0px);
        pointer-events: none;
      }

      /* Mobile Action Buttons on Right */
      .mobile-action-cluster {
        position: absolute;
        bottom: 30px;
        right: 25px;
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 12px;
      }
      .mobile-btn-row {
        display: flex;
        gap: 10px;
      }
      .mobile-btn {
        width: 52px;
        height: 52px;
        border-radius: 50%;
        border: 2px solid rgba(255,255,255,0.8);
        color: #fff;
        font-weight: bold;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        font-size: 11px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.6);
        cursor: pointer;
        touch-action: manipulation;
        user-select: none;
      }
      .mobile-btn:active {
        transform: scale(0.92);
      }
      .btn-atk-main {
        width: 64px;
        height: 64px;
        background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
        font-size: 13px;
        border-color: #f1c40f;
      }
      .btn-fly-main {
        background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
      }
      .btn-target-main {
        background: linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%);
      }
      .btn-menu-small {
        width: 40px;
        height: 40px;
        background: rgba(30, 42, 58, 0.9);
        border: 1px solid #7f8c8d;
        font-size: 16px;
      }

      /* Top Menu for Mobile Screen */
      .mobile-top-bar {
        position: absolute;
        top: 15px;
        right: 15px;
        display: flex;
        gap: 8px;
        z-index: 150;
      }

      /* Responsive CSS for Mobile Screens */
      @media (max-width: 768px) {
        .player-status-box {
          top: 10px !important;
          left: 10px !important;
          min-width: 180px !important;
          padding: 6px 10px !important;
        }
        .player-name { font-size: 12px !important; }
        .gauge-track { height: 9px !important; }
        .gauge-text { line-height: 9px !important; font-size: 8px !important; }
        .minimap-box { display: none !important; }
        .chat-box {
          bottom: 120px !important;
          left: 10px !important;
          width: 220px !important;
          height: 100px !important;
          opacity: 0.85;
        }
        .action-bar { display: none !important; }
        .flyff-win {
          max-width: 90vw !important;
          left: 5vw !important;
          top: 70px !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  private buildMobileUI(): void {
    const layer = document.createElement('div');
    layer.className = 'mobile-touch-layer';
    layer.innerHTML = `
      <!-- Virtual Joystick -->
      <div class="virtual-joystick-base mobile-touch-interactive" id="v-joystick-base">
        <div class="virtual-joystick-thumb" id="v-joystick-thumb"></div>
      </div>

      <!-- Action Buttons -->
      <div class="mobile-action-cluster mobile-touch-interactive">
        <div class="mobile-btn-row">
          <div class="mobile-btn btn-target-main" id="btn-m-target">
            <span>🎯</span>
            <span style="font-size: 8px;">Target</span>
          </div>
          <div class="mobile-btn btn-fly-main" id="btn-m-fly">
            <span>🧹</span>
            <span style="font-size: 8px;">Fly</span>
          </div>
        </div>
        <div class="mobile-btn-row">
          <div class="mobile-btn btn-atk-main" id="btn-m-attack">
            <span>⚔️</span>
            <span style="font-size: 9px;">Attack</span>
          </div>
        </div>
      </div>

      <!-- Quick Windows Shortcut on top right -->
      <div class="mobile-top-bar mobile-touch-interactive">
        <div class="mobile-btn btn-menu-small" id="btn-m-inv" title="Inventory">🎒</div>
        <div class="mobile-btn btn-menu-small" id="btn-m-stat" title="Status">📜</div>
      </div>
    `;

    this.container.appendChild(layer);

    this.joystickBase = document.getElementById('v-joystick-base')!;
    this.joystickThumb = document.getElementById('v-joystick-thumb')!;

    // Mobile Action Button Listeners
    document.getElementById('btn-m-attack')?.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.onAttackCallback?.();
    });
    document.getElementById('btn-m-attack')?.addEventListener('click', () => {
      this.onAttackCallback?.();
    });

    document.getElementById('btn-m-fly')?.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.onFlyCallback?.();
    });
    document.getElementById('btn-m-fly')?.addEventListener('click', () => {
      this.onFlyCallback?.();
    });

    document.getElementById('btn-m-target')?.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.onTabCallback?.();
    });
    document.getElementById('btn-m-target')?.addEventListener('click', () => {
      this.onTabCallback?.();
    });

    document.getElementById('btn-m-inv')?.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.onToggleInvCallback?.();
    });
    document.getElementById('btn-m-inv')?.addEventListener('click', () => {
      this.onToggleInvCallback?.();
    });

    document.getElementById('btn-m-stat')?.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.onToggleStatCallback?.();
    });
    document.getElementById('btn-m-stat')?.addEventListener('click', () => {
      this.onToggleStatCallback?.();
    });
  }

  private setupJoystickEvents(): void {
    const handleTouchStart = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (this.joystickTouchId === null) {
          const rect = this.joystickBase.getBoundingClientRect();
          this.joystickCenter = {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2
          };
          this.joystickTouchId = touch.identifier;
          this.updateJoystick(touch.clientX, touch.clientY);
          break;
        }
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === this.joystickTouchId) {
          this.updateJoystick(touch.clientX, touch.clientY);
          break;
        }
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === this.joystickTouchId) {
          this.resetJoystick();
          break;
        }
      }
    };

    this.joystickBase.addEventListener('touchstart', handleTouchStart, { passive: false });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd, { passive: false });
    window.addEventListener('touchcancel', handleTouchEnd, { passive: false });

    // Desktop mouse fallback for testing joystick
    let isMouseDown = false;
    this.joystickBase.addEventListener('mousedown', (e) => {
      isMouseDown = true;
      const rect = this.joystickBase.getBoundingClientRect();
      this.joystickCenter = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      this.updateJoystick(e.clientX, e.clientY);
    });

    window.addEventListener('mousemove', (e) => {
      if (isMouseDown) {
        this.updateJoystick(e.clientX, e.clientY);
      }
    });

    window.addEventListener('mouseup', () => {
      if (isMouseDown) {
        isMouseDown = false;
        this.resetJoystick();
      }
    });
  }

  private updateJoystick(clientX: number, clientY: number): void {
    const deltaX = clientX - this.joystickCenter.x;
    const deltaY = clientY - this.joystickCenter.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    const clampedDist = Math.min(this.maxRadius, distance);
    const angle = Math.atan2(deltaY, deltaX);

    const thumbX = Math.cos(angle) * clampedDist;
    const thumbY = Math.sin(angle) * clampedDist;

    this.joystickThumb.style.transform = `translate(${thumbX}px, ${thumbY}px)`;

    this.joystickOutput = {
      moveX: thumbX / this.maxRadius,
      moveY: -thumbY / this.maxRadius,
      isActive: distance > 5
    };
  }

  private resetJoystick(): void {
    this.joystickTouchId = null;
    this.joystickThumb.style.transform = 'translate(0px, 0px)';
    this.joystickOutput = { moveX: 0, moveY: 0, isActive: false };
  }
}
