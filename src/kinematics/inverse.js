(function (global) {
  'use strict';
  const root = typeof window !== 'undefined' ? window : globalThis;
  root.RobotArmSimulator = root.RobotArmSimulator || {};
  const app = root.RobotArmSimulator;
  const { eulerXYZToMatrix, transpose3, multiply3, rotationVector, solveLinearSystem } = app.Matrix;
  const JOINT_LIMITS = [
    [-Math.PI, Math.PI], [-Math.PI / 2, Math.PI / 2], [-2 * Math.PI / 3, 2 * Math.PI / 3],
    [-Math.PI, Math.PI], [-125 * Math.PI / 180, 125 * Math.PI / 180], [-2 * Math.PI, 2 * Math.PI],
  ];

  function vector3(value, keys) {
    if (Array.isArray(value)) return value.slice(0, 3).map(Number);
    return keys.map((key) => Number(value?.[key]));
  }

  function normalizeTarget(target) {
    const position = vector3(target?.position, ['x', 'y', 'z']);
    const orientation = vector3(target?.orientation, ['roll', 'pitch', 'yaw']);
    if ([...position, ...orientation].some((value) => !Number.isFinite(value))) {
      throw new TypeError('逆运动学目标必须包含有效的 XYZ 坐标和 RX/RY/RZ 姿态（弧度）。');
    }
    return { position, rotation: eulerXYZToMatrix(orientation) };
  }

  function normalizeLimits(limits) {
    const source = limits || JOINT_LIMITS;
    if (!Array.isArray(source) || source.length !== 6) throw new TypeError('逆运动学需要六组关节限位。');
    return source.map((limit, index) => {
      const minimum = Array.isArray(limit) ? Number(limit[0]) : Number(limit?.min);
      const maximum = Array.isArray(limit) ? Number(limit[1]) : Number(limit?.max);
      if (!Number.isFinite(minimum) || !Number.isFinite(maximum) || minimum >= maximum) {
        throw new RangeError('Joint' + (index + 1) + ' 的弧度限位无效。');
      }
      return [minimum, maximum];
    });
  }

  function errorFor(angles, target, orientationWeight) {
    const current = app.forwardKinematics(angles);
    const positionError = [
      target.position[0] - current.position.x,
      target.position[1] - current.position.y,
      target.position[2] - current.position.z,
    ];
    const rotationError = rotationVector(multiply3(target.rotation, transpose3(current.rotation)));
    const error = [...positionError, ...rotationError.map((value) => value * orientationWeight)];
    return {
      error,
      cost: error.reduce((total, value) => total + value * value, 0),
      positionError: Math.hypot(...positionError),
      orientationError: Math.hypot(...rotationError),
    };
  }

  function buildJacobian(angles, currentPose, orientationWeight, step) {
    const jacobian = Array.from({ length: 6 }, () => new Array(6).fill(0));
    for (let column = 0; column < 6; column += 1) {
      const perturbed = angles.slice();
      perturbed[column] += step;
      const next = app.forwardKinematics(perturbed);
      jacobian[0][column] = (next.position.x - currentPose.position.x) / step;
      jacobian[1][column] = (next.position.y - currentPose.position.y) / step;
      jacobian[2][column] = (next.position.z - currentPose.position.z) / step;
      const angularDelta = rotationVector(multiply3(next.rotation, transpose3(currentPose.rotation)));
      jacobian[3][column] = angularDelta[0] * orientationWeight / step;
      jacobian[4][column] = angularDelta[1] * orientationWeight / step;
      jacobian[5][column] = angularDelta[2] * orientationWeight / step;
    }
    return jacobian;
  }

  function dampedStep(jacobian, error, damping) {
    const size = 6;
    const normal = Array.from({ length: size }, () => new Array(size).fill(0));
    const right = new Array(size).fill(0);
    for (let row = 0; row < size; row += 1) {
      for (let column = 0; column < size; column += 1) {
        for (let axis = 0; axis < size; axis += 1) normal[row][column] += jacobian[axis][row] * jacobian[axis][column];
      }
      for (let axis = 0; axis < size; axis += 1) right[row] += jacobian[axis][row] * error[axis];
      normal[row][row] += damping * damping;
    }
    return solveLinearSystem(normal, right);
  }

  function inverseKinematics(targetPose, initialAngles, jointLimits, options = {}) {
    const target = normalizeTarget(targetPose);
    const limits = normalizeLimits(jointLimits);
    if (!Array.isArray(initialAngles) || initialAngles.length !== 6 || initialAngles.some((angle) => !Number.isFinite(angle))) {
      throw new TypeError('逆运动学初始状态需要六个以弧度表示的有效关节角。');
    }

    const angles = initialAngles.map((angle, index) => Math.max(limits[index][0], Math.min(limits[index][1], angle)));
    const maxIterations = Math.max(1, Math.floor(options.maxIterations || 160));
    const orientationWeight = Number.isFinite(options.orientationWeight) ? options.orientationWeight : 0.65;
    const positionTolerance = Number.isFinite(options.positionTolerance) ? options.positionTolerance : 0.008;
    const orientationTolerance = Number.isFinite(options.orientationTolerance) ? options.orientationTolerance : 0.03;
    const maximumJointStep = Number.isFinite(options.maximumJointStep) ? options.maximumJointStep : 0.22;
    let metrics = errorFor(angles, target, orientationWeight);
    let iterations = 0;

    for (; iterations < maxIterations; iterations += 1) {
      if (metrics.positionError <= positionTolerance && metrics.orientationError <= orientationTolerance) break;
      const currentPose = app.forwardKinematics(angles);
      const jacobian = buildJacobian(angles, currentPose, orientationWeight, 1e-4);
      let proposal = null;

      for (const damping of [0.035, 0.08, 0.18, 0.4, 0.9]) {
        const delta = dampedStep(jacobian, metrics.error, damping);
        if (!delta) continue;
        const largestStep = Math.max(...delta.map(Math.abs));
        const stepScale = largestStep > maximumJointStep ? maximumJointStep / largestStep : 1;
        for (const lineScale of [1, 0.5, 0.25, 0.125, 0.0625]) {
          const candidate = angles.map((angle, index) => {
            const next = angle + delta[index] * stepScale * lineScale;
            return Math.max(limits[index][0], Math.min(limits[index][1], next));
          });
          const candidateMetrics = errorFor(candidate, target, orientationWeight);
          if (candidateMetrics.cost < metrics.cost - Math.max(1e-14, metrics.cost * 1e-12)
            && (!proposal || candidateMetrics.cost < proposal.metrics.cost)) {
            proposal = { angles: candidate, metrics: candidateMetrics };
          }
        }
      }

      if (!proposal) break;
      for (let index = 0; index < 6; index += 1) angles[index] = proposal.angles[index];
      metrics = proposal.metrics;
    }

    return {
      angles,
      converged: metrics.positionError <= positionTolerance && metrics.orientationError <= orientationTolerance,
      positionError: metrics.positionError,
      orientationError: metrics.orientationError,
      iterations,
    };
  }

  app.inverseKinematics = inverseKinematics;
  app.DEFAULT_JOINT_LIMITS_RAD = JOINT_LIMITS.map((limit) => limit.slice());
})(globalThis);
