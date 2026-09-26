import * as THREE from 'three';

const VALID_AXES = new Set(['x', 'y', 'z']);

export class Joint {
  constructor({ name, axis, position = [0, 0, 0], angleDegrees = 0 }) {
    if (!name) throw new TypeError('关节必须有名称。');
    if (!VALID_AXES.has(axis)) throw new TypeError(`不支持的关节旋转轴：${axis}`);

    this.axis = axis;
    this.object3D = new THREE.Object3D();
    this.object3D.name = name;
    this.object3D.position.set(...position);
    this.setAngleDegrees(angleDegrees);
  }

  setAngleDegrees(angleDegrees) {
    const degrees = Number(angleDegrees);
    if (!Number.isFinite(degrees)) throw new TypeError('关节角度必须是有效数字。');

    this.angleDegrees = degrees;
    this.object3D.rotation[this.axis] = THREE.MathUtils.degToRad(degrees);
    return degrees;
  }
}
