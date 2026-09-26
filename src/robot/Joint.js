import * as THREE from 'three';

const AXES = new Set(['x', 'y', 'z']);
const HOUSING_MATERIAL = new THREE.MeshStandardMaterial({ color: '#26394c', metalness: 0.78, roughness: 0.3 });
const BEARING_MATERIAL = new THREE.MeshStandardMaterial({ color: '#c3d2dd', metalness: 0.75, roughness: 0.23 });
const ACCENT_MATERIAL = new THREE.MeshStandardMaterial({
  color: '#43c8d8',
  metalness: 0.62,
  roughness: 0.23,
  emissive: '#0a3138',
  emissiveIntensity: 0.35,
});

function addCylinder(parent, radius, length, material, name, axis, offset = 0) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, 40), material);
  mesh.name = name;
  mesh.rotation.set(...(axis === 'x' ? [0, 0, Math.PI / 2] : axis === 'z' ? [Math.PI / 2, 0, 0] : [0, 0, 0]));
  if (axis === 'x') mesh.position.x = offset;
  else if (axis === 'z') mesh.position.z = offset;
  else mesh.position.y = offset;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
}

export class Joint {
  constructor({ name, axis, minAngle, maxAngle, initialAngle = 0, position = [0, 0, 0], housingRadius = 0.3 }) {
    if (!name) throw new TypeError('关节必须有名称。');
    if (!AXES.has(axis)) throw new TypeError('不支持的关节旋转轴：' + axis);
    if (!Number.isFinite(minAngle) || !Number.isFinite(maxAngle) || minAngle >= maxAngle) {
      throw new RangeError(name + ' 的角度范围无效。');
    }

    this.name = name;
    this.axis = axis;
    this.rotationAxis = axis;
    this.minAngle = minAngle;
    this.maxAngle = maxAngle;
    this.currentAngle = 0;
    this.object3D = new THREE.Object3D();
    this.object3D.name = name;
    this.object3D.position.set(...position);

    addCylinder(this.object3D, housingRadius, 0.28, HOUSING_MATERIAL, name + ' Housing', axis);
    addCylinder(this.object3D, housingRadius * 0.78, 0.055, BEARING_MATERIAL, name + ' Bearing A', axis, -0.17);
    addCylinder(this.object3D, housingRadius * 0.78, 0.055, BEARING_MATERIAL, name + ' Bearing B', axis, 0.17);
    addCylinder(this.object3D, housingRadius * 0.34, 0.06, ACCENT_MATERIAL, name + ' Hub A', axis, -0.21);
    addCylinder(this.object3D, housingRadius * 0.34, 0.06, ACCENT_MATERIAL, name + ' Hub B', axis, 0.21);

    const axesHelper = new THREE.AxesHelper(0.42);
    axesHelper.name = name + ' Coordinate Axes';
    axesHelper.position.set(housingRadius + 0.13, 0.13, 0.13);
    this.object3D.add(axesHelper);
    this.setAngleDegrees(initialAngle);
  }

  setAngleDegrees(value) {
    const degrees = Number(value);
    if (!Number.isFinite(degrees)) throw new TypeError(this.name + ' 角度必须是有效数字。');

    this.currentAngle = THREE.MathUtils.clamp(degrees, this.minAngle, this.maxAngle);
    this.object3D.rotation[this.rotationAxis] = THREE.MathUtils.degToRad(this.currentAngle);
    return this.currentAngle;
  }
}
