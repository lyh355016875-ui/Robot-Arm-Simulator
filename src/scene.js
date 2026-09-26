(function (global) {
  'use strict';
  global.RobotArmSimulator = global.RobotArmSimulator || {};
  const app = global.RobotArmSimulator;

  const THREE = global.THREE;
  function createScene() {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0b1220');
    scene.fog = new THREE.Fog('#0b1220', 28, 78);

    const hemisphereLight = new THREE.HemisphereLight('#d7edff', '#25344a', 2.45);
    scene.add(hemisphereLight);

    const keyLight = new THREE.DirectionalLight('#f1f7ff', 3.1);
    keyLight.position.set(-8, 14, 9);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(2048, 2048);
    keyLight.shadow.camera.left = -24;
    keyLight.shadow.camera.right = 24;
    keyLight.shadow.camera.top = 24;
    keyLight.shadow.camera.bottom = -24;
    keyLight.shadow.bias = -0.00015;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight('#7bd9ef', 1.2);
    fillLight.position.set(8, 7, 10);
    scene.add(fillLight);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(160, 160),
      new THREE.MeshStandardMaterial({
        color: '#111b2b',
        roughness: 0.94,
        metalness: 0.02,
      }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.012;
    ground.receiveShadow = true;
    ground.name = 'Ground';
    scene.add(ground);

    const grid = new THREE.GridHelper(80, 80, '#287e91', '#243247');
    grid.position.y = 0.006;
    grid.material.transparent = true;
    grid.material.opacity = 0.62;
    grid.name = 'World Grid';
    scene.add(grid);

    const axes = new THREE.AxesHelper(2.4);
    axes.position.y = 0.018;
    axes.name = 'World Axes';
    scene.add(axes);

    return scene;
  }
  app.createScene = createScene;
})(window);
