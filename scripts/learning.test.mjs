import test from 'node:test';
import assert from 'node:assert/strict';

await import('../src/kinematics/matrix.js');
await import('../src/kinematics/forward.js');
await import('../src/kinematics/inverse.js');

const { forwardKinematics, fkChain, inverseKinematics, createIKSession, DEFAULT_JOINT_LIMITS_RAD } = globalThis.RobotArmSimulator;
const close = (actual, expected, tolerance = 1e-8) => assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} is not within ${tolerance} of ${expected}`);

test('fkChain reproduces the forward kinematics pose through 13 steps', () => {
  const angles = [0.3, -0.4, 0.5, 0.2, -0.3, 0.9];
  const chain = fkChain(angles);
  assert.equal(chain.steps.length, 13);
  const pose = forwardKinematics(angles);
  close(chain.pose.position.x, pose.position.x);
  close(chain.pose.position.y, pose.position.y);
  close(chain.pose.position.z, pose.position.z);
  close(chain.pose.orientation.roll, pose.orientation.roll);
  close(chain.pose.orientation.pitch, pose.orientation.pitch);
  close(chain.pose.orientation.yaw, pose.orientation.yaw);
  chain.steps.forEach((step, index) => close(step.index, index + 1, 0));
});

test('fkChain frame origins follow the arm geometry', () => {
  const chain = fkChain([0, 0, 0, 0, 0, 0]);
  const originOf = (frame) => chain.steps.find((step) => step.frame === frame).origin;
  close(originOf('J1')[0], 0);
  close(originOf('J1')[1], 1.16);
  close(originOf('J2')[1], 2.26);
  close(originOf('Tool')[0], 4.44);
  close(originOf('Tool')[1], 2.26);
  close(originOf('Tool')[2], 0);

  const rotated = fkChain([Math.PI / 2, 0, 0, 0, 0, 0]);
  const tool = rotated.steps[rotated.steps.length - 1].origin;
  close(tool[0], 0, 1e-10);
  close(tool[1], 2.26);
  close(tool[2], -4.44, 1e-10);
});

test('fkChain rotation steps keep the frame origin in place', () => {
  const chain = fkChain([0.4, 0.2, -0.3, 0.5, 0.1, 0.7]);
  chain.steps.forEach((step, index) => {
    if (step.type !== 'rotate' || index === 0) return;
    const previous = chain.steps[index - 1];
    step.origin.forEach((value, axis) => close(value, previous.origin[axis], 1e-12));
  });
});

function runToCompletion(session) {
  let guard = 0;
  while (session.step()) {
    guard += 1;
    if (guard > 500) break;
  }
  return guard;
}

test('createIKSession converges step by step to the batch solution', () => {
  const desired = [0.35, 0.25, -0.5, 0.3, 0.4, -0.2];
  const target = forwardKinematics(desired);
  const initial = [0.05, 0.05, -0.05, 0, 0, 0];
  const batch = inverseKinematics(target, initial, DEFAULT_JOINT_LIMITS_RAD);
  const session = createIKSession(target, initial, DEFAULT_JOINT_LIMITS_RAD);

  runToCompletion(session);
  assert.equal(session.state.converged, true, JSON.stringify(session.state));
  assert.equal(session.state.iterations, batch.iterations);
  session.state.angles.forEach((angle, index) => close(angle, batch.angles[index], 1e-12));
  assert.equal(session.state.history.length, session.state.iterations);
  assert.ok(session.state.history[session.state.history.length - 1].positionError
    <= session.state.history[0].positionError + 1e-12, 'position error should not grow');
  session.state.history.forEach((entry, index) => close(entry.iteration, index + 1, 0));
});

test('createIKSession stops on unreachable targets without violating limits', () => {
  const session = createIKSession(
    { position: { x: 50, y: 2.26, z: 0 }, orientation: { roll: 0, pitch: 0, yaw: 0 } },
    [0, 0, 0, 0, 0, 0], DEFAULT_JOINT_LIMITS_RAD,
  );

  runToCompletion(session);
  assert.equal(session.state.converged, false);
  assert.ok(Number.isFinite(session.state.positionError));
  session.state.angles.forEach((angle, index) => {
    assert.ok(angle >= DEFAULT_JOINT_LIMITS_RAD[index][0] - 1e-10);
    assert.ok(angle <= DEFAULT_JOINT_LIMITS_RAD[index][1] + 1e-10);
  });
});

test('createIKSession reports convergence without iterating when already at the target', () => {
  const angles = [0.2, 0.3, -0.4, 0.1, 0.2, -0.1];
  const session = createIKSession(forwardKinematics(angles), angles, DEFAULT_JOINT_LIMITS_RAD);
  assert.equal(session.state.converged, true);
  assert.equal(session.step(), false);
  close(session.state.iterations, 0, 0);
});

test('orientation weight flows into the session parameters', () => {
  const target = forwardKinematics([0.1, 0.2, -0.2, 0, 0.1, 0]);
  const session = createIKSession(target, [0, 0, 0, 0, 0, 0], DEFAULT_JOINT_LIMITS_RAD, { orientationWeight: 0.3 });
  close(session.params.orientationWeight, 0.3, 0);
});
