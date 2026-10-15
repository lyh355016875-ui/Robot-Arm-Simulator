(function (global) {
  'use strict';
  const root = typeof window !== 'undefined' ? window : globalThis;
  root.RobotArmSimulator = root.RobotArmSimulator || {};
  const app = root.RobotArmSimulator;
  const { identity4, multiply4, translation4, rotation4, transformPoint, rotation3, matrixToEulerXYZ } = app.Matrix;

  // These offsets and axes mirror the Object3D chain in robot/RobotArm.js.
  // Each step completes the named frame; forwardKinematics and the learning
  // card both walk this single chain definition.
  const FK_STEPS = [
    { type: 'translate', offset: [0, 1.16, 0], frame: 'J1', joint: 0, label: '上升到 J1 关节' },
    { type: 'rotate', axis: 'y', frame: 'J1', joint: 0, label: 'J1 底座旋转' },
    { type: 'translate', offset: [0, 1.1, 0], frame: 'J2', joint: 1, label: '上升到 J2 关节' },
    { type: 'rotate', axis: 'z', frame: 'J2', joint: 1, label: 'J2 肩部俯仰' },
    { type: 'translate', offset: [1.65, 0, 0], frame: 'J3', joint: 2, label: '沿大臂平移' },
    { type: 'rotate', axis: 'z', frame: 'J3', joint: 2, label: 'J3 肘部旋转' },
    { type: 'translate', offset: [1.45, 0, 0], frame: 'J4', joint: 3, label: '沿小臂平移' },
    { type: 'rotate', axis: 'x', frame: 'J4', joint: 3, label: 'J4 腕部旋转' },
    { type: 'translate', offset: [0.24, 0, 0], frame: 'J5', joint: 4, label: '到达 J5 关节' },
    { type: 'rotate', axis: 'z', frame: 'J5', joint: 4, label: 'J5 腕部俯仰' },
    { type: 'translate', offset: [0.24, 0, 0], frame: 'J6', joint: 5, label: '到达 J6 关节' },
    { type: 'rotate', axis: 'x', frame: 'J6', joint: 5, label: 'J6 末端旋转' },
    { type: 'translate', offset: [0.86, 0, 0], frame: 'Tool', joint: null, label: '到达工具中心点' },
  ];

  function assertJointAngles(jointAngles) {
    if (!Array.isArray(jointAngles) || jointAngles.length !== 6 || jointAngles.some((angle) => !Number.isFinite(angle))) {
      throw new TypeError('正运动学需要六个以弧度表示的有效关节角。');
    }
  }

  function stepMatrix(step, jointAngles) {
    if (step.type === 'translate') return translation4(step.offset[0], step.offset[1], step.offset[2]);
    return rotation4(step.axis, jointAngles[step.joint]);
  }

  // fkChain accumulates the transform step by step so the learning card can
  // show every intermediate matrix and frame origin.
  function fkChain(jointAngles) {
    assertJointAngles(jointAngles);
    let matrix = identity4();
    const steps = FK_STEPS.map((step, index) => {
      matrix = multiply4(matrix, stepMatrix(step, jointAngles));
      return {
        index: index + 1,
        type: step.type,
        axis: step.type === 'rotate' ? step.axis : null,
        offset: step.type === 'translate' ? step.offset.slice() : null,
        joint: step.joint,
        frame: step.frame,
        label: step.label,
        matrix: matrix.slice(),
        origin: transformPoint(matrix, [0, 0, 0]),
      };
    });

    const rotation = rotation3(matrix);
    const [roll, pitch, yaw] = matrixToEulerXYZ(rotation);
    const [x, y, z] = transformPoint(matrix, [0, 0, 0]);
    return {
      steps,
      pose: { position: { x, y, z }, rotation, orientation: { roll, pitch, yaw } },
    };
  }

  function forwardKinematics(jointAngles) {
    return fkChain(jointAngles).pose;
  }

  app.forwardKinematics = forwardKinematics;
  app.fkChain = fkChain;
})(globalThis);
