(function (global) {
  'use strict';
  const root = typeof window !== 'undefined' ? window : globalThis;
  root.RobotArmSimulator = root.RobotArmSimulator || {};
  const app = root.RobotArmSimulator;
  const THREE = root.THREE;

  const TABLE_CENTER = new THREE.Vector3(2.35, 0, -0.2);
  const TABLE_TOP = 0.9;
  const PART_TYPES = ['cube', 'sphere', 'workpiece'];
  const PART_NAMES = { cube: '方块', sphere: '球体', workpiece: '工件' };
  const PART_COLORS = ['#ed9c49', '#55b9cf', '#cb6d72', '#92bd75', '#b38dd0'];

  function addBox(parent, name, size, position, material) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
    mesh.name = name;
    mesh.position.set(...position);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }

  class Workbench {
    constructor(scene) {
      if (!scene) throw new TypeError('工业工作台需要一个 Three.js 场景。');
      this.scene = scene;
      this.group = new THREE.Group();
      this.group.name = 'Industrial Workbench';
      this.workpieces = [];
      this.nextId = 1;
      this.placementIndex = 0;
      this.raycaster = new THREE.Raycaster();
      this.scene.add(this.group);
      this.createTable();
      this.createPlacementZone();
      this.createVisionCamera();
    }

    createTable() {
      const cx = TABLE_CENTER.x;
      const cz = TABLE_CENTER.z;
      const graphite = new THREE.MeshStandardMaterial({ color: '#25364a', metalness: 0.62, roughness: 0.39 });
      const steel = new THREE.MeshStandardMaterial({ color: '#849caf', metalness: 0.72, roughness: 0.3 });
      const darkSteel = new THREE.MeshStandardMaterial({ color: '#435a6d', metalness: 0.72, roughness: 0.34 });
      const safety = new THREE.MeshStandardMaterial({ color: '#dcae4d', metalness: 0.38, roughness: 0.44 });

      addBox(this.group, 'Workbench Steel Top', [3.8, 0.16, 2.6], [cx, TABLE_TOP - 0.08, cz], graphite);
      addBox(this.group, 'Workbench Front Safety Rail', [3.84, 0.025, 0.045], [cx, TABLE_TOP - 0.012, cz + 1.29], safety);
      addBox(this.group, 'Workbench Rear Safety Rail', [3.84, 0.025, 0.045], [cx, TABLE_TOP - 0.012, cz - 1.29], safety);

      for (const xOffset of [-1.68, 1.68]) {
        for (const zOffset of [-1.08, 1.08]) {
          addBox(this.group, 'Workbench Leg', [0.11, 0.82, 0.11], [cx + xOffset, 0.41, cz + zOffset], steel);
        }
      }
      addBox(this.group, 'Workbench Lower Front Brace', [3.35, 0.075, 0.075], [cx, 0.35, cz + 1.08], darkSteel);
      addBox(this.group, 'Workbench Lower Rear Brace', [3.35, 0.075, 0.075], [cx, 0.35, cz - 1.08], darkSteel);
      addBox(this.group, 'Workbench Side Brace A', [0.075, 0.075, 2.15], [cx - 1.68, 0.35, cz], darkSteel);
      addBox(this.group, 'Workbench Side Brace B', [0.075, 0.075, 2.15], [cx + 1.68, 0.35, cz], darkSteel);

      // Rear camera gantry stays outside the robot's pick and place corridor.
      const gantry = new THREE.MeshStandardMaterial({ color: '#617a8d', metalness: 0.74, roughness: 0.28 });
      addBox(this.group, 'Vision Gantry Upright', [0.08, 2.35, 0.08], [cx + 1.73, TABLE_TOP + 1.16, cz - 1.17], gantry);
      addBox(this.group, 'Vision Gantry Boom', [2.35, 0.08, 0.08], [cx + 0.53, TABLE_TOP + 2.29, cz - 1.17], gantry);

      const cameraBody = new THREE.MeshStandardMaterial({ color: '#273a4d', metalness: 0.48, roughness: 0.3 });
      const cameraAccent = new THREE.MeshStandardMaterial({ color: '#50cad7', emissive: '#0b4249', emissiveIntensity: 0.65 });
      const cameraHousing = addBox(this.group, 'Vision Camera Housing', [0.26, 0.18, 0.2], [cx + 0.36, 3.06, cz - 0.74], cameraBody);
      const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.14, 24), cameraAccent);
      lens.name = 'Vision Camera Lens';
      lens.position.set(cx + 0.36, 2.91, cz - 0.74);
      lens.castShadow = true;
      cameraHousing.parent.add(lens);
      const led = new THREE.Mesh(new THREE.SphereGeometry(0.026, 12, 10), cameraAccent);
      led.name = 'Vision Camera Status LED';
      led.position.set(cx + 0.43, 3.07, cz - 0.635);
      this.group.add(led);
    }

    createPlacementZone() {
      const zoneMaterial = new THREE.MeshBasicMaterial({ color: '#39c596', transparent: true, opacity: 0.16, side: THREE.DoubleSide });
      const zone = new THREE.Mesh(new THREE.PlaneGeometry(0.78, 2.24), zoneMaterial);
      zone.name = 'Placement Zone';
      zone.rotation.x = -Math.PI / 2;
      zone.position.set(3.1, TABLE_TOP + 0.008, TABLE_CENTER.z);
      this.group.add(zone);

      const trayMaterial = new THREE.MeshStandardMaterial({ color: '#385f5b', metalness: 0.36, roughness: 0.54 });
      const rimMaterial = new THREE.MeshStandardMaterial({ color: '#60c9a8', metalness: 0.45, roughness: 0.35 });
      for (let index = 0; index < 5; index += 1) {
        const z = TABLE_CENTER.z - 0.88 + index * 0.44;
        addBox(this.group, 'Placement Tray ' + (index + 1), [0.58, 0.035, 0.38], [3.1, TABLE_TOP + 0.018, z], trayMaterial);
        addBox(this.group, 'Placement Tray Marker ' + (index + 1), [0.48, 0.008, 0.018], [3.1, TABLE_TOP + 0.04, z - 0.15], rimMaterial);
      }
    }

    createVisionCamera() {
      this.visionCamera = new THREE.PerspectiveCamera(84, 1, 0.1, 12);
      this.visionCamera.name = 'Simulated Vision Camera';
      this.visionCamera.position.set(TABLE_CENTER.x + 0.36, 2.98, TABLE_CENTER.z - 0.74);
      this.visionCamera.lookAt(TABLE_CENTER.x, TABLE_TOP, TABLE_CENTER.z);
      this.visionCamera.updateProjectionMatrix();
      this.scene.add(this.visionCamera);
      this.scene.updateMatrixWorld(true);
    }

    getAvailableWorkpieces() {
      return this.workpieces.filter((part) => part.status === 'available');
    }

    spawnRandomWorkpieces(count = 5) {
      if (this.workpieces.some((part) => part.status === 'held')) throw new Error('夹爪仍持有工件，不能重置工作台。');
      this.clearWorkpieces();
      this.placementIndex = 0;
      const positions = [];
      const amount = Math.max(1, Math.min(8, Math.floor(count)));

      for (let index = 0; index < amount; index += 1) {
        let x;
        let z;
        let attempt = 0;
        do {
          x = TABLE_CENTER.x - 0.42 + Math.random() * 0.88;
          z = TABLE_CENTER.z - 0.83 + Math.random() * 1.66;
          attempt += 1;
        } while (attempt < 36 && positions.some((point) => Math.hypot(point.x - x, point.z - z) < 0.44));
        positions.push({ x, z });

        const type = PART_TYPES[Math.floor(Math.random() * PART_TYPES.length)];
        const entity = this.createWorkpiece(type, index);
        entity.object3D.position.set(x, TABLE_TOP + entity.height / 2, z);
        this.group.add(entity.object3D);
        this.workpieces.push(entity);
      }
      this.scene.updateMatrixWorld(true);
      return this.workpieces.length;
    }

    createWorkpiece(type, index) {
      const id = 'part-' + String(this.nextId++).padStart(3, '0');
      const color = PART_COLORS[Math.floor(Math.random() * PART_COLORS.length)];
      const material = new THREE.MeshStandardMaterial({ color, metalness: type === 'workpiece' ? 0.65 : 0.2, roughness: 0.34, emissive: '#000000', emissiveIntensity: 0.55 });
      const object3D = new THREE.Group();
      object3D.name = id + ' ' + PART_NAMES[type];
      object3D.userData.workpiece = null;
      let height;
      let mesh;

      if (type === 'cube') {
        height = 0.23;
        mesh = new THREE.Mesh(new THREE.BoxGeometry(0.23, height, 0.23), material);
      } else if (type === 'sphere') {
        height = 0.25;
        mesh = new THREE.Mesh(new THREE.SphereGeometry(height / 2, 24, 18), material);
      } else {
        height = 0.24;
        mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.2, 28), material);
        const flange = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.035, 28), material);
        flange.name = 'Workpiece Flange';
        flange.position.y = -0.1025;
        flange.castShadow = true;
        flange.receiveShadow = true;
        object3D.add(flange);
        const topFace = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.04, 24), material);
        topFace.name = 'Workpiece Top Face';
        topFace.position.y = 0.1;
        topFace.castShadow = true;
        topFace.receiveShadow = true;
        object3D.add(topFace);
      }
      mesh.name = PART_NAMES[type] + ' Mesh';
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      object3D.add(mesh);

      const entity = { id, index, type, label: PART_NAMES[type], height, object3D, status: 'available', material };
      object3D.userData.workpiece = entity;
      return entity;
    }

    clearWorkpieces() {
      for (const part of this.workpieces) {
        if (part.object3D.parent) part.object3D.parent.remove(part.object3D);
        part.object3D.traverse((object) => object.geometry?.dispose?.());
        part.material.dispose();
      }
      this.workpieces = [];
    }

    detectNextTarget() {
      this.scene.updateMatrixWorld(true);
      this.visionCamera.updateMatrixWorld(true);
      const candidates = this.getAvailableWorkpieces().sort((left, right) => left.object3D.position.x - right.object3D.position.x);
      const roots = candidates.map((part) => part.object3D);
      const cameraPosition = this.visionCamera.getWorldPosition(new THREE.Vector3());

      for (const part of candidates) {
        const center = part.object3D.getWorldPosition(new THREE.Vector3());
        const projected = center.clone().project(this.visionCamera);
        if (projected.z < -1 || projected.z > 1 || Math.abs(projected.x) > 1 || Math.abs(projected.y) > 1) continue;
        this.raycaster.setFromCamera(new THREE.Vector2(projected.x, projected.y), this.visionCamera);
        const intersections = this.raycaster.intersectObjects(roots, true);
        let hitObject = intersections[0]?.object;
        while (hitObject && !hitObject.userData?.workpiece) hitObject = hitObject.parent;
        const hitPart = hitObject?.userData?.workpiece;
        if (hitPart !== part) continue;
        const estimatedPosition = center.clone();
        estimatedPosition.x += (Math.random() - 0.5) * 0.008;
        estimatedPosition.z += (Math.random() - 0.5) * 0.008;
        this.setHighlight(part, true);
        return { part, position: estimatedPosition, confidence: 0.97 + Math.random() * 0.025 };
      }
      return null;
    }

    setHighlight(part, active) {
      part.material.emissive.set(active ? '#e6c24f' : '#000000');
      part.material.emissiveIntensity = active ? 0.8 : 0.55;
    }

    pick(part, endEffector) {
      if (!part || part.status !== 'available') throw new Error('目标工件当前不可抓取。');
      this.setHighlight(part, false);
      endEffector.object3D.attach(part.object3D);
      part.status = 'held';
      return part;
    }

    getPlacementPose(part) {
      const index = this.placementIndex % 5;
      const z = TABLE_CENTER.z - 0.88 + index * 0.44;
      return {
        position: { x: 3.1, y: TABLE_TOP + 0.035 + part.height / 2, z },
        orientation: { roll: 0, pitch: 0, yaw: -Math.PI / 2 },
      };
    }

    place(part) {
      if (!part || part.status !== 'held') throw new Error('夹爪没有持有该工件。');
      const pose = this.getPlacementPose(part);
      this.group.attach(part.object3D);
      part.object3D.position.set(pose.position.x, pose.position.y, pose.position.z);
      part.object3D.rotation.set(0, 0, 0);
      part.status = 'placed';
      this.placementIndex += 1;
      return pose;
    }

    markFailed(part) {
      if (!part || part.status !== 'available') return;
      this.setHighlight(part, false);
      part.status = 'failed';
    }
  }

  app.Workbench = Workbench;
  app.WorkbenchPartTypes = PART_TYPES.slice();
})(globalThis);
