(function (global) {
  'use strict';
  global.RobotArmSimulator = global.RobotArmSimulator || {};
  const app = global.RobotArmSimulator;

  const { createCamera, createRenderer, createRobotArm, Workbench, JointController, KeyboardController, PoseDisplay, TargetController, PickPlaceController, RobotSensors, WorkspaceManager, MonitorCards, createScene } = app;
  const container = document.querySelector('#scene-container');
  const fpsValue = document.querySelector('#fps-value');
  try {
    const scene = createScene();
    const robot = createRobotArm(scene);
    const workbench = new Workbench(scene);
    const { camera, controls } = createCamera(container);
    const { renderer, resize } = createRenderer(container);

    const poseDisplay = new PoseDisplay(robot);
    let targetController = null;
    const jointController = new JointController(robot, {
      onChange: () => poseDisplay.update(),
      onManualChange: () => targetController?.cancelMotion(),
    });
    const keyboardController = new KeyboardController(jointController);
    targetController = new TargetController({ robot, scene, camera, renderer, orbitControls: controls, jointController });
    const workspaceManager = new WorkspaceManager({ layer: document.getElementById('card-layer'), workbench, scene });
    const pickPlaceController = new PickPlaceController({ robot, workbench, targetController });
    workspaceManager.setTaskController(pickPlaceController);
    const robotSensors = new RobotSensors({ scene, robot, workbench, taskController: pickPlaceController });
    const monitorCards = new MonitorCards({ robot, workbench, taskController: pickPlaceController });
    poseDisplay.update();
    app.runtime = { scene, robot, workbench, camera, controls, renderer, jointController, targetController,
      pickPlaceController, robotSensors, workspaceManager, monitorCards };

    window.addEventListener('pagehide', () => {
      jointController.dispose();
      keyboardController.dispose();
      pickPlaceController.dispose();
      robotSensors.dispose();
      targetController.dispose();
      controls.dispose();
      renderer.dispose();
    }, { once: true });

    resize(camera);
    const resizeObserver = new ResizeObserver(() => resize(camera));
    resizeObserver.observe(container);

    let frameCount = 0;
    let lastFpsUpdate = performance.now();
    let lastFrameTime = lastFpsUpdate;
    let fps = 60;

    function animate(now) {
      requestAnimationFrame(animate);
      frameCount += 1;

      const elapsed = now - lastFpsUpdate;
      if (elapsed >= 500) {
        const measuredFps = (frameCount * 1000) / elapsed;
        fps = Math.round(fps * 0.35 + measuredFps * 0.65);
        fpsValue.textContent = String(fps);
        frameCount = 0;
        lastFpsUpdate = now;
      }

      const delta = Math.min((now - lastFrameTime) / 1000, 0.05);
      lastFrameTime = now;
      controls.update(delta);
      targetController.update(delta);
      pickPlaceController.update(delta);
      robotSensors.update(delta);
      monitorCards.update(delta);
      renderer.render(scene, camera);
    }

    global.RobotArmSimulatorBoot.ready();
    requestAnimationFrame(animate);
  } catch (error) {
    global.RobotArmSimulatorBoot.fail(error);
    fpsValue.textContent = 'ERR';
  }
})(window);
