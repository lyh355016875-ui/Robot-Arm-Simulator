(function (global) {
  'use strict';
  const root = typeof window !== 'undefined' ? window : globalThis;
  root.RobotArmSimulator = root.RobotArmSimulator || {};
  const app = root.RobotArmSimulator;
  const THREE = root.THREE;

  const JOINT_INERTIA = [18, 14, 9, 3.2, 2.2, 1.4];
  const LINK_MASS = [22, 18, 12];
  const PAYLOAD_MASS = { cube: 0.8, sphere: 0.55, workpiece: 1.1 };

  function formatNumber(value, digits = 6) {
    if (!Number.isFinite(value)) return '--';
    const rounded = Number(value.toFixed(digits));
    return Object.is(rounded, -0) ? '0' : String(rounded);
  }

  class RobotSensors {
    constructor({ scene, robot, workbench, taskController, rootElement = document }) {
      if (!scene || !robot || !workbench) throw new TypeError('传感器系统需要场景、机械臂和工作台。');
      this.scene = scene;
      this.robot = robot;
      this.workbench = workbench;
      this.taskController = taskController;
      this.panel = rootElement.getElementById('sensor-panel');
      this.cameraCanvas = rootElement.getElementById('robot-camera-view');
      this.cameraStatus = rootElement.getElementById('camera-sensor-status');
      this.robotStatus = rootElement.getElementById('robot-status-badge');
      this.distanceValue = rootElement.getElementById('distance-sensor-value');
      this.distanceState = rootElement.getElementById('distance-sensor-state');
      if (!this.panel || !this.cameraCanvas || !this.cameraStatus || !this.robotStatus || !this.distanceValue || !this.distanceState) {
        throw new Error('传感器面板缺少必要显示元素。');
      }

      this.jointReadouts = robot.joints.map((joint, index) => ({
        position: rootElement.getElementById('sensor-joint-' + (index + 1) + '-position'),
        velocity: rootElement.getElementById('sensor-joint-' + (index + 1) + '-velocity'),
        torque: rootElement.getElementById('sensor-joint-' + (index + 1) + '-torque'),
      }));
      this.forceReadouts = ['x', 'y', 'z'].map((axis) => rootElement.getElementById('sensor-force-' + axis));
      this.torqueReadouts = ['x', 'y', 'z'].map((axis) => rootElement.getElementById('sensor-torque-' + axis));
      if (this.jointReadouts.some((row) => Object.values(row).some((element) => !element))
        || this.forceReadouts.some((element) => !element) || this.torqueReadouts.some((element) => !element)) {
        throw new Error('传感器面板缺少关节或力矩读数。');
      }

      this.camera = new THREE.PerspectiveCamera(76, 16 / 9, 0.04, 12);
      this.camera.name = 'Tool Mounted Camera';
      this.camera.position.set(0.55, 0.28, 0);
      this.camera.rotation.set(0, -Math.PI / 2, -0.18);
      this.robot.endEffector.object3D.add(this.camera);

      this.cameraRenderer = null;
      this.cameraResizeObserver = null;
      this.distanceRaycaster = new THREE.Raycaster();
      this.distanceRaycaster.near = 0.025;
      this.distanceRaycaster.far = 2.5;
      this.sampleElapsed = 0;
      this.previousAngles = robot.jointAngles.slice();
      this.previousVelocities = robot.joints.map(() => 0);
      this.previousToolPosition = new THREE.Vector3();
      this.previousToolVelocity = new THREE.Vector3();
      this.scene.updateMatrixWorld(true);
      this.previousToolPosition.copy(this.getToolTipPosition());
      this.initCameraRenderer();
      this.refreshReadouts(0.05);
    }

    initCameraRenderer() {
      try {
        this.cameraRenderer = new THREE.WebGLRenderer({
          canvas: this.cameraCanvas,
          antialias: false,
          alpha: false,
          powerPreference: 'low-power',
        });
        this.cameraRenderer.setPixelRatio(Math.min(root.devicePixelRatio || 1, 1.5));
        this.cameraRenderer.outputColorSpace = THREE.SRGBColorSpace;
        this.cameraRenderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.cameraRenderer.toneMappingExposure = 1.12;
        this.cameraRenderer.setClearColor('#08111e', 1);
        this.cameraResizeObserver = new ResizeObserver(() => this.resizeCameraView());
        this.cameraResizeObserver.observe(this.cameraCanvas.parentElement);
        this.resizeCameraView();
        this.cameraStatus.textContent = 'ONLINE';
        this.cameraStatus.dataset.state = 'online';
      } catch (error) {
        this.cameraStatus.textContent = 'OFFLINE';
        this.cameraStatus.dataset.state = 'offline';
        this.cameraStatus.title = error?.message || '相机视图不可用';
      }
    }

    resizeCameraView() {
      if (!this.cameraRenderer) return;
      const { width, height } = this.cameraCanvas.getBoundingClientRect();
      if (!width || !height) return;
      this.cameraRenderer.setSize(width, height, false);
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
    }

    renderCamera() {
      if (!this.cameraRenderer || this.panel.dataset.collapsed === 'true' || this.panel.hidden || !this.panel.isConnected) return;
      const bounds = this.cameraCanvas.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;
      if (Math.abs(this.cameraCanvas.width / this.cameraRenderer.getPixelRatio() - bounds.width) > 1
        || Math.abs(this.cameraCanvas.height / this.cameraRenderer.getPixelRatio() - bounds.height) > 1) {
        this.resizeCameraView();
      }
      this.scene.updateMatrixWorld(true);
      this.cameraRenderer.render(this.scene, this.camera);
    }

    update(deltaSeconds) {
      const delta = Math.max(0.001, Math.min(Number(deltaSeconds) || 1 / 60, 0.1));
      this.sampleElapsed += delta;
      if (this.sampleElapsed >= 0.05) {
        const sampleDelta = this.sampleElapsed;
        this.sampleElapsed = 0;
        this.refreshReadouts(sampleDelta);
      }
      this.renderCamera();
    }

    refreshReadouts(deltaSeconds) {
      this.scene.updateMatrixWorld(true);
      const dt = Math.max(0.001, deltaSeconds);
      const angles = this.robot.jointAngles;
      const velocities = angles.map((angle, index) => (angle - this.previousAngles[index]) / dt);
      const accelerations = velocities.map((velocity, index) => (velocity - this.previousVelocities[index]) / dt);
      const jointTorques = this.estimateJointTorques(accelerations);

      this.jointReadouts.forEach((row, index) => {
        row.position.textContent = formatNumber(angles[index]);
        row.velocity.textContent = formatNumber(velocities[index]);
        row.torque.textContent = formatNumber(jointTorques[index], 3);
      });
      this.previousAngles = angles;
      this.previousVelocities = velocities;

      this.updateDistanceSensor();
      this.updateForceTorqueSensor(dt);
      this.updateRobotStatus();
    }

    estimateJointTorques(accelerationsDegrees) {
      const segments = this.robot.links.map((link, index) => {
        const centerOffset = link.direction === 'y'
          ? new THREE.Vector3(0, link.length / 2, 0)
          : new THREE.Vector3(link.length / 2, 0, 0);
        return {
          mass: LINK_MASS[index],
          lastJoint: index,
          position: link.object3D.localToWorld(centerOffset),
        };
      });
      const toolCenter = this.robot.endEffector.object3D.localToWorld(new THREE.Vector3(0.42, 0, 0));
      segments.push({ mass: 6, lastJoint: 5, position: toolCenter });
      for (const part of this.workbench.workpieces) {
        if (part.status !== 'held') continue;
        segments.push({
          mass: PAYLOAD_MASS[part.type] || 0.8,
          lastJoint: 5,
          position: part.object3D.getWorldPosition(new THREE.Vector3()),
        });
      }

      const gravity = new THREE.Vector3(0, -9.81, 0);
      return this.robot.joints.map((joint, jointIndex) => {
        const worldQuaternion = joint.object3D.getWorldQuaternion(new THREE.Quaternion());
        const localAxis = new THREE.Vector3(
          joint.rotationAxis === 'x' ? 1 : 0,
          joint.rotationAxis === 'y' ? 1 : 0,
          joint.rotationAxis === 'z' ? 1 : 0,
        );
        const axis = localAxis.applyQuaternion(worldQuaternion).normalize();
        const origin = joint.object3D.getWorldPosition(new THREE.Vector3());
        let gravityTorque = 0;
        for (const segment of segments) {
          if (segment.lastJoint < jointIndex) continue;
          const lever = segment.position.clone().sub(origin);
          const force = gravity.clone().multiplyScalar(segment.mass);
          gravityTorque += axis.dot(lever.cross(force));
        }
        const dynamicTorque = JOINT_INERTIA[jointIndex] * THREE.MathUtils.degToRad(accelerationsDegrees[jointIndex]);
        return gravityTorque + dynamicTorque;
      });
    }

    getToolTipPosition() {
      return this.robot.endEffector.object3D.localToWorld(this.robot.endEffector.toolTip.clone());
    }

    updateDistanceSensor() {
      const tool = this.robot.endEffector.object3D;
      const orientation = tool.getWorldQuaternion(new THREE.Quaternion());
      const origin = this.getToolTipPosition();
      const direction = new THREE.Vector3(1, 0, 0).applyQuaternion(orientation).normalize();
      this.distanceRaycaster.set(origin.add(direction.clone().multiplyScalar(0.03)), direction);
      const hit = this.distanceRaycaster.intersectObject(this.workbench.group, true)[0];
      if (!hit || hit.distance > this.distanceRaycaster.far) {
        this.distanceValue.textContent = '> 2.500 m';
        this.distanceState.textContent = '量程外';
        this.distanceState.dataset.state = 'clear';
        return;
      }
      this.distanceValue.textContent = formatNumber(hit.distance, 3) + ' m';
      let hitRoot = hit.object;
      while (hitRoot && !hitRoot.userData?.workpiece) hitRoot = hitRoot.parent;
      this.distanceState.textContent = hitRoot?.userData?.workpiece ? '检测到工件' : '检测到障碍物';
      this.distanceState.dataset.state = hit.distance < 0.2 ? 'near' : 'clear';
    }

    updateForceTorqueSensor(deltaSeconds) {
      const tool = this.robot.endEffector.object3D;
      const position = this.getToolTipPosition();
      const velocity = position.clone().sub(this.previousToolPosition).multiplyScalar(1 / deltaSeconds);
      const acceleration = velocity.clone().sub(this.previousToolVelocity).multiplyScalar(1 / deltaSeconds);
      acceleration.set(
        THREE.MathUtils.clamp(acceleration.x, -35, 35),
        THREE.MathUtils.clamp(acceleration.y, -35, 35),
        THREE.MathUtils.clamp(acceleration.z, -35, 35),
      );
      const heldPart = this.workbench.workpieces.find((part) => part.status === 'held');
      const mass = 6 + (heldPart ? PAYLOAD_MASS[heldPart.type] || 0.8 : 0);
      const worldForce = acceleration.sub(new THREE.Vector3(0, -9.81, 0)).multiplyScalar(mass);
      const orientation = tool.getWorldQuaternion(new THREE.Quaternion());
      const lever = new THREE.Vector3(0.38, 0, 0).applyQuaternion(orientation);
      const worldTorque = lever.cross(worldForce.clone());
      const worldToTool = orientation.clone().invert();
      const force = worldForce.applyQuaternion(worldToTool);
      const torque = worldTorque.applyQuaternion(worldToTool);

      this.forceReadouts.forEach((readout, index) => { readout.textContent = formatNumber(force.getComponent(index), 3); });
      this.torqueReadouts.forEach((readout, index) => { readout.textContent = formatNumber(torque.getComponent(index), 3); });
      this.previousToolPosition.copy(position);
      this.previousToolVelocity.copy(velocity);
    }

    updateRobotStatus() {
      const holding = this.workbench.workpieces.some((part) => part.status === 'held');
      const state = this.taskController?.running
        ? 'auto'
        : holding
          ? 'holding'
          : 'ready';
      const label = this.taskController?.running
        ? 'AUTO · ' + this.taskController.state
        : holding
          ? 'HOLDING'
          : 'READY';
      this.robotStatus.dataset.status = state;
      this.robotStatus.textContent = label;
    }

    dispose() {
      this.cameraResizeObserver?.disconnect();
      this.cameraRenderer?.dispose();
      this.robot.endEffector.object3D.remove(this.camera);
    }
  }

  app.RobotSensors = RobotSensors;
  app.formatSensorNumber = formatNumber;
})(globalThis);
