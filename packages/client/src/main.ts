import * as THREE from 'three';
import { WorldScene } from './renderer/scene';
import { FlyffHUD } from './ui/hud';
import { Entity } from './entities/character';
import { NetworkClient } from './network/client';
import { Opcode, EntitySpawnData, PlayerStats } from './network/protocol';
import { InventorySystem } from './systems/inventory';
import { WindowManager } from './ui/windows';
import { FlightSystem } from './systems/flight';

class FlyffGame {
  private container: HTMLElement;
  private scene: WorldScene;
  private hud: FlyffHUD;
  private network: NetworkClient;
  private inventory: InventorySystem;
  private windowManager: WindowManager;
  private flightSystem: FlightSystem;

  private entities = new Map<string, Entity>();
  private localPlayer!: Entity;
  private selectedEntity: Entity | null = null;

  // Local Player Stats
  private playerStats: PlayerStats = {
    id: 'local-player',
    name: 'HeroOfMadrigal',
    job: 'Vagrant',
    level: 1,
    hp: 120,
    maxHp: 120,
    mp: 60,
    maxMp: 60,
    fp: 75,
    maxFp: 75,
    exp: 25,
    maxExp: 100,
    penya: 500
  };

  // Input & Interaction
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  private isRightMouseDown = false;
  private previousMousePosition = { x: 0, y: 0 };
  private clock = new THREE.Clock();

  constructor() {
    this.container = document.getElementById('app')!;
    this.scene = new WorldScene(this.container);
    this.hud = new FlyffHUD(this.container);
    this.network = new NetworkClient();
    this.inventory = new InventorySystem();
    this.flightSystem = new FlightSystem();
    this.windowManager = new WindowManager(this.container, this.inventory, this.playerStats);

    this.initPlayer();
    this.setupHUDCallbacks();
    this.setupWindowCallbacks();
    this.setupInputHandlers();
    this.setupNetworkHandlers();
    this.spawnDemoEntities();

    // Try connecting to gateway (falls back smoothly to local standalone world)
    this.network.connect().then((connected) => {
      if (connected) {
        this.hud.addChatMessage('System', 'Connected to FlyFF WebSocket Gateway (Live Multiplayer)', 'system');
      } else {
        this.hud.addChatMessage('System', 'Running in Standalone Madrigal Sandbox Mode (Offline/Demo)', 'system');
      }
    });

    this.gameLoop();
  }

  private initPlayer(): void {
    const spawnData: EntitySpawnData = {
      id: 'local-player',
      type: 'player',
      name: this.playerStats.name,
      level: this.playerStats.level,
      hp: this.playerStats.hp,
      maxHp: this.playerStats.maxHp,
      position: { x: 0, y: 0, z: 0 },
      rotationY: 0,
      model: 'vagrant'
    };

    this.localPlayer = new Entity(spawnData);
    if (this.flightSystem.mountMesh) {
      this.flightSystem.mountMesh.position.y = 0.5;
      this.localPlayer.group.add(this.flightSystem.mountMesh);
    }

    this.scene.scene.add(this.localPlayer.group);
    this.hud.updatePlayerStats(this.playerStats);
  }

  private setupHUDCallbacks(): void {
    this.hud.setCallbacks({
      onSendMessage: (msg: string) => {
        this.hud.addChatMessage(this.playerStats.name, msg, 'user');
        if (this.network.isConnected) {
          this.network.sendChat(msg);
        }
      },
      onAttackTarget: () => {
        this.attackSelectedTarget();
      }
    });
  }

  private setupWindowCallbacks(): void {
    this.windowManager.setCallbacks({
      onUseItem: (item, slotIndex) => {
        if (item.type === 'consumable') {
          if (item.healHp) {
            this.playerStats.hp = Math.min(this.playerStats.maxHp, this.playerStats.hp + item.healHp);
            this.hud.addChatMessage('System', `Used ${item.name}! (+${item.healHp} HP)`, 'system');
          }
          if (item.healMp) {
            this.playerStats.mp = Math.min(this.playerStats.maxMp, this.playerStats.mp + item.healMp);
            this.hud.addChatMessage('System', `Used ${item.name}! (+${item.healMp} MP)`, 'system');
          }
          if (item.healFp) {
            this.playerStats.fp = Math.min(this.playerStats.maxFp, this.playerStats.fp + item.healFp);
            this.hud.addChatMessage('System', `Used ${item.name}! (+${item.healFp} FP)`, 'system');
          }
          this.inventory.removeItem(slotIndex, 1);
          this.hud.updatePlayerStats(this.playerStats);
          this.windowManager.updateStats(this.playerStats);
        } else if (item.type === 'flying') {
          this.toggleFlightMode();
        }
      },
      onStatPointAllocated: (stat) => {
        this.hud.addChatMessage('System', `Increased ${stat.toUpperCase()}!`, 'system');
      }
    });
  }

  private toggleFlightMode(): void {
    const isFlying = this.flightSystem.toggleFlight();
    if (isFlying) {
      this.hud.addChatMessage('System', 'Mounted flying vehicle! Press Space to ascend, Shift to descend.', 'system');
    } else {
      this.hud.addChatMessage('System', 'Landed back onto the ground.', 'system');
    }
  }

  private attackSelectedTarget(): void {
    if (!this.selectedEntity) {
      this.hud.addChatMessage('System', 'No target selected! Click a monster first.', 'combat');
      return;
    }

    const dist = this.localPlayer.group.position.distanceTo(this.selectedEntity.group.position);
    if (dist > 4.0) {
      this.hud.addChatMessage('System', 'Target is too far away!', 'combat');
      // Walk towards target
      this.localPlayer.setMoveTarget(this.selectedEntity.group.position);
      return;
    }

    // Perform attack
    const damage = Math.floor(Math.random() * 15) + 10;
    const newHp = this.selectedEntity.hp - damage;
    this.selectedEntity.updateHp(newHp);

    this.hud.addChatMessage(
      'Combat',
      `You hit [${this.selectedEntity.name}] for ${damage} damage!`,
      'combat'
    );

    if (this.network.isConnected) {
      this.network.sendAttack(this.selectedEntity.id);
    }

    if (newHp <= 0) {
      this.hud.addChatMessage(
        'Combat',
        `[${this.selectedEntity.name}] has been defeated! (+45 EXP, +80 Penya)`,
        'system'
      );
      this.playerStats.exp += 45;
      if (this.playerStats.exp >= this.playerStats.maxExp) {
        this.playerStats.level++;
        this.playerStats.exp -= this.playerStats.maxExp;
        this.playerStats.maxHp += 20;
        this.playerStats.hp = this.playerStats.maxHp;
        this.hud.addChatMessage('System', `🎉 Level Up! You reached Level ${this.playerStats.level}!`, 'system');
      }
      this.hud.updatePlayerStats(this.playerStats);

      // Despawn and remove target
      this.scene.scene.remove(this.selectedEntity.group);
      this.entities.delete(this.selectedEntity.id);
      this.selectedEntity = null;
      this.hud.hideTarget();
    } else {
      this.hud.showTarget(
        this.selectedEntity.name,
        this.selectedEntity.level,
        (this.selectedEntity.hp / this.selectedEntity.maxHp) * 100
      );
    }
  }

  private setupInputHandlers(): void {
    // Mouse Down (Click to target / Click to move / Right-Click orbit)
    window.addEventListener('mousedown', (e) => {
      if ((e.target as HTMLElement).closest('.hud-interactive')) return;

      if (e.button === 0) {
        // Left Click: Target or Move
        this.handleLeftClick(e);
      } else if (e.button === 2) {
        // Right Click: Camera Drag
        this.isRightMouseDown = true;
        this.previousMousePosition = { x: e.clientX, y: e.clientY };
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 2) {
        this.isRightMouseDown = false;
      }
    });

    window.addEventListener('contextmenu', (e) => e.preventDefault());

    // Mouse Move (Camera Orbit)
    window.addEventListener('mousemove', (e) => {
      if (this.isRightMouseDown) {
        const deltaX = e.clientX - this.previousMousePosition.x;
        const deltaY = e.clientY - this.previousMousePosition.y;

        this.scene.cameraYaw -= deltaX * 0.005;
        this.scene.cameraPitch += deltaY * 0.005;
        // Clamp pitch to avoid flipping
        this.scene.cameraPitch = Math.max(0.05, Math.min(Math.PI / 2.2, this.scene.cameraPitch));

        this.previousMousePosition = { x: e.clientX, y: e.clientY };
        this.scene.updateCameraPosition();
      }
    });

    // Mouse Wheel (Zoom in/out)
    window.addEventListener('wheel', (e) => {
      this.scene.cameraDistance = Math.max(3.0, Math.min(25.0, this.scene.cameraDistance + e.deltaY * 0.01));
      this.scene.updateCameraPosition();
    });

    // Keyboard Shortcuts (WASD Movement & Attack slot 1)
    window.addEventListener('keydown', (e) => {
      if ((e.target as HTMLElement).tagName === 'INPUT') return;

      if (e.key === '1') {
        this.attackSelectedTarget();
      } else if (e.key === '4') {
        this.toggleFlightMode();
      } else if (e.key === 'Tab') {
        e.preventDefault();
        this.selectNearestMonster();
      } else if (e.key === ' ') {
        if (this.flightSystem.isFlying) {
          this.flightSystem.adjustAltitude(1.5);
        }
      } else if (e.key === 'Shift') {
        if (this.flightSystem.isFlying) {
          this.flightSystem.adjustAltitude(-1.5);
        }
      }
    });
  }

  private handleLeftClick(e: MouseEvent): void {
    this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.scene.camera);

    // 1. Check if an entity was clicked
    let clickedEntity: Entity | null = null;
    for (const ent of this.entities.values()) {
      const hits = this.raycaster.intersectObjects(ent.group.children, true);
      if (hits.length > 0) {
        clickedEntity = ent;
        break;
      }
    }

    if (clickedEntity) {
      this.selectEntity(clickedEntity);
      return;
    }

    // 2. Otherwise raycast onto ground plane for Click-to-Move
    const groundHits = this.raycaster.intersectObjects(this.scene.scene.children, false);
    for (const hit of groundHits) {
      if (hit.point) {
        const dest = hit.point;
        this.localPlayer.setMoveTarget({ x: dest.x, y: 0, z: dest.z });

        // Face towards move destination
        const dir = new THREE.Vector3().subVectors(dest, this.localPlayer.group.position);
        this.localPlayer.group.rotation.y = Math.atan2(dir.x, dir.z);

        if (this.network.isConnected) {
          this.network.sendMove({ x: dest.x, y: 0, z: dest.z }, this.localPlayer.group.rotation.y);
        }
        break;
      }
    }
  }

  private selectEntity(entity: Entity): void {
    if (this.selectedEntity) {
      this.selectedEntity.setSelected(false);
    }
    this.selectedEntity = entity;
    entity.setSelected(true);

    const hpPercent = (entity.hp / entity.maxHp) * 100;
    this.hud.showTarget(entity.name, entity.level, hpPercent);
  }

  private selectNearestMonster(): void {
    let nearest: Entity | null = null;
    let minDistance = Infinity;

    for (const ent of this.entities.values()) {
      if (ent.type === 'monster') {
        const d = this.localPlayer.group.position.distanceTo(ent.group.position);
        if (d < minDistance) {
          minDistance = d;
          nearest = ent;
        }
      }
    }

    if (nearest) {
      this.selectEntity(nearest);
    }
  }

  private spawnDemoEntities(): void {
    // Spawns familiar FlyFF mobs around Flaris
    const demoMobs: EntitySpawnData[] = [
      { id: 'mob-1', type: 'monster', name: 'Small Aibatt', level: 1, hp: 50, maxHp: 50, position: { x: -6, y: 0, z: -8 }, rotationY: 0, model: 'aibatt' },
      { id: 'mob-2', type: 'monster', name: 'Aibatt', level: 2, hp: 70, maxHp: 70, position: { x: 7, y: 0, z: -10 }, rotationY: 0.5, model: 'aibatt' },
      { id: 'mob-3', type: 'monster', name: 'Big Aibatt', level: 3, hp: 110, maxHp: 110, position: { x: 12, y: 0, z: 6 }, rotationY: -1.2, model: 'aibatt' },
      { id: 'mob-4', type: 'monster', name: 'Small Lawolf', level: 5, hp: 160, maxHp: 160, position: { x: -14, y: 0, z: 12 }, rotationY: 2.1, model: 'lawolf' },
      { id: 'npc-1', type: 'npc', name: 'Buff Pang', level: 100, hp: 9999, maxHp: 9999, position: { x: -3, y: 0, z: -2 }, rotationY: 0, model: 'pang' },
      { id: 'npc-2', type: 'npc', name: 'Mayor of Flaris', level: 80, hp: 5000, maxHp: 5000, position: { x: 4, y: 0, z: -2 }, rotationY: -0.8, model: 'mayor' }
    ];

    demoMobs.forEach((data) => {
      const entity = new Entity(data);
      this.entities.set(data.id, entity);
      this.scene.scene.add(entity.group);
    });
  }

  private setupNetworkHandlers(): void {
    this.network.on(Opcode.S2C_SPAWN_ENTITY, (payload) => {
      const data = payload as EntitySpawnData;
      if (this.entities.has(data.id)) return;
      const entity = new Entity(data);
      this.entities.set(data.id, entity);
      this.scene.scene.add(entity.group);
    });

    this.network.on(Opcode.S2C_DESPAWN_ENTITY, (payload) => {
      const { id } = payload as { id: string };
      const entity = this.entities.get(id);
      if (entity) {
        this.scene.scene.remove(entity.group);
        this.entities.delete(id);
        if (this.selectedEntity?.id === id) {
          this.selectedEntity = null;
          this.hud.hideTarget();
        }
      }
    });

    this.network.on(Opcode.S2C_ENTITY_MOVE, (payload) => {
      const { id, position, rotationY } = payload as { id: string; position: { x: number; y: number; z: number }; rotationY: number };
      const entity = this.entities.get(id);
      if (entity) {
        entity.setMoveTarget(position, rotationY);
      }
    });

    this.network.on(Opcode.S2C_CHAT, (payload) => {
      const { sender, message, type } = payload as { sender: string; message: string; type?: 'system' | 'user' | 'combat' };
      this.hud.addChatMessage(sender, message, type || 'user');
    });
  }

  private gameLoop(): void {
    requestAnimationFrame(this.gameLoop.bind(this));

    const delta = this.clock.getDelta();

    // 1. Update Flight Dynamics
    this.flightSystem.update(delta, this.localPlayer.group.position);

    // 2. Update Local Player
    this.localPlayer.update(delta);

    // 3. Camera follows Local Player
    this.scene.cameraTarget.copy(this.localPlayer.group.position).add(new THREE.Vector3(0, 1.4, 0));
    this.scene.updateCameraPosition();

    // 3. Update Other Entities (interpolation, AI wander)
    for (const entity of this.entities.values()) {
      entity.update(delta);

      // Simple wandering behavior in demo mode
      if (entity.type === 'monster' && Math.random() < 0.003) {
        const rx = entity.group.position.x + (Math.random() - 0.5) * 6;
        const rz = entity.group.position.z + (Math.random() - 0.5) * 6;
        entity.setMoveTarget({ x: rx, y: 0, z: rz });
      }
    }

    // 4. Render 3D Scene
    this.scene.render();
  }
}

// Bootstrap
window.addEventListener('DOMContentLoaded', () => {
  new FlyffGame();
});
