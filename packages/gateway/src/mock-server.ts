import { WebSocket } from 'ws';
import { Opcode, Packet } from './protocol.js';

interface ClientSession {
  id: string;
  ws: WebSocket;
  name: string;
  level: number;
  position: { x: number; y: number; z: number };
  rotationY: number;
}

interface WorldEntity {
  id: string;
  type: 'player' | 'monster' | 'npc';
  name: string;
  level: number;
  hp: number;
  maxHp: number;
  position: { x: number; y: number; z: number };
  rotationY: number;
  model: string;
}

export class MockMadrigalServer {
  private clients = new Map<WebSocket, ClientSession>();
  private entities = new Map<string, WorldEntity>();
  private nextEntityId = 1000;

  constructor() {
    this.seedWorldEntities();
    this.startWorldLoop();
  }

  private seedWorldEntities(): void {
    const defaultMobs: WorldEntity[] = [
      { id: 'mob-1', type: 'monster', name: 'Small Aibatt', level: 1, hp: 50, maxHp: 50, position: { x: -8, y: 0, z: -6 }, rotationY: 0, model: 'aibatt' },
      { id: 'mob-2', type: 'monster', name: 'Aibatt', level: 2, hp: 70, maxHp: 70, position: { x: 9, y: 0, z: -8 }, rotationY: 0, model: 'aibatt' },
      { id: 'mob-3', type: 'monster', name: 'Small Lawolf', level: 5, hp: 160, maxHp: 160, position: { x: -12, y: 0, z: 10 }, rotationY: 0, model: 'lawolf' },
      { id: 'npc-1', type: 'npc', name: 'Buff Pang', level: 100, hp: 9999, maxHp: 9999, position: { x: -3, y: 0, z: -2 }, rotationY: 0, model: 'pang' },
      { id: 'npc-2', type: 'npc', name: 'Mayor of Flaris', level: 80, hp: 5000, maxHp: 5000, position: { x: 4, y: 0, z: -2 }, rotationY: -0.8, model: 'mayor' }
    ];

    for (const mob of defaultMobs) {
      this.entities.set(mob.id, mob);
    }
  }

  public handleConnection(ws: WebSocket): void {
    const clientId = `player-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const session: ClientSession = {
      id: clientId,
      ws,
      name: `Adventurer_${Math.floor(Math.random() * 900) + 100}`,
      level: 1,
      position: { x: 0, y: 0, z: 0 },
      rotationY: 0
    };

    this.clients.set(ws, session);
    console.log(`[Gateway] Player connected: ${session.name} (${clientId})`);

    // 1. Send Login Response & Init
    this.send(ws, Opcode.S2C_LOGIN_RESP, { success: true, playerId: clientId });

    // 2. Send all existing world entities to this player
    for (const entity of this.entities.values()) {
      this.send(ws, Opcode.S2C_SPAWN_ENTITY, entity);
    }

    // 3. Send all currently online other players
    for (const [otherWs, otherSession] of this.clients.entries()) {
      if (otherWs !== ws) {
        this.send(ws, Opcode.S2C_SPAWN_ENTITY, {
          id: otherSession.id,
          type: 'player',
          name: otherSession.name,
          level: otherSession.level,
          hp: 120,
          maxHp: 120,
          position: otherSession.position,
          rotationY: otherSession.rotationY,
          model: 'vagrant'
        });
      }
    }

    // 4. Broadcast new player to all others
    this.broadcastExcept(ws, Opcode.S2C_SPAWN_ENTITY, {
      id: session.id,
      type: 'player',
      name: session.name,
      level: session.level,
      hp: 120,
      maxHp: 120,
      position: session.position,
      rotationY: session.rotationY,
      model: 'vagrant'
    });

    // 5. Welcome Chat
    this.send(ws, Opcode.S2C_CHAT, {
      sender: 'Server',
      message: `Welcome to FlyFF Madrigal Sandbox Server! (${this.clients.size} player(s) online)`,
      type: 'system'
    });
  }

  public handleDisconnection(ws: WebSocket): void {
    const session = this.clients.get(ws);
    if (session) {
      console.log(`[Gateway] Player disconnected: ${session.name}`);
      this.broadcast(Opcode.S2C_DESPAWN_ENTITY, { id: session.id });
      this.clients.delete(ws);
    }
  }

  public handleMessage(ws: WebSocket, rawMessage: string): void {
    try {
      const packet = JSON.parse(rawMessage) as Packet;
      const session = this.clients.get(ws);
      if (!session) return;

      switch (packet.op) {
        case Opcode.C2S_PLAYER_MOVE: {
          const { position, rotationY } = packet.data as { position: { x: number; y: number; z: number }; rotationY: number };
          session.position = position;
          session.rotationY = rotationY;
          this.broadcastExcept(ws, Opcode.S2C_ENTITY_MOVE, {
            id: session.id,
            position,
            rotationY
          });
          break;
        }

        case Opcode.C2S_CHAT: {
          const { message } = packet.data as { message: string };
          this.broadcast(Opcode.S2C_CHAT, {
            sender: session.name,
            message,
            type: 'user'
          });
          break;
        }

        case Opcode.C2S_ATTACK: {
          const { targetId } = packet.data as { targetId: string };
          const entity = this.entities.get(targetId);
          if (entity) {
            const damage = Math.floor(Math.random() * 20) + 10;
            entity.hp = Math.max(0, entity.hp - damage);

            this.broadcast(Opcode.S2C_DAMAGE, {
              targetId,
              attackerId: session.id,
              damage,
              remainingHp: entity.hp
            });

            if (entity.hp <= 0) {
              // Mob defeated: respawn after 5 seconds
              this.broadcast(Opcode.S2C_DESPAWN_ENTITY, { id: entity.id });
              setTimeout(() => {
                entity.hp = entity.maxHp;
                entity.position.x = (Math.random() - 0.5) * 20;
                entity.position.z = (Math.random() - 0.5) * 20;
                this.broadcast(Opcode.S2C_SPAWN_ENTITY, entity);
              }, 5000);
            }
          }
          break;
        }
      }
    } catch (e) {
      console.error('[Gateway] Failed to handle message:', e);
    }
  }

  private startWorldLoop(): void {
    // Wander AI every 3 seconds
    setInterval(() => {
      for (const entity of this.entities.values()) {
        if (entity.type === 'monster') {
          entity.position.x += (Math.random() - 0.5) * 2.5;
          entity.position.z += (Math.random() - 0.5) * 2.5;
          this.broadcast(Opcode.S2C_ENTITY_MOVE, {
            id: entity.id,
            position: entity.position,
            rotationY: Math.random() * Math.PI * 2
          });
        }
      }
    }, 3500);
  }

  private send<T = unknown>(ws: WebSocket, op: Opcode, data: T): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ op, data }));
    }
  }

  private broadcast<T = unknown>(op: Opcode, data: T): void {
    const msg = JSON.stringify({ op, data });
    for (const client of this.clients.values()) {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(msg);
      }
    }
  }

  private broadcastExcept<T = unknown>(senderWs: WebSocket, op: Opcode, data: T): void {
    const msg = JSON.stringify({ op, data });
    for (const [ws] of this.clients.entries()) {
      if (ws !== senderWs && ws.readyState === WebSocket.OPEN) {
        ws.send(msg);
      }
    }
  }
}
