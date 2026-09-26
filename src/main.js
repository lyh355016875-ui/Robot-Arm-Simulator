import { createCamera } from './camera.js';
import { createRenderer } from './renderer.js';
import { createRobotArm } from './robotArm.js';
import { createScene } from './scene.js';

const container = document.querySelector('#scene-container');
const fpsValue = document.querySelector('#fps-value');
const engineState = document.querySelector('#engine-state');
const engineIndicator = document.querySelector('#engine-indicator');

function bindJointSliders(joints) {
  const bindings = [
    { inputId: 'joint1-angle', outputId: 'joint1-value', joint: joints.joint1, axis: 'y' },
    { inputId: 'joint2-angle', outputId: 'joint2-value', joint: joints.joint2, axis: 'z' },
    { inputId: 'joint3-angle', outputId: 'joint3-value', joint: joints.joint3, axis: 'z' },
  ];

  for (const binding of bindings) {
    const input = document.getElementById(binding.inputId);
    const output = document.getElementById(binding.outputId);
    const updateAngle = () => {
      const degrees = Number(input.value);
      binding.joint.rotation[binding.axis] = (degrees * Math.PI) / 180;
      output.value = `${degrees}°`;
      output.textContent = `${degrees}°`;
    };

    input.addEventListener('input', updateAngle);
    updateAngle();
  }
}

try {
  const scene = createScene();
  const robot = createRobotArm(scene);
  const { camera, controls } = createCamera(container);
  const { renderer, resize } = createRenderer(container);

  bindJointSliders(robot.joints);
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
