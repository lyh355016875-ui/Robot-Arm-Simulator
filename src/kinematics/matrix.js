(function (global) {
  'use strict';
  const root = typeof window !== 'undefined' ? window : globalThis;
  root.RobotArmSimulator = root.RobotArmSimulator || {};
  const app = root.RobotArmSimulator;

  const IDENTITY4 = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

  function multiply4(a, b) {
    const result = new Array(16).fill(0);
    for (let row = 0; row < 4; row += 1) {
      for (let column = 0; column < 4; column += 1) {
        for (let k = 0; k < 4; k += 1) result[row * 4 + column] += a[row * 4 + k] * b[k * 4 + column];
      }
    }
    return result;
  }

  function translation4(x, y, z) {
    return [1, 0, 0, x, 0, 1, 0, y, 0, 0, 1, z, 0, 0, 0, 1];
  }

  function rotation4(axis, angle) {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    if (axis === 'x') return [1, 0, 0, 0, 0, c, -s, 0, 0, s, c, 0, 0, 0, 0, 1];
    if (axis === 'y') return [c, 0, s, 0, 0, 1, 0, 0, -s, 0, c, 0, 0, 0, 0, 1];
    if (axis === 'z') return [c, -s, 0, 0, s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
    throw new TypeError('旋转轴必须是 x、y 或 z。');
  }

  function transformPoint(matrix, point) {
    const [x, y, z] = point;
    return [
      matrix[0] * x + matrix[1] * y + matrix[2] * z + matrix[3],
      matrix[4] * x + matrix[5] * y + matrix[6] * z + matrix[7],
      matrix[8] * x + matrix[9] * y + matrix[10] * z + matrix[11],
    ];
  }

  function rotation3(matrix4) {
    return [matrix4[0], matrix4[1], matrix4[2], matrix4[4], matrix4[5], matrix4[6], matrix4[8], matrix4[9], matrix4[10]];
  }

  function multiply3(a, b) {
    const result = new Array(9).fill(0);
    for (let row = 0; row < 3; row += 1) {
      for (let column = 0; column < 3; column += 1) {
        for (let k = 0; k < 3; k += 1) result[row * 3 + column] += a[row * 3 + k] * b[k * 3 + column];
      }
    }
    return result;
  }

  function transpose3(matrix) {
    return [matrix[0], matrix[3], matrix[6], matrix[1], matrix[4], matrix[7], matrix[2], matrix[5], matrix[8]];
  }

  function eulerXYZToMatrix(angles) {
    const [x, y, z] = angles;
    return rotation3(multiply4(multiply4(rotation4('x', x), rotation4('y', y)), rotation4('z', z)));
  }

  function matrixToEulerXYZ(matrix) {
    const y = Math.asin(Math.max(-1, Math.min(1, matrix[2])));
    let x;
    let z;
    if (Math.abs(matrix[2]) < 0.9999999) {
      x = Math.atan2(-matrix[5], matrix[8]);
      z = Math.atan2(-matrix[1], matrix[0]);
    } else {
      x = Math.atan2(matrix[7], matrix[4]);
      z = 0;
    }
    return [x, y, z];
  }

  function rotationVector(matrix) {
    const cosine = Math.max(-1, Math.min(1, (matrix[0] + matrix[4] + matrix[8] - 1) / 2));
    const angle = Math.acos(cosine);
    const skew = [matrix[7] - matrix[5], matrix[2] - matrix[6], matrix[3] - matrix[1]];
    if (angle < 1e-7) return skew.map((value) => value * 0.5);
    if (Math.PI - angle < 1e-5) {
      const axis = [
        Math.sqrt(Math.max(0, (matrix[0] + 1) * 0.5)),
        Math.sqrt(Math.max(0, (matrix[4] + 1) * 0.5)),
        Math.sqrt(Math.max(0, (matrix[8] + 1) * 0.5)),
      ];
      if (matrix[1] + matrix[3] < 0) axis[1] = -axis[1];
      if (matrix[2] + matrix[6] < 0) axis[2] = -axis[2];
      const length = Math.hypot(...axis) || 1;
      return axis.map((value) => value * angle / length);
    }
    const scale = angle / (2 * Math.sin(angle));
    return skew.map((value) => value * scale);
  }

  function solveLinearSystem(matrix, vector) {
    const size = vector.length;
    const augmented = matrix.map((row, index) => [...row, vector[index]]);
    for (let column = 0; column < size; column += 1) {
      let pivot = column;
      for (let row = column + 1; row < size; row += 1) {
        if (Math.abs(augmented[row][column]) > Math.abs(augmented[pivot][column])) pivot = row;
      }
      if (Math.abs(augmented[pivot][column]) < 1e-12) return null;
      [augmented[column], augmented[pivot]] = [augmented[pivot], augmented[column]];
      const divisor = augmented[column][column];
      for (let item = column; item <= size; item += 1) augmented[column][item] /= divisor;
      for (let row = 0; row < size; row += 1) {
        if (row === column) continue;
        const factor = augmented[row][column];
        for (let item = column; item <= size; item += 1) augmented[row][item] -= factor * augmented[column][item];
      }
    }
    return augmented.map((row) => row[size]);
  }

  app.Matrix = {
    identity4: () => IDENTITY4.slice(),
    multiply4,
    translation4,
    rotation4,
    transformPoint,
    rotation3,
    multiply3,
    transpose3,
    eulerXYZToMatrix,
    matrixToEulerXYZ,
    rotationVector,
    solveLinearSystem,
  };
})(globalThis);
