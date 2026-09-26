import { createCamera } from './camera.js';
import { createRenderer } from './renderer.js';
import { createRobotArm } from './robot/RobotArm.js';
import { connectJointControls } from './robot/controller.js';
import { createScene } from './scene.js';

const container = document.querySelector('#scene-container');
const fpsValue = document.querySelector('#fps-value');
const engineState = document.querySelector('#engine-state');
const engineIndicator = document.querySelector('#engine-indicator');

try {
  const scene = createScene();
  const robot = createRobotArm(scene);
  const { camera, controls } = createCamera(container);
  const { renderer, resize } = createRenderer(container);

  connectJointControls(robot.joints);
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
    renderer.render(scene, camera);
  }

  engineState.textContent = '3D 引擎运行中';
  engineIndicator.classList.add('is-ready');
  requestAnimationFrame(animate);
} catch (error) {
  console.error('无法启动 3D 场景：', error);
  engineState.textContent = '引擎启动失败';
  engineIndicator.classList.add('has-error');
  fpsValue.textContent = 'ERR';
}
