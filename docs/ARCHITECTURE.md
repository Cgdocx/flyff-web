# FlyFF Web Architecture Guide

สถาปัตยกรรมระบบการพอร์ต FlyFF สู่ Web Browser ตามแนวทาง Flyff Universe (Project M)

---

## 1. เปรียบเทียบสถาปัตยกรรม

| มิติ | Neuz ดั้งเดิม (C++) | Flyff Web (สถาปัตยกรรมนี้) |
|---|---|---|
| **แพลตฟอร์ม** | Windows Desktop (Win32) | Web Browser ทุกอุปกรณ์ (PC, Mac, Mobile) |
| **กราฟิก** | DirectX 9 (`d3d9.h`) | WebGL 2.0 / Three.js (OpenGL ES) |
| **ภาษาหลัก** | C++ (MSVC Win32) | TypeScript / Modern JavaScript |
| **ระบบเครือข่าย** | Raw TCP Socket (Winsock / IOCP) | WebSocket (WSS) + TCP Gateway |
| **การจัดเก็บข้อมูลแคช** | Loose files / `Data.res` | HTTP CDN + IndexedDB Storage |
| **หน้าต่าง UI** | Win32 GDI / DX DrawPrimitive | HTML5 DOM + Canvas + CSS |

---

## 2. การเชื่อมต่อเครือข่าย (Network Bridge Pipeline)

```text
[ Browser Client ]
       │
       │ (WebSocket WSS)
       ▼
[ WebSocket Gateway (Node.js) ]
       │
       │ (Raw TCP Sockets)
       ├────────────────────────┬────────────────────────┐
       ▼                        ▼                        ▼
[ Account/Login (23000) ]  [ CoreServer ]     [ WorldServer (3101) ]
```

### เหตุผลที่ต้องมี Gateway
Browser ไม่สามารถเปิด Raw TCP Socket ตรงไปยัง C++ Server ได้เนื่องจาก Security Sandbox ของเว็บเบราว์เซอร์ Gateway จึงทำหน้าที่:
1. รับการเชื่อมต่อ WSS จาก Browser
2. ทำการ Decrypt / Validate Session Token
3. แปลง Packet Binary ระหว่าง WebSocket Frame และ Raw TCP Packet ของ FlyFF
4. ถ่ายทอดสถานะเกม (Movement, Health, Combat, Chat) แบบ Real-time
