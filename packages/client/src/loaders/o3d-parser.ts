import * as THREE from 'three';

export interface O3DMeshBlock {
  numVertices: number;
  numFaces: number;
  numIndices: number;
  geometry: THREE.BufferGeometry;
  textureName?: string;
}

export interface O3DModel {
  name: string;
  version: number;
  boundingBox: {
    min: THREE.Vector3;
    max: THREE.Vector3;
  };
  blocks: O3DMeshBlock[];
  group: THREE.Group;
}

/**
 * Binary parser for FlyFF .o3d 3D Mesh format.
 * Compatible with FlyFF v15-v22 classic models and Insanity conversions.
 */
export class O3DLoader {
  private texturePath: string;

  constructor(texturePath = '/assets/textures/') {
    this.texturePath = texturePath;
  }

  /**
   * Parse an ArrayBuffer containing raw .o3d binary data
   */
  public parse(buffer: ArrayBuffer): O3DModel {
    const data = new DataView(buffer);
    const bytes = new Uint8Array(buffer);
    let offset = 0;

    // 1. Read Name Length and XOR 0xcd decrypted name string
    const nameLen = bytes[offset++];
    const nameChars: string[] = [];
    for (let i = 0; i < nameLen; i++) {
      nameChars.push(String.fromCharCode(bytes[offset++] ^ 0xcd));
    }
    const modelName = nameChars.join('');

    // 2. Read Version (Little-Endian int32)
    const version = data.getInt32(offset, true);
    offset += 4;

    // Skip reserved header padding (usually 56-64 bytes)
    offset += 56;

    // 3. Read Bounding Box (6 floats: minX, minY, minZ, maxX, maxY, maxZ)
    const minX = data.getFloat32(offset, true);
    const minY = data.getFloat32(offset + 4, true);
    const minZ = data.getFloat32(offset + 8, true);
    const maxX = data.getFloat32(offset + 12, true);
    const maxY = data.getFloat32(offset + 16, true);
    const maxZ = data.getFloat32(offset + 20, true);
    offset += 24;

    // Search for mesh blocks or parse sequential v30 blocks
    const blocks: O3DMeshBlock[] = [];
    const group = new THREE.Group();
    group.name = modelName;

    // Scan for vertex counts
    while (offset < buffer.byteLength - 32) {
      // Look for vertex/face signatures
      const nV = data.getInt32(offset, true);
      const nVB = data.getInt32(offset + 4, true);
      const nF = data.getInt32(offset + 8, true);
      const nIB = data.getInt32(offset + 12, true);

      if (nV > 0 && nV < 65536 && nVB === nV && nF > 0 && nIB === nF * 3) {
        offset += 16;

        // Skip VertexList positions (redundant with VB)
        offset += nV * 12;

        // Read VB (NORMALVERTEX = 32 bytes: px, py, pz, nx, ny, nz, u, v)
        const positions = new Float32Array(nV * 3);
        const normals = new Float32Array(nV * 3);
        const uvs = new Float32Array(nV * 2);

        for (let i = 0; i < nV; i++) {
          const px = data.getFloat32(offset, true);
          const py = data.getFloat32(offset + 4, true);
          const pz = data.getFloat32(offset + 8, true);
          const nx = data.getFloat32(offset + 12, true);
          const ny = data.getFloat32(offset + 16, true);
          const nz = data.getFloat32(offset + 20, true);
          const u = data.getFloat32(offset + 24, true);
          const v = 1.0 - data.getFloat32(offset + 28, true); // Invert V for WebGL

          positions[i * 3] = px;
          positions[i * 3 + 1] = py;
          positions[i * 3 + 2] = pz;

          normals[i * 3] = nx;
          normals[i * 3 + 1] = ny;
          normals[i * 3 + 2] = nz;

          uvs[i * 2] = u;
          uvs[i * 2 + 1] = v;

          offset += 32;
        }

        // Read Index Buffer (Uint16)
        const indices = new Uint16Array(nIB);
        for (let i = 0; i < nIB; i++) {
          indices[i] = data.getUint16(offset, true);
          offset += 2;
        }

        // Skip IIB identity buffer
        offset += nV * 2;

        // Read Material / Texture
        let textureName = '';
        if (offset < buffer.byteLength - 20) {
          offset += 4; // physique
          offset += 8; // bIsMaterial, nMaxMaterial
          offset += 68; // D3DMATERIAL9
          if (offset + 4 < buffer.byteLength) {
            const texLen = data.getInt32(offset, true);
            offset += 4;
            if (texLen > 0 && texLen < 256 && offset + texLen <= buffer.byteLength) {
              const texBytes: number[] = [];
              for (let t = 0; t < texLen; t++) {
                const b = bytes[offset++];
                if (b !== 0) texBytes.push(b);
              }
              textureName = String.fromCharCode(...texBytes);
            }
          }
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
        geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
        geometry.setIndex(new THREE.BufferAttribute(indices, 1));

        const material = new THREE.MeshStandardMaterial({
          roughness: 0.7,
          metalness: 0.1,
          side: THREE.DoubleSide
        });

        if (textureName) {
          const textureLoader = new THREE.TextureLoader();
          const cleanTex = textureName.replace(/\.dds$/i, '.png');
          textureLoader.load(
            `${this.texturePath}${cleanTex}`,
            (tex) => {
              material.map = tex;
              material.needsUpdate = true;
            },
            undefined,
            () => {
              // Fallback color if texture not present
              material.color.setHex(0x5599ee);
            }
          );
        } else {
          material.color.setHex(0x88aa88);
        }

        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        group.add(mesh);

        blocks.push({
          numVertices: nV,
          numFaces: nF,
          numIndices: nIB,
          geometry,
          textureName
        });
        break;
      } else {
        offset++;
      }
    }

    return {
      name: modelName,
      version,
      boundingBox: {
        min: new THREE.Vector3(minX, minY, minZ),
        max: new THREE.Vector3(maxX, maxY, maxZ)
      },
      blocks,
      group
    };
  }
}
