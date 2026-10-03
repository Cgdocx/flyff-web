# FlyFF .o3d Binary Mesh Specification

เอกสารโครงสร้างไฟล์โมเดล 3 มิติ `.o3d` ของเกม FlyFF สำหรับการแปลงลง WebGL

---

## โครงสร้างไบนารี (Binary Layout)

### 1. Header Block
- `byte 0`: ความยาวของชื่อโมเดล (`uint8`)
- `bytes 1..N`: ชื่อโมเดลที่เข้ารหัสด้วย `char ^ 0xcd`
- `bytes N+1..N+4`: เวอร์ชันไฟล์ (`int32` Little-Endian, โดยทั่วไปคือเวอร์ชัน 30)
- `bytes N+5..N+60`: Header padding / Reserved bytes (56 bytes)
- `bytes N+61..N+84`: Model Bounding Box (`6 floats`: minX, minY, minZ, maxX, maxY, maxZ)

### 2. Mesh Block Headers
- `nV` (`int32`): จำนวน Vertex ทั้งหมด
- `nVB` (`int32`): จำนวน Vertex ใน Vertex Buffer
- `nF` (`int32`): จำนวน Face (รูปสามเหลี่ยม)
- `nIB` (`int32`): จำนวน Index ใน Index Buffer (เท่ากับ `nF * 3`)

### 3. NormalVertex Structure (32 Bytes ต่อ 1 จุด)
แต่ละจุดใน Vertex Buffer มีขนาด 32 ไบต์ (8 floats):
```text
Offset  Type     Field
0       float32  Position X (px)
4       float32  Position Y (py)
8       float32  Position Z (pz)
12      float32  Normal X (nx)
16      float32  Normal Y (ny)
20      float32  Normal Z (nz)
24      float32  Texture U (tu)
28      float32  Texture V (tv) -> ใน WebGL ต้องกลับด้านเป็น (1.0 - tv)
```

### 4. Index Buffer
- ขนาด: `nIB * 2` ไบต์ (`uint16` array)
- ชี้ Index ของ Vertex เพื่อสร้าง Face สามเหลี่ยม

### 5. Material / Texture Binding
- `Material Name Length` (`int32`)
- `Material / Texture Name String` (ชี้ไปยังชื่อไฟล์ เช่น `WdMadrigal_Tree01.dds`)
