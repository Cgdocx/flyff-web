import * as net from 'net';
import { WebSocket } from 'ws';

export interface TcpProxyConfig {
  tcpHost: string;
  tcpPort: number;
}

/**
 * Bridges Browser WebSocket connections to FlyFF C++ Server TCP sockets
 * (e.g. WorldServer at port 3101, LoginServer at port 23000).
 */
export class FlyffTcpProxy {
  private config: TcpProxyConfig;

  constructor(config: TcpProxyConfig) {
    this.config = config;
  }

  public bridge(ws: WebSocket): void {
    console.log(`[TCP Proxy] Connecting to FlyFF C++ Server at ${this.config.tcpHost}:${this.config.tcpPort}...`);
    const tcpSocket = new net.Socket();

    tcpSocket.connect(this.config.tcpPort, this.config.tcpHost, () => {
      console.log(`[TCP Proxy] Connected to FlyFF C++ Server (${this.config.tcpHost}:${this.config.tcpPort})`);
    });

    // TCP -> WebSocket
    tcpSocket.on('data', (data) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    });

    // WebSocket -> TCP
    ws.on('message', (message) => {
      if (Buffer.isBuffer(message)) {
        tcpSocket.write(message);
      } else if (typeof message === 'string') {
        tcpSocket.write(Buffer.from(message));
      }
    });

    tcpSocket.on('close', () => {
      console.log('[TCP Proxy] FlyFF C++ Server TCP connection closed');
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    });

    tcpSocket.on('error', (err) => {
      console.warn(`[TCP Proxy] C++ Server TCP error: ${err.message}`);
      tcpSocket.destroy();
    });

    ws.on('close', () => {
      tcpSocket.destroy();
    });
  }
}
