(function (global) {
  'use strict';
  const root = typeof window !== 'undefined' ? window : globalThis;
  root.RobotArmSimulator = root.RobotArmSimulator || {};
  const app = root.RobotArmSimulator;
  const { identity4, multiply4, translation4, rotation4, transformPoint, rotation3, matrixToEulerXYZ } = app.Matrix;

  // These offsets and axes mirror the Object3D chain in robot/RobotArm.js.
  function forwardKinematics(jointAngles) {
    if (!Array.isArray(jointAngles) || jointAngles.length !== 6 || jointAngles.some((angle) => !Number.isFinite(angle))) {
      throw new TypeError('正运动学需要六个以弧度表示的有效关节角。');
    }

    let matrix = identity4();
    const apply = (next) => { matrix = multiply4(matrix, next); };
    apply(translation4(0, 1.16, 0));
    apply(rotation4('y', jointAngles[0]));
    apply(translation4(0, 1.1, 0));
    apply(rotation4('z', jointAngles[1]));
    apply(translation4(1.65, 0, 0));
    apply(rotation4('z', jointAngles[2]));
    apply(translation4(1.45, 0, 0));
    apply(rotation4('x', jointAngles[3]));
    apply(translation4(0.24, 0, 0));
    apply(rotation4('z', jointAngles[4]));
    apply(translation4(0.24, 0, 0));
    apply(rotation4('x', jointAngles[5]));
    apply(translation4(0.86, 0, 0));

    const rotation = rotation3(matrix);
    const [roll, pitch, yaw] = matrixToEulerXYZ(rotation);
    const [x, y, z] = transformPoint(matrix, [0, 0, 0]);
    return {
      position: { x, y, z },
      rotation,
      orientation: { roll, pitch, yaw },
    };
  }

  app.forwardKinematics = forwardKinematics;
})(globalThis);
