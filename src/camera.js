(function (global) {
  'use strict';
  global.RobotArmSimulator = global.RobotArmSimulator || {};
  const app = global.RobotArmSimulator;

  const THREE = global.THREE;
  const OrbitControls = global.OrbitControls;
  function createCamera(viewport) {
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 180);
    camera.position.set(7.5, 6.5, 9.7);
    camera.lookAt(1.35, 1.65, 0);

    const controls = new OrbitControls(camera, viewport);
    controls.target.set(1.35, 1.65, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.065;
    controls.minDistance = 3.5;
    controls.maxDistance = 36;
    controls.maxPolarAngle = Math.PI * 0.49;
    controls.update();

    return { camera, controls };
  }
  app.createCamera = createCamera;
})(window);
