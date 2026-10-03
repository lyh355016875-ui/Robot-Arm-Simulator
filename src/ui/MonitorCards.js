(function (global) {
  'use strict';
  global.RobotArmSimulator = global.RobotArmSimulator || {};
  const app = global.RobotArmSimulator;

  class MonitorCards {
    constructor({ robot, workbench, taskController }) {
      this.robot = robot; this.workbench = workbench; this.taskController = taskController;
      this.eventLog = document.getElementById('workspace-event-log');
      this.joints = document.getElementById('data-joints');
      this.pose = document.getElementById('data-pose');
      this.taskState = document.getElementById('data-task-state');
      this.workpieceCount = document.getElementById('data-workpieces');
      this.elapsed = 0;
      app.emitWorkspaceEvent = (message) => this.record(message);
      this.record('模拟器已就绪；事件记录保留最近 24 条。');
    }

    record(message) {
      if (!this.eventLog) return;
      const item = document.createElement('li');
      item.textContent = new Date().toLocaleTimeString('zh-CN', { hour12: false }) + '  ' + message;
      this.eventLog.prepend(item);
      while (this.eventLog.children.length > 24) this.eventLog.lastElementChild.remove();
    }

    update(deltaSeconds) {
      this.elapsed += Math.max(0, deltaSeconds || 0);
      if (this.elapsed < 0.25) return;
      this.elapsed = 0;
      const angles = this.robot.jointAngles.map((value) => Number(value.toFixed(1)) + '°').join(' · ');
      const position = this.robot.getEndEffectorPose().position;
      this.joints.textContent = angles;
      this.pose.textContent = [position.x, position.y, position.z].map((value) => value.toFixed(2)).join(', ') + ' m';
      this.taskState.textContent = this.taskController.state;
      this.workpieceCount.textContent = String(this.workbench.getAvailableWorkpieces().length);
    }
  }
  app.MonitorCards = MonitorCards;
})(window);
