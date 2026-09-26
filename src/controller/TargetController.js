(function (global) {
  'use strict';
  const root = typeof window !== 'undefined' ? window : globalThis;
  root.RobotArmSimulator = root.RobotArmSimulator || {};
  const app = root.RobotArmSimulator;
  const THREE = root.THREE;

  const INPUT_IDS = ['x', 'y', 'z', 'rx', 'ry', 'rz'];
  const RAD_TO_DEG = 180 / Math.PI;
  const DEG_TO_RAD = Math.PI / 180;

  class TargetController {
    constructor({ robot, scene, camera, renderer, orbitControls, jointController, rootElement = document }) {
      if (!robot || !scene || !camera || !renderer || !jointController) throw new TypeError('目标控制器缺少场景、相机或机械臂依赖。');
      this.robot = robot;
      this.scene = scene;
      this.jointController = jointController;
      this.orbitControls = orbitControls;
      this.inputs = Object.fromEntries(INPUT_IDS.map((key) => {
        const input = rootElement.getElementById('target-' + key);
        if (!input) throw new Error('缺少目标输入框：target-' + key);
        return [key, input];
      }));
      this.button = rootElement.getElementById('move-to-target');
      this.status = rootElement.getElementById('target-status');
      if (!this.button || !this.status) throw new Error('缺少目标控制按钮或状态显示。');

      this.targetObject = this.createTargetObject();
      this.scene.add(this.targetObject);
      this.transformControls = new root.TransformControls(camera, renderer.domElement);
      this.transformControls.setMode('translate');
      this.transformControls.setSpace('world');
      this.transformControls.setSize(0.72);
      this.transformControls.attach(this.targetObject);
      this.transformHelper = this.transformControls.getHelper();
      this.scene.add(this.transformHelper);

      const initialPose = this.robot.getEndEffectorPose();
      this.writeInputs(initialPose);
      this.syncMarkerFromInputs();
      this.animation = null;
      this.debounceTimer = 0;
      this.removeListeners = [];

      this.onInput = () => {
        if (this.syncMarkerFromInputs()) this.scheduleMove(320);
        else {
          clearTimeout(this.debounceTimer);
          this.setStatus('请填写六个有效的目标数值。', 'error');
        }
      };
      this.onObjectChange = () => {
        this.writePositionInputs(this.targetObject.position);
        if (!this.transformControls.dragging) this.scheduleMove(180);
      };
      this.onDraggingChanged = (event) => {
        if (this.orbitControls) this.orbitControls.enabled = !event.value;
        if (!event.value) {
          this.writePositionInputs(this.targetObject.position);
          this.moveToTarget();
        }
      };
      this.onButtonClick = () => this.moveToTarget();
      this.transformControls.addEventListener('objectChange', this.onObjectChange);
      this.transformControls.addEventListener('dragging-changed', this.onDraggingChanged);
      this.button.addEventListener('click', this.onButtonClick);
      for (const input of Object.values(this.inputs)) input.addEventListener('input', this.onInput);
      this.removeListeners.push(() => this.transformControls.removeEventListener('objectChange', this.onObjectChange));
      this.removeListeners.push(() => this.transformControls.removeEventListener('dragging-changed', this.onDraggingChanged));
      this.removeListeners.push(() => this.button.removeEventListener('click', this.onButtonClick));
      for (const input of Object.values(this.inputs)) this.removeListeners.push(() => input.removeEventListener('input', this.onInput));
      this.setStatus('拖动目标球，或输入 XYZ 与 RX/RY/RZ。', 'ready');
    }

    createTargetObject() {
      const target = new THREE.Group();
      target.name = 'IK Target';

      const sphereMaterial = new THREE.MeshStandardMaterial({
        color: '#74f1f2', emissive: '#0b5861', emissiveIntensity: 0.8,
        metalness: 0.18, roughness: 0.2, transparent: true, opacity: 0.92,
      });
      const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.13, 28, 20), sphereMaterial);
      sphere.name = 'IK Target Control Ball';
      sphere.castShadow = true;
      target.add(sphere);

      const halo = new THREE.Mesh(
        new THREE.TorusGeometry(0.2, 0.012, 8, 40),
        new THREE.MeshBasicMaterial({ color: '#61e6ee', transparent: true, opacity: 0.8 }),
      );
      halo.name = 'IK Target Halo';
      halo.rotation.x = Math.PI / 2;
      target.add(halo);

      const axes = new THREE.AxesHelper(0.42);
      axes.name = 'IK Target Orientation Axes';
      target.add(axes);
      return target;
    }

    writeInputs(pose) {
      this.writePositionInputs(pose.position);
      this.inputs.rx.value = pose.orientation.roll.toFixed(1);
      this.inputs.ry.value = pose.orientation.pitch.toFixed(1);
      this.inputs.rz.value = pose.orientation.yaw.toFixed(1);
    }

    writePositionInputs(position) {
      this.inputs.x.value = Number(position.x).toFixed(2);
      this.inputs.y.value = Number(position.y).toFixed(2);
      this.inputs.z.value = Number(position.z).toFixed(2);
    }

    readTarget() {
      if (INPUT_IDS.some((key) => this.inputs[key].value.trim() === '')) return null;
      const values = Object.fromEntries(INPUT_IDS.map((key) => [key, Number(this.inputs[key].value)]));
      if (Object.values(values).some((value) => !Number.isFinite(value))) return null;
      return {
        position: { x: values.x, y: values.y, z: values.z },
        orientation: { roll: values.rx * DEG_TO_RAD, pitch: values.ry * DEG_TO_RAD, yaw: values.rz * DEG_TO_RAD },
      };
    }

    syncMarkerFromInputs() {
      const target = this.readTarget();
      if (!target) return false;
      this.targetObject.position.set(target.position.x, target.position.y, target.position.z);
      this.targetObject.rotation.set(target.orientation.roll, target.orientation.pitch, target.orientation.yaw, 'XYZ');
      this.targetObject.updateMatrixWorld(true);
      this.setStatus('目标已更新，正在规划移动。', 'ready');
      return true;
    }

    scheduleMove(delay) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => this.moveToTarget(), delay);
    }

    getJointLimits() {
      return this.robot.joints.map((joint) => [joint.minAngle * DEG_TO_RAD, joint.maxAngle * DEG_TO_RAD]);
    }

    moveToTarget() {
      clearTimeout(this.debounceTimer);
      const target = this.readTarget();
      if (!target) {
        this.setStatus('请填写六个有效的目标数值。', 'error');
        return null;
      }
      this.targetObject.position.set(target.position.x, target.position.y, target.position.z);
      this.targetObject.rotation.set(target.orientation.roll, target.orientation.pitch, target.orientation.yaw, 'XYZ');
      const initialAngles = this.robot.jointAngles.map((degrees) => degrees * DEG_TO_RAD);
      const result = app.inverseKinematics(target, initialAngles, this.getJointLimits());
      const withinPracticalTolerance = result.positionError <= 0.025 && result.orientationError <= 5 * DEG_TO_RAD;
      const distance = result.positionError * 100;
      const angleError = result.orientationError * RAD_TO_DEG;
      const completionMessage = result.converged
        ? '已到达目标。'
        : withinPracticalTolerance
          ? '已到达目标容差范围。'
          : '目标不可完全到达，当前最佳近似解误差为 ' + distance.toFixed(1) + ' cm / ' + angleError.toFixed(1) + '°。';
      this.animationMessage = result.converged
        ? '已找到解，机械臂正在移动。'
        : withinPracticalTolerance
          ? '目标误差在容差内，机械臂正在移动。'
          : '目标不可完全到达，正在移动到当前最佳近似解（误差 ' + distance.toFixed(1) + ' cm / ' + angleError.toFixed(1) + '°）。';
      this.setStatus(result.converged ? '已找到逆运动学解，正在移动。' : this.animationMessage, result.converged || withinPracticalTolerance ? 'ready' : 'error');
      this.startAnimation(result.angles, completionMessage);
      return result;
    }

    startAnimation(targetAngles, completionMessage) {
      const from = this.robot.jointAngles.map((degrees) => degrees * DEG_TO_RAD);
      const maxDifference = Math.max(...from.map((angle, index) => Math.abs(targetAngles[index] - angle)));
      this.animation = {
        from,
        to: targetAngles.slice(),
        elapsed: 0,
        duration: Math.max(0.35, Math.min(1.6, maxDifference / 0.95)),
        completionMessage,
      };
    }

    cancelMotion() {
      clearTimeout(this.debounceTimer);
      this.animation = null;
      this.setStatus('自动移动已停止，可继续手动控制关节。', 'ready');
    }

    update(deltaSeconds) {
      if (!this.animation) return;
      const animation = this.animation;
      animation.elapsed = Math.min(animation.duration, animation.elapsed + deltaSeconds);
      const linear = animation.elapsed / animation.duration;
      const smooth = linear * linear * (3 - 2 * linear);
      const angles = animation.from.map((angle, index) => (angle + (animation.to[index] - angle) * smooth) * RAD_TO_DEG);
      this.jointController.setAngles(angles);
      if (linear >= 1) {
        this.animation = null;
        this.setStatus(animation.completionMessage, animation.completionMessage.startsWith('已到达') ? 'ready' : 'error');
      }
    }

    setStatus(message, state) {
      this.status.textContent = message;
      this.status.dataset.state = state;
    }

    dispose() {
      clearTimeout(this.debounceTimer);
      this.removeListeners.forEach((removeListener) => removeListener());
      this.transformControls.dispose();
      this.scene.remove(this.transformHelper);
      this.scene.remove(this.targetObject);
      this.targetObject.traverse((object) => {
        object.geometry?.dispose?.();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach((material) => material?.dispose?.());
      });
    }
  }

  app.TargetController = TargetController;
})(globalThis);
