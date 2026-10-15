(function (global) {
  'use strict';
  const root = typeof window !== 'undefined' ? window : globalThis;
  root.RobotArmSimulator = root.RobotArmSimulator || {};
  const app = root.RobotArmSimulator;
  const THREE = root.THREE;
  const DEG_TO_RAD = Math.PI / 180;
  const RAD_TO_DEG = 180 / Math.PI;
  const MAX_TRAIL_POINTS = 600;

  function formatNumber(value, digits = 3) {
    const rounded = Number(value.toFixed(digits));
    return Object.is(rounded, -0) ? '0' : String(rounded);
  }

  class LearningController {
    constructor({ robot, scene, jointController, targetController = null, taskController = null, rootElement = document }) {
      if (!robot || !scene || !jointController) throw new TypeError('学习控制器缺少机械臂、场景或关节控制依赖。');
      this.robot = robot;
      this.scene = scene;
      this.jointController = jointController;
      this.targetController = targetController;
      this.taskController = taskController;
      this.root = rootElement;
      this.card = rootElement.querySelector('[data-card-id="learning"]');
      this.matrixScratch = new THREE.Matrix4();

      const byId = (id) => {
        const element = rootElement.getElementById(id);
        if (!element) throw new Error('学习卡片缺少元素：' + id);
        return element;
      };
      this.el = {
        tabFK: byId('learn-mode-fk'), tabIK: byId('learn-mode-ik'),
        fkBody: byId('learn-fk-body'), ikBody: byId('learn-ik-body'),
        fkSteps: byId('learn-fk-steps'), fkTitle: byId('learn-fk-step-title'),
        fkTransform: byId('learn-fk-transform'), fkMatrix: byId('learn-fk-matrix'), fkOrigin: byId('learn-fk-origin'),
        fkPrev: byId('learn-fk-prev'), fkNext: byId('learn-fk-next'), fkPlay: byId('learn-fk-play'),
        targetInputs: Object.fromEntries(['x', 'y', 'z', 'rx', 'ry', 'rz'].map((key) => [key, byId('learn-target-' + key)])),
        fromCurrent: byId('learn-from-current'), fromMarker: byId('learn-from-marker'),
        ikStart: byId('learn-ik-start'), ikStep: byId('learn-ik-step'), ikReset: byId('learn-ik-reset'),
        ikSolve: byId('learn-ik-solve'), ikSpeed: byId('learn-ik-speed'), ikStatus: byId('learn-ik-status'),
        ikChart: byId('learn-ik-chart'),
      };
      this.chart = this.el.ikChart.getContext('2d');

      this.mode = 'fk';
      this.fk = { stepIndex: 0, playing: false, timer: 0, lastAngles: null, group: null, axes: [], skeleton: null, stepItems: [], stepOps: [] };
      this.ik = { session: null, snapshot: null, playing: false, accumulator: 0, group: null, trailLine: null, trailCount: 0, targetMarker: null };
      this.removeListeners = [];
      this.bindEvents();
      this.buildStepList();
      this.setMode('fk');
      app.emitWorkspaceEvent?.('运动学学习卡片就绪');
    }

    bindEvents() {
      this.el.tabFK.addEventListener('click', () => this.setMode('fk'));
      this.el.tabIK.addEventListener('click', () => this.setMode('ik'));
      this.el.fkPrev.addEventListener('click', () => this.setStep(this.fk.stepIndex - 1));
      this.el.fkNext.addEventListener('click', () => this.setStep(this.fk.stepIndex + 1));
      this.el.fkPlay.addEventListener('click', () => this.toggleFKPlay());
      this.el.fromCurrent.addEventListener('click', () => this.fillTargetFromEndEffector());
      this.el.fromMarker.addEventListener('click', () => this.fillTargetFromMarker());
      this.el.ikStart.addEventListener('click', () => (this.ik.playing ? this.pauseIK('演示已暂停。') : this.startIK()));
      this.el.ikStep.addEventListener('click', () => this.singleStepIK());
      this.el.ikReset.addEventListener('click', () => this.resetIK());
      this.el.ikSolve.addEventListener('click', () => this.solveIK());
      this.el.ikSpeed.addEventListener('change', () => { this.ik.accumulator = 0; });
      this.removeListeners.push(() => {
        this.el.tabFK.removeEventListener('click', () => this.setMode('fk'));
        this.el.tabIK.removeEventListener('click', () => this.setMode('ik'));
      });
      this.onStepClick = (event) => {
        const item = event.target.closest('[data-step]');
        if (item) this.setStep(Number(item.dataset.step));
      };
      this.el.fkSteps.addEventListener('click', this.onStepClick);
    }

    setMode(mode) {
      this.mode = mode === 'ik' ? 'ik' : 'fk';
      this.el.tabFK.classList.toggle('is-active', this.mode === 'fk');
      this.el.tabIK.classList.toggle('is-active', this.mode === 'ik');
      this.el.fkBody.hidden = this.mode !== 'fk';
      this.el.ikBody.hidden = this.mode !== 'ik';
      if (this.mode === 'fk') this.enterFK();
      else { this.exitFK(); if (this.ik.playing) this.pauseIK('已切换到 IK 页签，迭代演示暂停。'); }
    }

    currentAnglesRad() {
      return this.robot.jointAngles.map((degrees) => degrees * DEG_TO_RAD);
    }

    getJointLimits() {
      return this.robot.joints.map((joint) => [joint.minAngle * DEG_TO_RAD, joint.maxAngle * DEG_TO_RAD]);
    }

    // --- FK tour -----------------------------------------------------------

    buildStepList() {
      const labels = [
        'T(0, 1.16, 0)', 'Ry', 'T(0, 1.1, 0)', 'Rz', 'T(1.65, 0, 0)', 'Rz', 'T(1.45, 0, 0)', 'Rx',
        'T(0.24, 0, 0)', 'Rz', 'T(0.24, 0, 0)', 'Rx', 'T(0.86, 0, 0)',
      ];
      this.el.fkSteps.innerHTML = '';
      this.fk.stepItems = [];
      this.fk.stepOps = [];
      labels.forEach((op, index) => {
        const item = document.createElement('li');
        item.dataset.step = String(index);
        const rotate = op.startsWith('R');
        item.innerHTML = '<span class="learn-step-no">' + String(index + 1).padStart(2, '0') + '</span>'
          + '<span class="learn-step-op"' + (rotate ? ' data-rotate="' + op + '"' : '') + '>' + op + '</span>'
          + '<span class="learn-step-frame">' + this.frameForStep(index) + '</span>';
        this.el.fkSteps.append(item);
        this.fk.stepItems.push(item);
        this.fk.stepOps.push(item.querySelector('.learn-step-op'));
      });
    }

    frameForStep(index) {
      const frames = ['J1', 'J1', 'J2', 'J2', 'J3', 'J3', 'J4', 'J4', 'J5', 'J5', 'J6', 'J6', 'Tool'];
      return frames[index];
    }

    enterFK() {
      if (this.fk.group) {
        this.scene.add(this.fk.group);
      } else {
        const group = new THREE.Group();
        group.name = 'Kinematics Learning FK';
        for (let index = 0; index < 13; index += 1) {
          const helper = new THREE.AxesHelper(index === 12 ? 0.4 : 0.32);
          helper.material.transparent = true;
          helper.material.opacity = 0.28;
          group.add(helper);
          this.fk.axes.push(helper);
        }
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(13 * 3), 3));
        this.fk.skeleton = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: '#61e6ee', transparent: true, opacity: 0.9 }));
        this.fk.skeleton.name = 'Kinematics Learning Skeleton';
        group.add(this.fk.skeleton);
        this.fk.group = group;
        this.scene.add(group);
      }
      this.fk.lastAngles = null;
      this.refreshFK();
    }

    exitFK() {
      this.fk.playing = false;
      this.updateFKPlayButton();
      if (this.fk.group) this.scene.remove(this.fk.group);
    }

    matrixFromRowMajor(matrix) {
      return this.matrixScratch.set(
        matrix[0], matrix[1], matrix[2], matrix[3],
        matrix[4], matrix[5], matrix[6], matrix[7],
        matrix[8], matrix[9], matrix[10], matrix[11],
        0, 0, 0, 1,
      );
    }

    refreshFK() {
      const angles = this.currentAnglesRad();
      const chain = app.fkChain(angles);
      const positions = this.fk.skeleton.geometry.attributes.position;

      chain.steps.forEach((step, index) => {
        const helper = this.fk.axes[index];
        helper.position.set(step.origin[0], step.origin[1], step.origin[2]);
        helper.quaternion.setFromRotationMatrix(this.matrixFromRowMajor(step.matrix));
        const isCurrent = index === this.fk.stepIndex;
        helper.scale.setScalar(isCurrent ? 1.5 : 1);
        helper.material.opacity = isCurrent ? 1 : 0.26;
        positions.setXYZ(index, step.origin[0], step.origin[1], step.origin[2]);
      });
      positions.needsUpdate = true;
      this.fk.skeleton.geometry.setDrawRange(0, this.fk.stepIndex + 1);

      this.fk.stepItems.forEach((item, index) => {
        item.classList.toggle('is-active', index === this.fk.stepIndex);
        const op = this.fk.stepOps[index];
        if (op.dataset.rotate) {
          op.textContent = op.dataset.rotate + '(' + formatNumber(angles[this.indexToJoint(index)] * RAD_TO_DEG, 1) + '°)';
        }
      });
      const activeItem = this.fk.stepItems[this.fk.stepIndex];
      if (activeItem) activeItem.scrollIntoView({ block: 'nearest' });
      this.updateFKDetail(chain);
      this.fk.lastAngles = angles;
    }

    indexToJoint(stepIndex) {
      const joints = [0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, null];
      return joints[stepIndex];
    }

    updateFKDetail(chain) {
      const step = chain.steps[this.fk.stepIndex];
      this.el.fkTitle.textContent = '第 ' + step.index + ' 步 · ' + step.label + '（坐标系 ' + step.frame + '）';
      if (step.type === 'rotate') {
        const angle = this.currentAnglesRad()[step.joint];
        this.el.fkTransform.textContent = 'Rot_' + step.axis + '(' + formatNumber(angle, 4) + ' rad = ' + formatNumber(angle * RAD_TO_DEG, 2) + '°)';
      } else {
        this.el.fkTransform.textContent = 'Trans(' + step.offset.map((value) => formatNumber(value, 2)).join(', ') + ')';
      }
      let cells = '';
      for (let row = 0; row < 4; row += 1) {
        for (let column = 0; column < 4; column += 1) {
          cells += '<span>' + formatNumber(step.matrix[row * 4 + column], 3) + '</span>';
        }
      }
      this.el.fkMatrix.innerHTML = cells;
      this.el.fkOrigin.textContent = '原点 (' + step.origin.map((value) => formatNumber(value, 3)).join(', ') + ') m';
    }

    setStep(index) {
      const clamped = Math.max(0, Math.min(12, index));
      this.fk.stepIndex = clamped;
      this.fk.timer = 0;
      this.refreshFK();
    }

    toggleFKPlay() {
      this.fk.playing = !this.fk.playing;
      this.fk.timer = 0;
      this.updateFKPlayButton();
      if (this.fk.playing && this.fk.stepIndex >= 12) this.setStep(0);
    }

    updateFKPlayButton() {
      this.el.fkPlay.textContent = this.fk.playing ? '暂停播放' : '自动播放';
      this.el.fkPlay.classList.toggle('is-active', this.fk.playing);
    }

    // --- IK demo -----------------------------------------------------------

    readTarget() {
      const inputs = this.el.targetInputs;
      if (Object.values(inputs).some((input) => input.value.trim() === '')) return null;
      const values = Object.fromEntries(Object.entries(inputs).map(([key, input]) => [key, Number(input.value)]));
      if (Object.values(values).some((value) => !Number.isFinite(value))) return null;
      return {
        position: { x: values.x, y: values.y, z: values.z },
        orientation: { roll: values.rx * DEG_TO_RAD, pitch: values.ry * DEG_TO_RAD, yaw: values.rz * DEG_TO_RAD },
      };
    }

    fillTargetFromEndEffector() {
      const pose = this.robot.getEndEffectorPose();
      this.writeTargetInputs(pose.position, pose.orientation);
    }

    fillTargetFromMarker() {
      if (!this.targetController?.targetObject) {
        this.setIKStatus('场景中没有目标球。', 'error');
        return;
      }
      const marker = this.targetController.targetObject;
      const angles = ['x', 'y', 'z'].map((axis) => marker.rotation[axis] * RAD_TO_DEG);
      this.writeTargetInputs(marker.position, { roll: angles[0], pitch: angles[1], yaw: angles[2] });
    }

    writeTargetInputs(position, orientation) {
      this.el.targetInputs.x.value = Number(position.x).toFixed(2);
      this.el.targetInputs.y.value = Number(position.y).toFixed(2);
      this.el.targetInputs.z.value = Number(position.z).toFixed(2);
      this.el.targetInputs.rx.value = Number(orientation.roll).toFixed(1);
      this.el.targetInputs.ry.value = Number(orientation.pitch).toFixed(1);
      this.el.targetInputs.rz.value = Number(orientation.yaw).toFixed(1);
    }

    startIK() {
      if (this.taskController?.running) {
        this.setIKStatus('自动抓取任务正在运行，请先停止任务。', 'error');
        return;
      }
      const target = this.readTarget();
      if (!target) {
        this.setIKStatus('请填写六个有效的目标数值。', 'error');
        return;
      }
      this.targetController?.cancelMotion();
      const snapshotRad = this.currentAnglesRad();
      this.ik.session = app.createIKSession(target, snapshotRad, this.getJointLimits());
      this.ik.snapshot = snapshotRad.slice();
      this.ik.playing = true;
      this.ik.accumulator = 0;
      this.buildIKSceneObjects(target);
      this.pushTrailPoint();
      this.updateIKControls();
      this.setIKStatus('迭代演示进行中，机械臂每次迭代移动一小步。', 'running');
      this.drawChart();
      app.emitWorkspaceEvent?.('开始 IK 迭代学习演示');
    }

    buildIKSceneObjects(target) {
      if (!this.ik.group) {
        const group = new THREE.Group();
        group.name = 'Kinematics Learning IK';
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(MAX_TRAIL_POINTS * 3), 3));
        this.ik.trailLine = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: '#e8c47a', transparent: true, opacity: 0.95 }));
        this.ik.trailLine.frustumCulled = false;
        group.add(this.ik.trailLine);
        this.ik.targetMarker = new THREE.Mesh(
          new THREE.SphereGeometry(0.1, 18, 14),
          new THREE.MeshBasicMaterial({ color: '#74f1f2', wireframe: true, transparent: true, opacity: 0.85 }),
        );
        group.add(this.ik.targetMarker);
        this.ik.group = group;
        this.scene.add(group);
      }
      this.ik.trailCount = 0;
      this.ik.targetMarker.position.set(target.position.x, target.position.y, target.position.z);
      this.ik.targetMarker.visible = true;
      this.ik.trailLine.geometry.setDrawRange(0, 0);
    }

    pushTrailPoint() {
      const pose = this.robot.getEndEffectorPose().position;
      if (this.ik.trailCount >= MAX_TRAIL_POINTS) return;
      this.ik.trailLine.geometry.attributes.position.setXYZ(this.ik.trailCount, pose.x, pose.y, pose.z);
      this.ik.trailCount += 1;
      this.ik.trailLine.geometry.setDrawRange(0, this.ik.trailCount);
      this.ik.trailLine.geometry.attributes.position.needsUpdate = true;
    }

    applySessionAngles() {
      this.jointController.setAngles(this.ik.session.state.angles.map((angle) => angle * RAD_TO_DEG));
    }

    singleStepIK() {
      if (!this.ik.session) {
        this.startIK();
        this.ik.playing = false;
        this.updateIKControls();
        return;
      }
      if (this.ik.playing) this.pauseIK('演示已暂停。');
      this.advanceOneIteration();
    }

    advanceOneIteration() {
      const advanced = this.ik.session.step();
      if (!advanced) {
        this.finishIKPlayback();
        return;
      }
      this.applySessionAngles();
      this.pushTrailPoint();
      this.updateIKStatusLine();
      this.drawChart();
      if (this.ik.session.state.converged) this.finishIKPlayback();
    }

    finishIKPlayback() {
      this.ik.playing = false;
      this.updateIKControls();
      const state = this.ik.session.state;
      const distance = (state.positionError * 100).toFixed(1);
      const angle = (state.orientationError * RAD_TO_DEG).toFixed(1);
      if (state.converged) {
        this.setIKStatus('已收敛：位置误差 ' + distance + ' cm，姿态误差 ' + angle + '°，共 ' + state.iterations + ' 次迭代。', 'converged');
        app.emitWorkspaceEvent?.('IK 学习演示收敛：' + state.iterations + ' 次迭代');
      } else if (state.stalled) {
        this.setIKStatus('迭代停滞：已到当前最佳近似解，误差 ' + distance + ' cm / ' + angle + '°。', 'stalled');
      } else {
        this.setIKStatus('达到最大迭代次数 ' + state.iterations + '，当前误差 ' + distance + ' cm / ' + angle + '°。', 'stalled');
      }
    }

    pauseIK(message) {
      this.ik.playing = false;
      this.updateIKControls();
      this.setIKStatus(message, 'running');
    }

    solveIK() {
      if (!this.ik.session) this.startIK();
      if (!this.ik.session) return;
      this.ik.playing = false;
      let guard = 0;
      while (this.ik.session.step() && guard < 400) guard += 1;
      this.applySessionAngles();
      this.pushTrailPoint();
      this.finishIKPlayback();
      this.drawChart();
    }

    resetIK() {
      this.ik.playing = false;
      if (this.ik.snapshot) {
        this.jointController.setAngles(this.ik.snapshot.map((angle) => angle * RAD_TO_DEG));
      }
      this.ik.session = null;
      this.ik.snapshot = null;
      if (this.ik.group) {
        this.ik.trailLine.geometry.setDrawRange(0, 0);
        this.ik.targetMarker.visible = false;
      }
      this.updateIKControls();
      this.setIKStatus('已恢复演示前的关节角，可重新开始。', 'idle');
      this.drawChart();
    }

    updateIKControls() {
      this.el.ikStart.textContent = this.ik.playing ? '暂停' : this.ik.session ? '继续' : '开始迭代';
      this.el.ikStep.disabled = this.ik.session && this.ik.session.state.converged;
      this.el.ikSolve.disabled = this.ik.session && this.ik.session.state.converged;
    }

    updateIKStatusLine() {
      const state = this.ik.session.state;
      const last = state.history[state.history.length - 1];
      const damping = last ? 'λ=' + last.damping : '';
      this.setIKStatus('迭代 ' + state.iterations + ' / ' + this.ik.session.params.maxIterations
        + ' · 位置误差 ' + (state.positionError * 100).toFixed(2) + ' cm'
        + ' · 姿态误差 ' + (state.orientationError * RAD_TO_DEG).toFixed(2) + '° · ' + damping, 'running');
    }

    setIKStatus(message, state) {
      this.el.ikStatus.textContent = message;
      this.el.ikStatus.dataset.state = state;
    }

    drawChart() {
      const canvas = this.el.ikChart;
      const context = this.chart;
      const width = canvas.width;
      const height = canvas.height;
      const left = 30, right = 10, top = 16, bottom = 16;
      const plotWidth = width - left - right;
      const plotHeight = height - top - bottom;
      context.clearRect(0, 0, width, height);
      context.strokeStyle = 'rgba(153,176,204,.16)';
      context.lineWidth = 1;
      for (let line = 0; line <= 4; line += 1) {
        const y = top + (plotHeight * line) / 4;
        context.beginPath();
        context.moveTo(left, y);
        context.lineTo(width - right, y);
        context.stroke();
      }
      context.fillStyle = '#698197';
      context.font = '600 8px "SFMono-Regular", Consolas, monospace';
      context.fillText('cm', 4, top + 8);
      context.fillStyle = 'rgba(232,196,122,.8)';
      context.fillText('°', 4, top + 20);

      const history = this.ik.session ? this.ik.session.state.history : [];
      if (history.length < 2) {
        context.fillStyle = '#71849a';
        context.fillText('开始迭代后显示收敛曲线', left + 20, top + plotHeight / 2);
        return;
      }
      const positionSeries = history.map((entry) => entry.positionError * 100);
      const orientationSeries = history.map((entry) => entry.orientationError * RAD_TO_DEG);
      const maxPosition = Math.max(0.1, ...positionSeries);
      const maxOrientation = Math.max(0.1, ...orientationSeries);
      const drawSeries = (series, maxValue, color) => {
        context.strokeStyle = color;
        context.lineWidth = 1.6;
        context.beginPath();
        series.forEach((value, index) => {
          const x = left + (plotWidth * index) / (series.length - 1);
          const y = top + plotHeight * (1 - Math.min(1, value / maxValue));
          if (index === 0) context.moveTo(x, y);
          else context.lineTo(x, y);
        });
        context.stroke();
      };
      drawSeries(positionSeries, maxPosition, '#54d1df');
      drawSeries(orientationSeries, maxOrientation, '#e8c47a');
      context.fillStyle = '#54d1df';
      context.fillText(maxPosition.toFixed(1), 4, top + 2);
      context.fillStyle = '#71849a';
      context.fillText(history.length + ' 次', width - right - 34, height - 4);
    }

    // --- frame loop --------------------------------------------------------

    update(deltaSeconds) {
      if (this.card && this.card.offsetParent === null) return;
      const delta = Math.max(0, deltaSeconds || 0);
      if (this.mode === 'fk') {
        const angles = this.currentAnglesRad();
        const changed = !this.fk.lastAngles || angles.some((angle, index) => Math.abs(angle - this.fk.lastAngles[index]) > 1e-9);
        if (changed) this.refreshFK();
        if (this.fk.playing) {
          this.fk.timer += delta;
          if (this.fk.timer >= 1.1) {
            this.fk.timer = 0;
            if (this.fk.stepIndex >= 12) {
              this.fk.playing = false;
              this.updateFKPlayButton();
            } else this.setStep(this.fk.stepIndex + 1);
          }
        }
        return;
      }
      if (this.mode === 'ik' && this.ik.playing && this.ik.session) {
        const sessionAngles = this.ik.session.state.angles;
        const current = this.robot.jointAngles;
        const interfered = sessionAngles.some((angle, index) => Math.abs(angle * RAD_TO_DEG - current[index]) > 0.05);
        if (interfered) {
          this.pauseIK('检测到手动关节操作，迭代演示已暂停。');
          return;
        }
        const speed = Number(this.el.ikSpeed.value) || 4;
        this.ik.accumulator += delta * speed;
        let steps = 0;
        while (this.ik.accumulator >= 1 && this.ik.playing && steps < 32) {
          this.ik.accumulator -= 1;
          this.advanceOneIteration();
          steps += 1;
        }
      }
    }

    dispose() {
      this.exitFK();
      this.ik.playing = false;
      this.ik.session = null;
      this.ik.snapshot = null;
      if (this.ik.group) {
        this.scene.remove(this.ik.group);
        this.ik.trailLine.geometry.dispose();
        this.ik.trailLine.material.dispose();
        this.ik.targetMarker.geometry.dispose();
        this.ik.targetMarker.material.dispose();
        this.ik.group = null;
      }
      if (this.fk.group) {
        this.fk.axes.forEach((helper) => { helper.geometry.dispose(); helper.material.dispose(); });
        this.fk.skeleton.geometry.dispose();
        this.fk.skeleton.material.dispose();
        this.fk.group = null;
        this.fk.axes = [];
        this.fk.skeleton = null;
      }
      this.removeListeners.forEach((removeListener) => removeListener());
    }
  }

  app.LearningController = LearningController;
})(globalThis);
