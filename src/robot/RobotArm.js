import * as THREE from 'three';
import { EndEffector } from './EndEffector.js';
import { Joint } from './Joint.js';
import { Link } from './Link.js';

const BASE_GRAPHITE = new THREE.MeshStandardMaterial({ color: '#28394d', metalness: 0.62, roughness: 0.34 });
const BASE_ALLOY = new THREE.MeshStandardMaterial({ color: '#7792a8', metalness: 0.66, roughness: 0.28 });
const BASE_TRIM = new THREE.MeshStandardMaterial({ color: '#c3d2dd', metalness: 0.75, roughness: 0.23 });
const BASE_ACCENT = new THREE.MeshStandardMaterial({ color: '#43c8d8', metalness: 0.62, roughness: 0.23, emissive: '#0a3138', emissiveIntensity: 0.35 });

function addBaseMesh(parent, geometry, material, name, position) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name;
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
}

function createBase() {
  const base = new THREE.Group();
  base.name = 'Base';
  addBaseMesh(base, new THREE.CylinderGeometry(0.98, 1.08, 0.18, 64), BASE_GRAPHITE, 'Base Foot', [0, 0.09, 0]);
  addBaseMesh(base, new THREE.CylinderGeometry(0.82, 0.82, 0.055, 64), BASE_TRIM, 'Base Trim', [0, 0.205, 0]);
  addBaseMesh(base, new THREE.CylinderGeometry(0.5, 0.65, 0.72, 56), BASE_ALLOY, 'Base Pedestal', [0, 0.59, 0]);
  addBaseMesh(base, new THREE.CylinderGeometry(0.58, 0.58, 0.1, 56), BASE_ACCENT, 'Base Status Ring', [0, 0.98, 0]);
  addBaseMesh(base, new THREE.CylinderGeometry(0.48, 0.52, 0.16, 56), BASE_GRAPHITE, 'Base Bearing Seat', [0, 1.09, 0]);
  return base;
}

const JOINT_CONFIG = [
  { name: 'Joint1', axis: 'y', minAngle: -180, maxAngle: 180, initialAngle: 0, position: [0, 1.16, 0], housingRadius: 0.4 },
  { name: 'Joint2', axis: 'z', minAngle: -110, maxAngle: 120, initialAngle: 30, position: [0, 1.1, 0], housingRadius: 0.36 },
  { name: 'Joint3', axis: 'z', minAngle: -135, maxAngle: 135, initialAngle: -55, position: [1.65, 0, 0], housingRadius: 0.32 },
  { name: 'Joint4', axis: 'x', minAngle: -180, maxAngle: 180, initialAngle: 0, position: [1.45, 0, 0], housingRadius: 0.27 },
  { name: 'Joint5', axis: 'z', minAngle: -125, maxAngle: 125, initialAngle: 35, position: [0.24, 0, 0], housingRadius: 0.24 },
  { name: 'Joint6', axis: 'x', minAngle: -360, maxAngle: 360, initialAngle: 0, position: [0.24, 0, 0], housingRadius: 0.2 },
];

export class RobotArm {
  constructor(scene) {
    this.object3D = new THREE.Group();
    this.object3D.name = 'Robot';
    this.base = createBase();
    this.object3D.add(this.base);

    this.joints = JOINT_CONFIG.map((config) => new Joint(config));
    this.links = [
      new Link({ name: 'Link1', length: 1.1, width: 0.42, depth: 0.52, direction: 'y' }),
      new Link({ name: 'Link2', length: 1.65, width: 0.34, depth: 0.44 }),
      new Link({ name: 'Link3', length: 1.45, width: 0.29, depth: 0.37 }),
    ];
    this.endEffector = new EndEffector();

    const [joint1, joint2, joint3, joint4, joint5, joint6] = this.joints;
    const [link1, link2, link3] = this.links;

    this.base.add(joint1.object3D);
    joint1.object3D.add(link1.object3D);
    link1.object3D.add(joint2.object3D);
    joint2.object3D.add(link2.object3D);
    link2.object3D.add(joint3.object3D);
    joint3.object3D.add(link3.object3D);
    link3.object3D.add(joint4.object3D);
    joint4.object3D.add(joint5.object3D);
    joint5.object3D.add(joint6.object3D);
    joint6.object3D.add(this.endEffector.object3D);

    scene.add(this.object3D);
  }

  get jointAngles() {
    return this.joints.map((joint) => joint.currentAngle);
  }

  setJointAngle(index, degrees) {
    const joint = this.joints[index];
    if (!joint) throw new RangeError('不存在编号为 ' + (index + 1) + ' 的关节。');
    return joint.setAngleDegrees(degrees);
  }
}

export function createRobotArm(scene) {
  return new RobotArm(scene);
}
