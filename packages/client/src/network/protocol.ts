export enum Opcode {
  // Handshake & Auth
  C2S_LOGIN_REQ = 0x01,
  S2C_LOGIN_RESP = 0x02,

  // Entity Lifecycle
  S2C_PLAYER_INIT = 0x10,
  S2C_SPAWN_ENTITY = 0x11,
  S2C_DESPAWN_ENTITY = 0x12,

  // Movement & State
  C2S_PLAYER_MOVE = 0x20,
  S2C_ENTITY_MOVE = 0x21,

  // Combat & Interaction
  C2S_TARGET = 0x30,
  C2S_ATTACK = 0x31,
  S2C_DAMAGE = 0x32,

  // Chat
  C2S_CHAT = 0x40,
  S2C_CHAT = 0x41,

  // Ping / KeepAlive
  PING = 0x90,
  PONG = 0x91
}

export interface PlayerStats {
  id: string;
  name: string;
  job: string;
  level: number;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  fp: number;
  maxFp: number;
  exp: number;
  maxExp: number;
  penya: number;
}

export interface EntitySpawnData {
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

export interface Packet<T = unknown> {
  op: Opcode;
  data: T;
}
