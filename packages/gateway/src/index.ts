import { WebSocketServer, WebSocket } from 'ws';
import { MockMadrigalServer } from './mock-server.js';
import { FlyffTcpProxy } from './tcp-proxy.js';

const PORT = parseInt(process.env.PORT || '8080', 10);
const MODE = (process.env.GATEWAY_MODE || 'MOCK').toUpperCase(); // MOCK | PROXY
const TCP_HOST = process.env.FLYFF_TCP_HOST || '127.0.0.1';
const TCP_PORT = parseInt(process.env.FLYFF_TCP_PORT || '3101', 10); // WorldServer default

console.log('========================================================');
console.log('       FLYFF WEB GATEWAY & MULTIPLAYER SERVER           ');
console.log('========================================================');
console.log(`Port:        ${PORT}`);
console.log(`Mode:        ${MODE}`);
if (MODE === 'PROXY') {
  console.log(`Target TCP:  ${TCP_HOST}:${TCP_PORT} (WorldServer)`);
}
console.log('========================================================\n');

const wss = new WebSocketServer({ port: PORT });
const mockServer = new MockMadrigalServer();
const tcpProxy = new FlyffTcpProxy({ tcpHost: TCP_HOST, tcpPort: TCP_PORT });

wss.on('connection', (ws: WebSocket) => {
  if (MODE === 'PROXY') {
    tcpProxy.bridge(ws);
  } else {
    mockServer.handleConnection(ws);

    ws.on('message', (data) => {
      mockServer.handleMessage(ws, data.toString());
    });

    ws.on('close', () => {
      mockServer.handleDisconnection(ws);
    });
  }
});

wss.on('listening', () => {
  console.log(`[Gateway] WebSocket server listening on ws://localhost:${PORT}`);
});
