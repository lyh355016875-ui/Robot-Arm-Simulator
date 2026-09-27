(function (global) {
  'use strict';
  const root = typeof window !== 'undefined' ? window : globalThis;
  root.RobotArmSimulator = root.RobotArmSimulator || {};
  const app = root.RobotArmSimulator;

  const STATES = ['IDLE', 'SCAN', 'MOVE', 'GRAB', 'PLACE'];
  const DOWNWARD_TOOL_POSE = { roll: 0, pitch: 0, yaw: -Math.PI / 2 };

  class PickPlaceController {
    constructor({ robot, workbench, targetController, rootElement = document }) {
      if (!robot || !workbench || !targetController) throw new TypeError('自动抓取控制器缺少机械臂、工作台或目标控制器。');
      this.robot = robot;
      this.workbench = workbench;
      this.targetController = targetController;
      this.stateElement = rootElement.getElementById('task-state');
      this.logElement = rootElement.getElementById('task-log');
      this.startButton = rootElement.getElementById('start-pick-place');
      this.spawnButton = rootElement.getElementById('spawn-workpieces');
      this.stopButton = rootElement.getElementById('stop-pick-place');
      this.recoveryButton = rootElement.getElementById('release-held-part');
      if (!this.stateElement || !this.logElement || !this.startButton || !this.spawnButton || !this.stopButton || !this.recoveryButton) {
        throw new Error('自动抓取面板缺少状态、日志或任务按钮。');
      }

      this.state = 'IDLE';
      this.running = false;
      this.stateElapsed = 0;
      this.currentPart = null;
      this.stopAfterPlace = false;
      this.placePhase = 'move';
      this.runToken = 0;
      this.removeListeners = [];
      this.onStartClick = () => this.start();
      this.onSpawnClick = () => this.spawnWorkpieces();
      this.onStopClick = () => this.stop();
      this.onRecoveryClick = () => this.recoverHeldPart();
      this.startButton.addEventListener('click', this.onStartClick);
      this.spawnButton.addEventListener('click', this.onSpawnClick);
      this.stopButton.addEventListener('click', this.onStopClick);
      this.recoveryButton.addEventListener('click', this.onRecoveryClick);
      this.removeListeners.push(() => this.startButton.removeEventListener('click', this.onStartClick));
      this.removeListeners.push(() => this.spawnButton.removeEventListener('click', this.onSpawnClick));
      this.removeListeners.push(() => this.stopButton.removeEventListener('click', this.onStopClick));
      this.removeListeners.push(() => this.recoveryButton.removeEventListener('click', this.onRecoveryClick));
      this.setState('IDLE');
      this.writeLog('系统就绪，视觉相机已连接。');
      this.updateControls();
    }

    start() {
      if (this.running || this.state !== 'IDLE') return;
      if (this.workbench.getAvailableWorkpieces().length === 0) {
        this.writeLog('当前没有待抓取工件，请先生成工件。');
        return;
      }
      this.running = true;
      this.stopAfterPlace = false;
      this.runToken += 1;
      this.robot.endEffector.setGripperOpen(true);
      this.transition('SCAN', '开始扫描工作台。');
      this.updateControls();
    }

    stop() {
      if (!this.running) return;
      if (this.state === 'PLACE' && this.currentPart?.status === 'held') {
        this.stopAfterPlace = true;
        this.writeLog('已请求停止；机械臂完成当前放置后停止。');
        this.updateControls();
        return;
      }
      this.running = false;
      this.runToken += 1;
      this.targetController.cancelMotion();
      if (this.currentPart?.status === 'available') this.workbench.setHighlight(this.currentPart, false);
      this.currentPart = null;
      this.robot.endEffector.setGripperOpen(true);
      this.transition('IDLE', '自动抓取已停止。');
      this.updateControls();
    }

    spawnWorkpieces() {
      if (this.running) return;
      try {
        const count = this.workbench.spawnRandomWorkpieces(5);
        this.writeLog('随机生成 ' + count + ' 个工件：方块、球体或加工件。');
      } catch (error) {
        this.writeLog(error.message || '生成工件失败。');
      }
      this.updateControls();
    }

    recoverHeldPart() {
      if (this.state !== 'IDLE' || this.currentPart?.status !== 'held') return;
      try {
        this.robot.endEffector.setGripperOpen(true);
        this.workbench.place(this.currentPart);
        this.writeLog('已将夹爪中的工件安全放置到托盘。');
        this.currentPart = null;
        this.transition('IDLE', '工件已安全放置。');
      } catch (error) {
        this.writeLog('安全放置失败：' + (error.message || '未知错误'));
      }
    }

    transition(nextState, message) {
      if (!STATES.includes(nextState)) throw new RangeError('未知抓取状态：' + nextState);
      this.state = nextState;
      this.stateElapsed = 0;
      this.stateElement.textContent = nextState;
      this.stateElement.dataset.state = nextState.toLowerCase();
      if (message) this.writeLog('[' + nextState + '] ' + message);
      this.updateControls();
    }

    update(deltaSeconds) {
      if (!this.running) return;
      this.stateElapsed += deltaSeconds;

      if (this.state === 'SCAN' && this.stateElapsed >= 0.45) this.scanForWorkpiece();
      if (this.state === 'GRAB') this.updateGrasp(deltaSeconds);
      if (this.state === 'PLACE' && this.placePhase === 'release') this.updateRelease(deltaSeconds);
    }

    scanForWorkpiece() {
      let detection;
      try {
        detection = this.workbench.detectNextTarget();
      } catch (error) {
        this.running = false;
        this.transition('IDLE', '视觉扫描失败：' + (error?.message || '未知错误'));
        return;
      }
      if (!detection) {
        this.running = false;
        this.currentPart = null;
        const message = this.workbench.getAvailableWorkpieces().length === 0
          ? '本批工件处理完成。'
          : '相机视野中没有检测到可抓取工件。';
        this.transition('IDLE', message);
        return;
      }

      this.currentPart = detection.part;
      const position = detection.position;
      this.writeLog('视觉检测到' + this.currentPart.label + ' ' + this.currentPart.id
        + '，置信度 ' + (detection.confidence * 100).toFixed(1) + '%，坐标 '
        + position.x.toFixed(2) + ', ' + position.y.toFixed(2) + ', ' + position.z.toFixed(2) + ' m。');
      this.transition('MOVE', '计算抓取位姿并执行 IK。');
      this.moveToPick(detection, this.runToken);
    }

    moveToPick(detection, token) {
      const pickPose = { position: detection.position, orientation: DOWNWARD_TOOL_POSE };
      const approachPose = {
        position: { x: detection.position.x, y: detection.position.y + 0.3, z: detection.position.z },
        orientation: DOWNWARD_TOOL_POSE,
      };
      Promise.resolve().then(() => this.targetController.moveToPose(approachPose))
        .then((approachResult) => {
          if (!this.isCurrentRun(token)) return null;
          if (approachResult?.cancelled) {
            this.abortBeforeGrip(token, '手动控制中断了抓取移动。');
            return null;
          }
          if (!this.motionReachedTarget(approachResult)) return approachResult;
          return this.targetController.moveToPose(pickPose);
        })
        .then((result) => {
          if (!this.isCurrentRun(token) || !result) return;
          if (result.cancelled) {
            this.abortBeforeGrip(token, '手动控制中断了抓取移动。');
            return;
          }
          if (!this.motionReachedTarget(result)) {
            this.workbench.markFailed(this.currentPart);
            this.writeLog('抓取位姿无法到达，已跳过 ' + this.currentPart.id + '。');
            this.currentPart = null;
            this.transition('SCAN', '继续检测下一个工件。');
            return;
          }
          this.transition('GRAB', '机械臂已到达工件上方，夹爪准备闭合。');
        })
        .catch((error) => this.handleMotionError(error, token));
    }

    updateGrasp(deltaSeconds) {
      const duration = 0.48;
      const progress = Math.min(1, this.stateElapsed / duration);
      this.robot.endEffector.setGripperOpening(1 - progress);
      if (progress < 1) return;

      try {
        this.workbench.pick(this.currentPart, this.robot.endEffector);
        this.writeLog('夹爪闭合并抓取 ' + this.currentPart.id + '。');
        this.transition('PLACE', '规划放置位置。');
        this.moveToPlace(this.currentPart, this.runToken);
      } catch (error) {
        this.workbench.markFailed(this.currentPart);
        this.writeLog('抓取失败：' + (error.message || '未知错误'));
        this.currentPart = null;
        this.robot.endEffector.setGripperOpen(true);
        this.transition('SCAN', '继续检测。');
      }
    }

    moveToPlace(part, token) {
      this.placePhase = 'move';
      const pose = this.workbench.getPlacementPose(part);
      Promise.resolve().then(() => this.targetController.moveToPose(pose))
        .then((result) => {
          if (!this.isCurrentRun(token)) return;
          if (result?.cancelled) {
            this.finishWithHeldPart('手动控制中断了放置移动。');
            return;
          }
          if (!this.motionReachedTarget(result)) {
            this.writeLog('放置位姿不可达，继续尝试安全放置。');
            this.targetController.moveToPose({
              position: { x: 2.7, y: pose.position.y + 0.15, z: 0 },
              orientation: DOWNWARD_TOOL_POSE,
            }).then((fallback) => {
              if (!this.isCurrentRun(token)) return;
              if (fallback?.cancelled) {
                this.finishWithHeldPart('手动控制中断了安全放置移动。');
                return;
              }
              if (!this.motionReachedTarget(fallback)) {
                this.finishWithHeldPart('安全放置位姿不可达，任务已停止。');
                return;
              }
              this.beginRelease();
            }).catch((error) => this.handleMotionError(error, token));
            return;
          }
          this.beginRelease();
        })
        .catch((error) => this.handleMotionError(error, token));
    }

    beginRelease() {
      this.placePhase = 'release';
      this.stateElapsed = 0;
      this.gripperOpeningAtRelease = this.robot.endEffector.gripperOpening;
      this.writeLog('到达放置位，夹爪打开。');
    }

    updateRelease() {
      const duration = 0.38;
      const progress = Math.min(1, this.stateElapsed / duration);
      const opening = this.gripperOpeningAtRelease + (1 - this.gripperOpeningAtRelease) * progress;
      this.robot.endEffector.setGripperOpening(opening);
      if (progress < 1) return;

      try {
        this.workbench.place(this.currentPart, this.robot.endEffector);
        this.writeLog('已放置 ' + this.currentPart.id + '。');
        this.currentPart = null;
        if (this.stopAfterPlace) {
          this.running = false;
          this.transition('IDLE', '已完成当前放置，自动抓取停止。');
        } else {
          this.transition('SCAN', '继续扫描工作台。');
        }
      } catch (error) {
        this.finishWithHeldPart('放置失败：' + (error.message || '未知错误'));
      }
    }

    finishWithHeldPart(message) {
      this.running = false;
      this.runToken += 1;
      this.targetController.cancelMotion();
      this.writeLog(message + ' 夹爪中仍有工件，可选择安全放置。');
      this.transition('IDLE', '任务停止，工件仍由夹爪持有。');
    }

    abortBeforeGrip(token, message) {
      if (!this.isCurrentRun(token)) return;
      this.running = false;
      this.runToken += 1;
      if (this.currentPart?.status === 'available') this.workbench.setHighlight(this.currentPart, false);
      this.currentPart = null;
      this.robot.endEffector.setGripperOpen(true);
      this.writeLog(message);
      this.transition('IDLE', '自动抓取已停止。');
    }

    handleMotionError(error, token) {
      if (!this.isCurrentRun(token)) return;
      this.writeLog('运动规划失败：' + (error?.message || '目标位姿无效') + '。');
      if (this.currentPart?.status === 'held') {
        this.finishWithHeldPart('自动抓取已中止。');
        return;
      }
      this.running = false;
      this.runToken += 1;
      this.targetController.cancelMotion();
      if (this.currentPart?.status === 'available') this.workbench.setHighlight(this.currentPart, false);
      this.currentPart = null;
      this.transition('IDLE', '运动规划失败，任务已停止。');
    }

    motionReachedTarget(result) {
      const solution = result?.solution;
      return !result?.cancelled && solution
        && (solution.converged || (solution.positionError <= 0.025 && solution.orientationError <= 5 * Math.PI / 180));
    }

    isCurrentRun(token) {
      return this.running && token === this.runToken;
    }

    setState(state) {
      this.stateElement.textContent = state;
      this.stateElement.dataset.state = state.toLowerCase();
    }

    writeLog(message) {
      const item = this.logElement.ownerDocument.createElement('li');
      item.textContent = new Date().toLocaleTimeString('zh-CN', { hour12: false }) + '  ' + message;
      this.logElement.appendChild(item);
      while (this.logElement.children.length > 24) this.logElement.firstElementChild.remove();
      this.logElement.scrollTop = this.logElement.scrollHeight;
    }

    updateControls() {
      this.startButton.disabled = this.running || this.workbench.getAvailableWorkpieces().length === 0;
      this.spawnButton.disabled = this.running;
      this.stopButton.disabled = !this.running || this.stopAfterPlace;
      this.stopButton.textContent = this.stopAfterPlace ? '放置后停止' : '停止';
      this.recoveryButton.disabled = this.running || this.currentPart?.status !== 'held';
    }

    dispose() {
      this.running = false;
      this.runToken += 1;
      this.targetController.cancelMotion();
      this.removeListeners.forEach((removeListener) => removeListener());
    }
  }

  app.PickPlaceController = PickPlaceController;
  app.PickPlaceStates = STATES.slice();
})(globalThis);
