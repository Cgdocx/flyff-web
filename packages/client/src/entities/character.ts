import * as THREE from 'three';
import { EntitySpawnData } from '../network/protocol';

export class Entity {
  public id: string;
  public type: 'player' | 'monster' | 'npc';
  public name: string;
  public level: number;
  public hp: number;
  public maxHp: number;
  public group: THREE.Group;
  public targetIndicator: THREE.Mesh;
  public isSelected = false;

  private targetPosition: THREE.Vector3;
  private nameplateSprite: THREE.Sprite;

  constructor(data: EntitySpawnData) {
    this.id = data.id;
    this.type = data.type;
    this.name = data.name;
    this.level = data.level;
    this.hp = data.hp;
    this.maxHp = data.maxHp;

    this.group = new THREE.Group();
    this.group.position.set(data.position.x, data.position.y, data.position.z);
    this.group.rotation.y = data.rotationY;
    this.targetPosition = this.group.position.clone();

    // 1. Build Visual Character Representation
    this.buildCharacterMesh(data);

    // 2. Selection Ring under feet
    const ringGeo = new THREE.RingGeometry(0.8, 1.0, 32);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: this.type === 'monster' ? 0xff3333 : 0x33ccff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8
    });
    this.targetIndicator = new THREE.Mesh(ringGeo, ringMat);
    this.targetIndicator.position.y = 0.05;
    this.targetIndicator.visible = false;
    this.group.add(this.targetIndicator);

    // 3. Nameplate & Overhead HP Bar
    this.nameplateSprite = this.createNameplate();
    this.nameplateSprite.position.y = 2.4;
    this.group.add(this.nameplateSprite);
  }

  private buildCharacterMesh(data: EntitySpawnData): void {
    if (data.type === 'monster') {
      // Monster: e.g. Aibatt style sphere with bat wings/ears
      const bodyGeo = new THREE.SphereGeometry(0.7, 16, 16);
      const bodyMat = new THREE.MeshStandardMaterial({
        color: 0x8a2be2, // Purple Aibatt
        roughness: 0.5
      });
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.position.y = 0.9;
      body.castShadow = true;
      this.group.add(body);

      // Cute Eyes
      const eyeGeo = new THREE.SphereGeometry(0.12, 8, 8);
      const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffff00 });
      const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
      leftEye.position.set(-0.25, 1.0, 0.6);
      const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
      rightEye.position.set(0.25, 1.0, 0.6);
      this.group.add(leftEye, rightEye);

      // Wings / Ears
      const earGeo = new THREE.ConeGeometry(0.25, 0.6, 8);
      const earMat = new THREE.MeshStandardMaterial({ color: 0x5a189a });
      const leftEar = new THREE.Mesh(earGeo, earMat);
      leftEar.position.set(-0.55, 1.6, 0);
      leftEar.rotation.z = 0.4;
      const rightEar = new THREE.Mesh(earGeo, earMat);
      rightEar.position.set(0.55, 1.6, 0);
      rightEar.rotation.z = -0.4;
      this.group.add(leftEar, rightEar);
    } else {
      // Humanoid / Player (Vagrant / Mercenary / etc.)
      const skinMat = new THREE.MeshStandardMaterial({ color: 0xffdbac, roughness: 0.6 });
      const clothMat = new THREE.MeshStandardMaterial({
        color: data.type === 'npc' ? 0xff9900 : 0x2266cc,
        roughness: 0.7
      });

      // Head
      const headGeo = new THREE.SphereGeometry(0.35, 16, 16);
      const head = new THREE.Mesh(headGeo, skinMat);
      head.position.y = 1.65;
      head.castShadow = true;

      // Hair
      const hairGeo = new THREE.SphereGeometry(0.38, 16, 16);
      const hairMat = new THREE.MeshStandardMaterial({ color: 0x4a2c00 });
      const hair = new THREE.Mesh(hairGeo, hairMat);
      hair.position.set(0, 1.75, -0.05);
      hair.scale.set(1.0, 0.8, 1.0);

      // Torso
      const torsoGeo = new THREE.CylinderGeometry(0.28, 0.22, 0.7, 12);
      const torso = new THREE.Mesh(torsoGeo, clothMat);
      torso.position.y = 1.15;
      torso.castShadow = true;

      // Legs
      const legGeo = new THREE.CylinderGeometry(0.12, 0.1, 0.8, 8);
      const legMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
      const leftLeg = new THREE.Mesh(legGeo, legMat);
      leftLeg.position.set(-0.16, 0.4, 0);
      leftLeg.castShadow = true;
      const rightLeg = new THREE.Mesh(legGeo, legMat);
      rightLeg.position.set(0.16, 0.4, 0);
      rightLeg.castShadow = true;

      this.group.add(head, hair, torso, leftLeg, rightLeg);
    }
  }

  private createNameplate(): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;

    this.drawNameplate(ctx, canvas.width, canvas.height);

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(2.5, 0.625, 1.0);
    return sprite;
  }

  public updateHp(newHp: number): void {
    this.hp = Math.max(0, Math.min(newHp, this.maxHp));
    const texture = this.nameplateSprite.material.map as THREE.CanvasTexture;
    const canvas = texture.image as HTMLCanvasElement;
    const ctx = canvas.getContext('2d')!;
    this.drawNameplate(ctx, canvas.width, canvas.height);
    texture.needsUpdate = true;
  }

  private drawNameplate(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    ctx.clearRect(0, 0, width, height);

    // Title / Level / Name
    ctx.font = 'bold 20px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#000000';
    const text = `Lv.${this.level} ${this.name}`;

    // Outline
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#000000';
    ctx.strokeText(text, width / 2, 24);

    // Fill Color (Monster red/orange, NPC gold, Player white)
    ctx.fillStyle = this.type === 'monster' ? '#ff6666' : this.type === 'npc' ? '#ffcc00' : '#ffffff';
    ctx.fillText(text, width / 2, 24);

    // Overhead HP Bar
    const barWidth = 140;
    const barHeight = 8;
    const barX = (width - barWidth) / 2;
    const barY = 32;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(barX - 2, barY - 2, barWidth + 4, barHeight + 4);

    const hpPercent = Math.max(0, this.hp / this.maxHp);
    ctx.fillStyle = hpPercent > 0.5 ? '#00e676' : hpPercent > 0.2 ? '#ffb300' : '#e53935';
    ctx.fillRect(barX, barY, barWidth * hpPercent, barHeight);
  }

  public setSelected(selected: boolean): void {
    this.isSelected = selected;
    this.targetIndicator.visible = selected;
  }

  public setMoveTarget(pos: { x: number; y: number; z: number }, rotY?: number): void {
    this.targetPosition.set(pos.x, pos.y, pos.z);
    if (rotY !== undefined) {
      this.group.rotation.y = rotY;
    }
  }

  public update(delta: number): void {
    // Smooth position interpolation
    if (this.group.position.distanceTo(this.targetPosition) > 0.05) {
      this.group.position.lerp(this.targetPosition, Math.min(1.0, delta * 8));

      // Bobbing animation while walking
      const speed = this.group.position.distanceTo(this.targetPosition);
      if (speed > 0.1) {
        this.group.position.y = this.targetPosition.y + Math.abs(Math.sin(Date.now() * 0.015)) * 0.15;
      }
    }
  }
}
