import * as THREE from 'three';
import { Joint } from './joint.js';

const materials = {
  graphite: new THREE.MeshStandardMaterial({ color: '#28394d', metalness: 0.58, roughness: 0.34 }),
  titanium: new THREE.MeshStandardMaterial({ color: '#c3d2dd', metalness: 0.72, roughness: 0.24 }),
  alloy: new THREE.MeshStandardMaterial({ color: '#7792a8', metalness: 0.62, roughness: 0.29 }),
  dark: new THREE.MeshStandardMaterial({ color: '#26394c', metalness: 0.8, roughness: 0.32 }),
  cyan: new THREE.MeshStandardMaterial({ color: '#43c8d8', metalness: 0.62, roughness: 0.23, emissive: '#0a3138', emissiveIntensity: 0.35 }),
};

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

function addJointHousing(joint, name, radius = 0.31, axis = 'z') {
  const cylinderRotation = axis === 'x' ? [0, 0, Math.PI / 2] : [Math.PI / 2, 0, 0];
  const sideOffset = (distance) => axis === 'x' ? [distance, 0, 0] : [0, 0, distance];

  addMesh(joint, new THREE.CylinderGeometry(radius, radius, 0.28, 40), materials.graphite, `${name} Housing`, [0, 0, 0], cylinderRotation);
  for (const side of [-1, 1]) {
    addMesh(joint, new THREE.CylinderGeometry(radius * 0.77, radius * 0.77, 0.055, 40), materials.titanium, `${name} Bearing`, sideOffset(side * 0.17), cylinderRotation);
    addMesh(joint, new THREE.CylinderGeometry(radius * 0.32, radius * 0.32, 0.062, 32), materials.cyan, `${name} Hub`, sideOffset(side * 0.205), cylinderRotation);
  }
}

function addJointAxes(joint, length = 0.62, offset = [0, 0.12, 0.25]) {
  const axes = new THREE.AxesHelper(length);
  axes.name = `${joint.name} Coordinate Axes`;
  axes.position.set(...offset);
  joint.add(axes);
}

export function createRobotArm(scene) {
  const base = new THREE.Group();
  base.name = 'Base';
  scene.add(base);

  addMesh(base, new THREE.CylinderGeometry(0.92, 1.02, 0.2, 64), materials.graphite, 'Base Foot', [0, 0.1, 0]);
  addMesh(base, new THREE.CylinderGeometry(0.79, 0.79, 0.075, 64), materials.titanium, 'Base Trim', [0, 0.2375, 0]);
  addMesh(base, new THREE.CylinderGeometry(0.5, 0.64, 0.62, 48), materials.alloy, 'Base Pedestal', [0, 0.57, 0]);
  addMesh(base, new THREE.CylinderGeometry(0.53, 0.53, 0.095, 48), materials.cyan, 'Base Status Ring', [0, 0.825, 0]);
  addMesh(base, new THREE.CylinderGeometry(0.46, 0.5, 0.15, 48), materials.graphite, 'Base Bearing Seat', [0, 0.9, 0]);

  const joint1 = new Joint({ name: 'Joint1', axis: 'y', position: [0, 0.96, 0], angleDegrees: 30 });
  base.add(joint1.object3D);
  addMesh(joint1.object3D, new THREE.CylinderGeometry(0.43, 0.43, 0.2, 48), materials.titanium, 'Joint1 Turntable');
  addMesh(joint1.object3D, new THREE.CylinderGeometry(0.34, 0.34, 0.24, 48), materials.graphite, 'Joint1 Rotor', [0, 0.19, 0]);
  addMesh(joint1.object3D, new THREE.CylinderGeometry(0.2, 0.2, 0.04, 40), materials.cyan, 'Joint1 Cap', [0, 0.33, 0]);
  addJointAxes(joint1.object3D, 0.5, [0.48, 0.12, 0.12]);

  const arm1 = new THREE.Group();
  arm1.name = 'Arm1';
  joint1.object3D.add(arm1);
  addMesh(arm1, new THREE.BoxGeometry(0.52, 1.28, 0.58), materials.alloy, 'Arm1 Shoulder Column', [0, 0.82, 0]);
  addMesh(arm1, new THREE.BoxGeometry(0.13, 0.88, 0.595), materials.titanium, 'Arm1 Front Panel', [0, 0.83, 0.296]);
  addMesh(arm1, new THREE.BoxGeometry(0.065, 0.68, 0.035), materials.cyan, 'Arm1 Indicator Strip', [0, 0.81, 0.316]);
  addMesh(arm1, new THREE.BoxGeometry(0.61, 0.16, 0.64), materials.graphite, 'Arm1 Shoulder Cap', [0, 1.43, 0]);

  const joint2 = new Joint({ name: 'Joint2', axis: 'z', position: [0, 1.46, 0], angleDegrees: 45 });
  arm1.add(joint2.object3D);
  addJointHousing(joint2.object3D, 'Joint2', 0.33, joint2.axis);
  addMesh(joint2.object3D, new THREE.SphereGeometry(0.105, 24, 16), materials.cyan, 'Joint2 Center', [0, 0, 0.238]);
  addJointAxes(joint2.object3D, 0.58, [-0.3, 0.31, 0.25]);

  const arm2 = new THREE.Group();
  arm2.name = 'Arm2';
  joint2.object3D.add(arm2);
  const arm2Length = 1.8;
  addMesh(arm2, new THREE.BoxGeometry(arm2Length, 0.3, 0.38), materials.alloy, 'Arm2 Main Link', [arm2Length / 2, 0, 0]);
  addMesh(arm2, new THREE.BoxGeometry(arm2Length * 0.72, 0.075, 0.25), materials.titanium, 'Arm2 Top Cover', [arm2Length * 0.51, 0.185, 0]);
  addMesh(arm2, new THREE.BoxGeometry(arm2Length * 0.64, 0.035, 0.055), materials.cyan, 'Arm2 Status Rail', [arm2Length * 0.5, 0.23, 0.155]);
  addMesh(arm2, new THREE.BoxGeometry(0.18, 0.38, 0.44), materials.graphite, 'Arm2 Elbow Collar', [0.08, 0, 0]);
  addMesh(arm2, new THREE.BoxGeometry(0.16, 0.38, 0.44), materials.graphite, 'Arm2 Wrist Collar', [arm2Length - 0.06, 0, 0]);

  const joint3 = new Joint({ name: 'Joint3', axis: 'x', position: [arm2Length, 0, 0], angleDegrees: 20 });
  arm2.add(joint3.object3D);
  addJointHousing(joint3.object3D, 'Joint3', 0.255, joint3.axis);
  addMesh(joint3.object3D, new THREE.SphereGeometry(0.082, 24, 16), materials.cyan, 'Joint3 Center', [0.195, 0, 0]);
  addJointAxes(joint3.object3D, 0.48, [0.2, -0.28, 0.23]);

  const endEffector = new THREE.Group();
  endEffector.name = 'EndEffector';
  joint3.object3D.add(endEffector);
  addMesh(endEffector, new THREE.CylinderGeometry(0.16, 0.16, 0.16, 36), materials.titanium, 'Tool Flange', [0.12, 0, 0], [0, 0, Math.PI / 2]);
  addMesh(endEffector, new THREE.BoxGeometry(0.38, 0.19, 0.34), materials.graphite, 'Gripper Palm', [0.37, 0, 0]);
  addMesh(endEffector, new THREE.BoxGeometry(0.42, 0.09, 0.105), materials.titanium, 'Left Gripper Finger', [0.68, 0.12, 0.14]);
  addMesh(endEffector, new THREE.BoxGeometry(0.42, 0.09, 0.105), materials.titanium, 'Right Gripper Finger', [0.68, 0.12, -0.14]);
  addMesh(endEffector, new THREE.BoxGeometry(0.13, 0.035, 0.07), materials.cyan, 'Gripper Sensor', [0.45, 0.105, 0.178]);

  return { base, joints: { joint1, joint2, joint3 }, links: { arm1, arm2 }, endEffector };
}
