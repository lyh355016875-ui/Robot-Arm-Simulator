import test from 'node:test';
import assert from 'node:assert/strict';

await import('../src/kinematics/matrix.js');
await import('../src/kinematics/forward.js');
await import('../src/kinematics/inverse.js');
await import('../src/controller/PickPlaceController.js');

const { forwardKinematics, inverseKinematics, Matrix, DEFAULT_JOINT_LIMITS_RAD, PickPlaceController } = globalThis.RobotArmSimulator;
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

test('tabletop pick and placement poses remain reachable across a batch', () => {
  let angles = [0, 30, -55, 0, 35, 0].map((degrees) => degrees * Math.PI / 180);
  const orientation = { roll: 0, pitch: 0, yaw: -Math.PI / 2 };
  const picks = [
    { x: 1.93, y: 1.015, z: -1.03 }, { x: 2.15, y: 1.025, z: -0.52 },
    { x: 2.42, y: 1.02, z: -0.05 }, { x: 2.81, y: 1.035, z: 0.63 },
    { x: 1.93, y: 1.02, z: 0.63 },
  ];
  const dropSlots = [-1.08, -0.64, -0.2, 0.24, 0.68];

  picks.forEach((position, index) => {
    const approach = inverseKinematics({
      position: { ...position, y: position.y + 0.3 }, orientation,
    }, angles, DEFAULT_JOINT_LIMITS_RAD);
    assert.equal(approach.converged, true, 'approach slot ' + index + ': ' + JSON.stringify(approach));
    angles = approach.angles;
    const pick = inverseKinematics({ position, orientation }, angles, DEFAULT_JOINT_LIMITS_RAD);
    assert.equal(pick.converged, true, 'pick slot ' + index + ': ' + JSON.stringify(pick));
    angles = pick.angles;
    const placement = inverseKinematics({
      position: { x: 3.1, y: 1.06, z: dropSlots[index] }, orientation,
    }, angles, DEFAULT_JOINT_LIMITS_RAD);
    assert.equal(placement.converged, true, 'drop slot ' + index + ': ' + JSON.stringify(placement));
    angles = placement.angles;
  });
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

test('pick and place state machine scans, grabs, places, and returns to IDLE', async () => {
  class FakeElement {
    constructor(ownerDocument) {
      this.ownerDocument = ownerDocument;
      this.listeners = new Map();
      this.children = [];
      this.dataset = {};
      this.disabled = false;
      this.scrollHeight = 0;
      this.scrollTop = 0;
    }
    addEventListener(name, listener) { this.listeners.set(name, listener); }
    removeEventListener(name, listener) { if (this.listeners.get(name) === listener) this.listeners.delete(name); }
    appendChild(child) { child.parent = this; this.children.push(child); return child; }
    get firstElementChild() { return this.children[0] || null; }
    remove() { if (this.parent) this.parent.children.splice(this.parent.children.indexOf(this), 1); }
    click(name = 'click') { this.listeners.get(name)?.(); }
  }

  const document = { createElement: () => new FakeElement(document) };
  const elements = Object.fromEntries(['task-state', 'task-log', 'start-pick-place', 'spawn-workpieces', 'stop-pick-place', 'release-held-part']
    .map((id) => [id, new FakeElement(document)]));
  const rootElement = { getElementById: (id) => elements[id] || null };
  const part = { id: 'part-test', label: '方块', status: 'available' };
  const workbench = {
    getAvailableWorkpieces: () => part.status === 'available' ? [part] : [],
    detectNextTarget: () => part.status === 'available'
      ? { part, position: { x: 2.2, y: 1.0, z: 0.1 }, confidence: 0.99 }
      : null,
    setHighlight() {},
    pick(item) { item.status = 'held'; },
    getPlacementPose: () => ({ position: { x: 3.1, y: 1, z: 0 }, orientation: { roll: 0, pitch: 0, yaw: -Math.PI / 2 } }),
    place(item) { item.status = 'placed'; },
    markFailed(item) { item.status = 'failed'; },
  };
  const endEffector = {
    gripperOpening: 1,
    setGripperOpening(value) { this.gripperOpening = value; },
    setGripperOpen(open) { this.gripperOpening = open ? 1 : 0; },
  };
  const robot = { endEffector };
  const targetController = {
    moveToPose: async () => ({ cancelled: false, solution: { converged: true, positionError: 0, orientationError: 0 } }),
    cancelMotion() {},
  };
  const controller = new PickPlaceController({ robot, workbench, targetController, rootElement });
  elements['start-pick-place'].click();
  assert.equal(controller.state, 'SCAN', 'the start button enters the scan state');
  controller.update(0.5);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(controller.state, 'GRAB');
  controller.update(0.48);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(controller.state, 'PLACE');
  assert.equal(controller.placePhase, 'release');
  controller.update(0.38);
  assert.equal(part.status, 'placed');
  assert.equal(controller.state, 'SCAN');
  controller.update(0.5);
  assert.equal(controller.state, 'IDLE');
  const log = elements['task-log'].children.map((item) => item.textContent).join('\n');
  for (const state of ['[SCAN]', '[MOVE]', '[GRAB]', '[PLACE]', '[IDLE]']) assert.match(log, new RegExp(state));
  controller.dispose();
});
