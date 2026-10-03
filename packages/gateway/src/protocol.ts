export enum Opcode {
  C2S_LOGIN_REQ = 0x01,
  S2C_LOGIN_RESP = 0x02,

  S2C_PLAYER_INIT = 0x10,
  S2C_SPAWN_ENTITY = 0x11,
  S2C_DESPAWN_ENTITY = 0x12,

  C2S_PLAYER_MOVE = 0x20,
  S2C_ENTITY_MOVE = 0x21,

  C2S_TARGET = 0x30,
  C2S_ATTACK = 0x31,
  S2C_DAMAGE = 0x32,

  C2S_CHAT = 0x40,
  S2C_CHAT = 0x41,

  PING = 0x90,
  PONG = 0x91
}

export interface Packet<T = unknown> {
  op: Opcode;
  data: T;
}
