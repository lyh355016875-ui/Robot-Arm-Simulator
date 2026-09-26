import test from 'node:test';
import assert from 'node:assert/strict';

await import('../src/kinematics/matrix.js');
await import('../src/kinematics/forward.js');
await import('../src/kinematics/inverse.js');

const { forwardKinematics, inverseKinematics, Matrix, DEFAULT_JOINT_LIMITS_RAD } = globalThis.RobotArmSimulator;
const close = (actual, expected, tolerance = 1e-8) => assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} is not within ${tolerance} of ${expected}`);

test('forward kinematics matches the zero-angle arm geometry', () => {
  const pose = forwardKinematics([0, 0, 0, 0, 0, 0]);
  close(pose.position.x, 4.44);
  close(pose.position.y, 2.26);
  close(pose.position.z, 0);
  close(pose.orientation.roll, 0);
  close(pose.orientation.pitch, 0);
  close(pose.orientation.yaw, 0);
});

test('J1 rotates the arm about the world Y axis', () => {
  const pose = forwardKinematics([Math.PI / 2, 0, 0, 0, 0, 0]);
  close(pose.position.x, 0, 1e-10);
  close(pose.position.y, 2.26);
  close(pose.position.z, -4.44, 1e-10);
});

test('XYZ Euler conversion round-trips a non-singular orientation', () => {
  const original = [0.4, -0.55, 1.1];
  const recovered = Matrix.matrixToEulerXYZ(Matrix.eulerXYZToMatrix(original));
  recovered.forEach((angle, index) => close(angle, original[index], 1e-10));
});

test('inverse kinematics returns a limited solution for a reachable pose', () => {
  const desiredAngles = [0.35, 0.25, -0.5, 0.3, 0.4, -0.2];
  const target = forwardKinematics(desiredAngles);
  const initialAngles = [0.05, 0.05, -0.05, 0, 0, 0];
  const solution = inverseKinematics(target, initialAngles, DEFAULT_JOINT_LIMITS_RAD);

  assert.equal(solution.converged, true, JSON.stringify(solution));
  assert.ok(solution.positionError < 0.008);
  assert.ok(solution.orientationError < 0.03);
  solution.angles.forEach((angle, index) => {
    assert.ok(angle >= DEFAULT_JOINT_LIMITS_RAD[index][0] - 1e-10);
    assert.ok(angle <= DEFAULT_JOINT_LIMITS_RAD[index][1] + 1e-10);
  });
});

test('inverse kinematics respects the robot starting pose limits', () => {
  const toRadians = (degrees) => degrees * Math.PI / 180;
  const initial = [0, 30, -55, 0, 35, 0].map(toRadians);
  const target = forwardKinematics([0.2, 0.45, -0.35, -0.4, 0.25, 0.5]);
  const solution = inverseKinematics(target, initial, DEFAULT_JOINT_LIMITS_RAD);

  assert.equal(solution.converged, true, JSON.stringify(solution));
  assert.ok(solution.positionError < 0.008);
  assert.ok(solution.orientationError < 0.03);
});

test('inverse kinematics reports an unreachable target without exceeding joint limits', () => {
  const target = { position: { x: 50, y: 2.26, z: 0 }, orientation: { roll: 0, pitch: 0, yaw: 0 } };
  const solution = inverseKinematics(target, [0, 0, 0, 0, 0, 0], DEFAULT_JOINT_LIMITS_RAD);

  assert.equal(solution.converged, false);
  assert.ok(Number.isFinite(solution.positionError));
  solution.angles.forEach((angle, index) => {
    assert.ok(angle >= DEFAULT_JOINT_LIMITS_RAD[index][0] - 1e-10);
    assert.ok(angle <= DEFAULT_JOINT_LIMITS_RAD[index][1] + 1e-10);
  });
});
