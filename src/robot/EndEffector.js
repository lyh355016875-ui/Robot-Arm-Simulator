(function (global) {
  'use strict';
  global.RobotArmSimulator = global.RobotArmSimulator || {};
  const app = global.RobotArmSimulator;

  const THREE = global.THREE;
  const FLANGE_MATERIAL = new THREE.MeshStandardMaterial({ color: '#c3d2dd', metalness: 0.75, roughness: 0.23 });
  const BODY_MATERIAL = new THREE.MeshStandardMaterial({ color: '#26394c', metalness: 0.78, roughness: 0.3 });
  const FINGER_MATERIAL = new THREE.MeshStandardMaterial({ color: '#9bb2c3', metalness: 0.68, roughness: 0.26 });
  const ACCENT_MATERIAL = new THREE.MeshStandardMaterial({
    color: '#43c8d8',
    metalness: 0.62,
    roughness: 0.23,
    emissive: '#0a3138',
    emissiveIntensity: 0.35,
  });

  function addMesh(parent, geometry, material, name, position = [0, 0, 0], rotation = [0, 0, 0]) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = name;
    mesh.position.set(...position);
    mesh.rotation.set(...rotation);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }

  class EndEffector {
    constructor() {
      this.object3D = new THREE.Group();
      this.object3D.name = 'EndEffector';
      this.toolTip = new THREE.Vector3(0.86, 0, 0);

      addMesh(this.object3D, new THREE.CylinderGeometry(0.18, 0.18, 0.16, 40), FLANGE_MATERIAL, 'Tool Flange', [0.09, 0, 0], [0, 0, Math.PI / 2]);
      addMesh(this.object3D, new THREE.BoxGeometry(0.34, 0.2, 0.3), BODY_MATERIAL, 'Gripper Palm', [0.34, 0, 0]);
      this.leftFinger = addMesh(this.object3D, new THREE.BoxGeometry(0.38, 0.085, 0.09), FINGER_MATERIAL, 'Left Gripper Finger', [0.67, 0.11, 0.12]);
      this.rightFinger = addMesh(this.object3D, new THREE.BoxGeometry(0.38, 0.085, 0.09), FINGER_MATERIAL, 'Right Gripper Finger', [0.67, 0.11, -0.12]);
      addMesh(this.object3D, new THREE.BoxGeometry(0.12, 0.035, 0.055), ACCENT_MATERIAL, 'Gripper Sensor', [0.43, 0.105, 0.16]);
      this.gripperOpening = 1;
    }

    setGripperOpening(value) {
      const opening = Math.max(0, Math.min(1, Number(value)));
      if (!Number.isFinite(opening)) throw new TypeError('夹爪开合量必须是 0 到 1 之间的数字。');
      const halfGap = 0.07 + opening * 0.13;
      this.leftFinger.position.z = halfGap;
      this.rightFinger.position.z = -halfGap;
      this.gripperOpening = opening;
      return opening;
    }

    setGripperOpen(open) {
      return this.setGripperOpening(open ? 1 : 0);
    }
  }
  app.EndEffector = EndEffector;
})(window);
