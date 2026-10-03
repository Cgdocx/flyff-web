import { Opcode, Packet } from './protocol';

export type PacketHandler = (data: unknown) => void;

export class NetworkClient {
  private ws: WebSocket | null = null;
  private url: string;
  private handlers = new Map<Opcode, PacketHandler[]>();
  public isConnected = false;

  constructor(url = 'ws://localhost:8080') {
    this.url = url;
  }

  public connect(): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          this.isConnected = true;
          console.log('[Network] Connected to FlyFF WebSocket Gateway');
          // Send Login Request
          this.send(Opcode.C2S_LOGIN_REQ, {
            token: 'guest-session',
            clientVersion: '1.0.0'
          });
          resolve(true);
        };

        this.ws.onmessage = (event) => {
          try {
            const packet = JSON.parse(event.data) as Packet;
            this.dispatch(packet.op, packet.data);
          } catch (e) {
            console.error('[Network] Failed to parse incoming packet:', e);
          }
        };

        this.ws.onclose = () => {
          this.isConnected = false;
          console.log('[Network] Gateway disconnected');
          resolve(false);
        };

        this.ws.onerror = (err) => {
          console.warn('[Network] WebSocket error (offline fallback mode available):', err);
          this.isConnected = false;
          resolve(false);
        };
      } catch (err) {
        console.warn('[Network] Connection failed:', err);
        resolve(false);
      }
    });
  }

  public on(op: Opcode, handler: PacketHandler): void {
    if (!this.handlers.has(op)) {
      this.handlers.set(op, []);
    }
    this.handlers.get(op)!.push(handler);
  }

  private dispatch(op: Opcode, data: unknown): void {
    const list = this.handlers.get(op);
    if (list) {
      for (const h of list) {
        h(data);
      }
    }
  }

  public send<T = unknown>(op: Opcode, data: T): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const packet: Packet<T> = { op, data };
      this.ws.send(JSON.stringify(packet));
    }
  }

  public sendMove(position: { x: number; y: number; z: number }, rotationY: number): void {
    this.send(Opcode.C2S_PLAYER_MOVE, { position, rotationY });
  }

  public sendChat(message: string): void {
    this.send(Opcode.C2S_CHAT, { message });
  }

  public sendAttack(targetId: string): void {
    this.send(Opcode.C2S_ATTACK, { targetId });
  }
}
