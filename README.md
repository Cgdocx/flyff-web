# FlyFF Web Client & WebSocket Gateway

โปรเจกต์เว็บไคลเอนต์สำหรับเกม **FlyFF (Fly For Fun)** ที่สร้างขึ้นตามสถาปัตยกรรมเดียวกับ **Flyff Universe** (HTML5 + WebGL + Three.js + WebSocket Gateway) ช่วยให้เล่นและทดสอบระบบเกมบน Web Browser ได้โดยตรง โดยไม่กระทบหรือเขียนทับซอร์สโค้ดเดิมใน `FLYFF_2026`

---

## 🌟 ฟีเจอร์หลัก (Key Features)

### 1. 3D WebGL Client (`packages/client`)
- **Graphics & Engine:** ขับเคลื่อนด้วย **Three.js + WebGL** พร้อมระบบแสง เงา และบรรยากาศท้องฟ้าสไตล์ Madrigal
- **Control Scheme:** การควบคุมแบบฉบับเกม FlyFF ดั้งเดิม:
  - **คลิกซ้ายบนพื้น:** เดินไปยังตำแหน่งเป้าหมาย (Click-to-Move)
  - **คลิกซ้ายที่มอนสเตอร์:** ล็อกเป้าหมาย (Targeting Ring)
  - **คลิกขวาค้างแล้วลาก:** หมุนมุมกล้องอิสระรอบตัวละคร (Orbit Camera)
  - **Scroll เมาส์:** ซูมเข้า-ออก (Zoom In/Out)
  - **ปุ่มคีย์ลัด:** กด `1` โจมตีเป้าหมาย, กด `Tab` ล็อกมอนสเตอร์ที่ใกล้ที่สุด
- **Classic FlyFF HUD:**
  - หลอดเลือดตัวละคร: HP, MP, FP และ EXP bar พร้อมเลเวลและอาชีพ
  - หน้าต่างเป้าหมาย (Target HUD): แสดงชื่อ เลเวล และหลอดเลือดศัตรูแบบ Real-time
  - หน้าต่างแชต: รองรับ System, Combat logs และข้อความผู้เล่น
  - Quick Slot Action Bar (ช่องสกิล 1-5)
  - มินิแมปจำลองเมือง Flaris
- **Native .o3d Asset Loader:**
  - ตัวแปลง Binary `.o3d` (Mesh, Normal, UV, Faces, Textures) ในตัว สามารถนำไฟล์โมเดลจากเซิร์ฟเวอร์เดิมมาโหลดลง WebGL ได้ทันที
- **Offline / Sandbox Mode:**
  - สามารถเปิดเล่นบนเบราว์เซอร์ได้ทันทีโดยไม่ต้องเปิดเซิร์ฟเวอร์ C++ ตัวเกมจะมีมอนสเตอร์จำลอง (Aibatt, Lawolf) และ NPC (Buff Pang, Mayor of Flaris) เดินเล่นและต่อสู้ได้จริง

### 2. WebSocket Gateway (`packages/gateway`)
- ทำหน้าที่เป็นสะพานเชื่อมระหว่าง **Browser (WebSocket WSS)** กับ **FlyFF Backend (Raw TCP)**
- รองรับ 2 โหมดการทำงาน:
  - **`MOCK` (Default):** จำลองโลก Madrigal Multiplayer แบบ Standalone มีระบบซิงค์ตำแหน่งผู้เล่น แชตร่วมกัน มอนสเตอร์ AI เกิดใหม่ และคำนวณดาเมจ
  - **`PROXY`:** ต่อตรงเข้า **FlyFF C++ Server Stack** ดั้งเดิม (เช่น WorldServer Port 3101, LoginServer Port 23000)

---

## 📁 โครงสร้างโปรเจกต์ (Project Structure)

```text
flyff-web/
├── packages/
│   ├── client/                  # Frontend WebGL 3D Client (Three.js + Vite + TS)
│   │   ├── src/
│   │   │   ├── entities/        # Player, Monster, NPC, Nameplates & HP bars
│   │   │   ├── loaders/         # Binary .o3d mesh parser & texture binder
│   │   │   ├── network/         # WebSocket client & packet protocol
│   │   │   ├── renderer/        # 3D Scene, Madrigal terrain, skybox, lighting
│   │   │   ├── ui/              # Classic FlyFF HUD & Status bars
│   │   │   └── main.ts          # Main game loop & interaction handler
│   │   ├── index.html
│   │   ├── package.json
│   │   └── vite.config.ts
│   │
│   └── gateway/                 # WebSocket Gateway & Multiplayer Server
│       ├── src/
│       │   ├── mock-server.ts   # Madrigal sandbox world simulator
│       │   ├── tcp-proxy.ts     # TCP Bridge to FlyFF C++ WorldServer (3101)
│       │   ├── protocol.ts      # Packet opcodes & interfaces
│       │   └── index.ts         # Gateway server entry point
│       ├── package.json
│       └── tsconfig.json
│
├── docs/
│   ├── ARCHITECTURE.md          # รายละเอียดสถาปัตยกรรมเปรียบเทียบกับ Neuz C++
│   └── O3D_SPEC.md              # สเปกโครงสร้าง Binary .o3d format
├── package.json
└── README.md
```

---

## 🚀 วิธีติดตั้งและเริ่มเล่น (Getting Started)

### 1. ติดตั้ง Dependencies ทั้งหมด
```bash
npm install
```

### 2. รันไคลเอนต์บนเบราว์เซอร์ (Frontend)
```bash
npm run dev
```
เปิดเบราว์เซอร์ไปที่: **`http://localhost:3000`**

### 3. รัน WebSocket Gateway (Multiplayer Server)
เปิด Terminal อีกหน้าต่าง แล้วรัน:
```bash
npm run dev:gateway
```
Gateway จะเปิดบริการที่ **`ws://localhost:8080`**

หากต้องการเชื่อมต่อกับ FlyFF C++ WorldServer ที่รันอยู่จริง (Port 3101):
```bash
GATEWAY_MODE=PROXY FLYFF_TCP_PORT=3101 npm run dev:gateway
```

---

## 🛠️ การบิลด์สำหรับใช้งานจริง (Production Build)
```bash
npm run build
```
ไฟล์ Production ของ Client จะถูกสร้างไว้ใน `packages/client/dist/` พร้อมนำไป Deploy บน Vercel, Netlify หรือ Nginx ได้ทันที
