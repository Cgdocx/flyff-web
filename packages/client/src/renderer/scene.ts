import * as THREE from 'three';

export class WorldScene {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  private container: HTMLElement;

  // Camera Orbit / Tracking
  public cameraTarget = new THREE.Vector3(0, 1.5, 0);
  public cameraDistance = 8.0;
  public cameraPitch = 0.45; // Radians above horizon
  public cameraYaw = 0.0;    // Horizontal rotation

  constructor(container: HTMLElement) {
    this.container = container;

    // 1. Scene & Fog (FlyFF Madrigal Blue/Green Tint)
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb); // Sky blue
    this.scene.fog = new THREE.FogExp2(0x87ceeb, 0.015);

    // 2. Camera
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.updateCameraPosition();

    // 3. Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);

    // 4. Lighting (Sunlight + Ambient)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    this.scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfff5e6, 1.5);
    sunLight.position.set(50, 100, 50);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 250;
    const d = 40;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    this.scene.add(sunLight);

    // 5. Madrigal Meadow Floor (Terrain grid + Green grass)
    this.createMadrigalTerrain();

    // 6. Window Resize
    window.addEventListener('resize', this.onWindowResize.bind(this));
  }

  private createMadrigalTerrain(): void {
    // Ground Plane
    const groundGeo = new THREE.PlaneGeometry(300, 300, 64, 64);
    groundGeo.rotateX(-Math.PI / 2);

    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x5a9e32, // FlyFF vibrant green
      roughness: 0.9,
      metalness: 0.05
    });

    const groundMesh = new THREE.Mesh(groundGeo, groundMat);
    groundMesh.name = 'groundPlane';
    groundMesh.receiveShadow = true;
    this.scene.add(groundMesh);

    // Subtle Terrain Grid
    const gridHelper = new THREE.GridHelper(300, 75, 0x487d28, 0x518f2e);
    gridHelper.position.y = 0.01;
    this.scene.add(gridHelper);

    // Madrigal Town Landmark Props (Flaris Pillars / Trees)
    this.spawnMadrigalProps();
  }

  private spawnMadrigalProps(): void {
    // Add decorative columns and trees to resemble Flaris town square
    const pillarGeo = new THREE.CylinderGeometry(0.8, 1.0, 5, 12);
    const pillarMat = new THREE.MeshStandardMaterial({ color: 0xdfd3b6, roughness: 0.6 });

    const treeTrunkGeo = new THREE.CylinderGeometry(0.3, 0.5, 3, 8);
    const treeTrunkMat = new THREE.MeshStandardMaterial({ color: 0x654321 });
    const treeFoliageGeo = new THREE.DodecahedronGeometry(2);
    const treeFoliageMat = new THREE.MeshStandardMaterial({ color: 0x2e8b57 });

    const positions = [
      { x: -15, z: -15 }, { x: 15, z: -15 },
      { x: -15, z: 15 }, { x: 15, z: 15 },
      { x: -25, z: 0 }, { x: 25, z: 0 }
    ];

    positions.forEach((pos, idx) => {
      if (idx % 2 === 0) {
        // Pillar
        const pillar = new THREE.Mesh(pillarGeo, pillarMat);
        pillar.position.set(pos.x, 2.5, pos.z);
        pillar.castShadow = true;
        pillar.receiveShadow = true;
        this.scene.add(pillar);
      } else {
        // Tree
        const trunk = new THREE.Mesh(treeTrunkGeo, treeTrunkMat);
        trunk.position.set(pos.x, 1.5, pos.z);
        trunk.castShadow = true;

        const foliage = new THREE.Mesh(treeFoliageGeo, treeFoliageMat);
        foliage.position.set(pos.x, 4.0, pos.z);
        foliage.castShadow = true;

        this.scene.add(trunk);
        this.scene.add(foliage);
      }
    });
  }

  public updateCameraPosition(): void {
    const x = this.cameraTarget.x + this.cameraDistance * Math.cos(this.cameraPitch) * Math.sin(this.cameraYaw);
    const y = this.cameraTarget.y + this.cameraDistance * Math.sin(this.cameraPitch);
    const z = this.cameraTarget.z + this.cameraDistance * Math.cos(this.cameraPitch) * Math.cos(this.cameraYaw);

    this.camera.position.set(x, Math.max(y, 0.5), z);
    this.camera.lookAt(this.cameraTarget);
  }

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  public render(): void {
    this.renderer.render(this.scene, this.camera);
  }
}
