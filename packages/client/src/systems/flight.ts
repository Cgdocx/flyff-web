import * as THREE from 'three';

export type MovementMode = 'ground' | 'flying';

export class FlightSystem {
  public mode: MovementMode = 'ground';
  public isFlying = false;

  // Flight Dynamics
  public flightSpeed = 16.0;
  public groundSpeed = 8.0;
  public altitude = 0.0;
  public targetAltitude = 0.0;
  public readonly minFlightAltitude = 3.5;
  public readonly maxFlightAltitude = 45.0;

  // Visual Mount Model (Broom / Board)
  public mountMesh: THREE.Mesh | null = null;

  constructor() {
    this.createBroomMount();
  }

  private createBroomMount(): void {
    const group = new THREE.Group();

    // Broom Stick
    const handleGeo = new THREE.CylinderGeometry(0.04, 0.04, 2.2, 8);
    handleGeo.rotateX(Math.PI / 2);
    const handleMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b });
    const handle = new THREE.Mesh(handleGeo, handleMat);

    // Broom Bristles
    const bristleGeo = new THREE.ConeGeometry(0.2, 0.8, 8);
    bristleGeo.rotateX(-Math.PI / 2);
    const bristleMat = new THREE.MeshStandardMaterial({ color: 0xdaa520 });
    const bristles = new THREE.Mesh(bristleGeo, bristleMat);
    bristles.position.z = -1.1;

    group.add(handle, bristles);
    group.visible = false;

    this.mountMesh = group as unknown as THREE.Mesh;
  }

  public toggleFlight(): boolean {
    this.isFlying = !this.isFlying;
    this.mode = this.isFlying ? 'flying' : 'ground';

    if (this.isFlying) {
      this.targetAltitude = this.minFlightAltitude;
      if (this.mountMesh) this.mountMesh.visible = true;
    } else {
      this.targetAltitude = 0.0;
      if (this.mountMesh) this.mountMesh.visible = false;
    }

    return this.isFlying;
  }

  public update(delta: number, currentPosition: THREE.Vector3): void {
    if (this.isFlying) {
      // Smooth altitude interpolation
      this.altitude = THREE.MathUtils.lerp(this.altitude, this.targetAltitude, delta * 3.5);
      currentPosition.y = this.altitude;

      // Slight floating wobble
      currentPosition.y += Math.sin(Date.now() * 0.003) * 0.08;
    } else {
      if (this.altitude > 0) {
        this.altitude = THREE.MathUtils.lerp(this.altitude, 0, delta * 8.0);
        currentPosition.y = this.altitude;
      }
    }
  }

  public adjustAltitude(deltaAlt: number): void {
    if (this.isFlying) {
      this.targetAltitude = Math.max(
        this.minFlightAltitude,
        Math.min(this.maxFlightAltitude, this.targetAltitude + deltaAlt)
      );
    }
  }
}
