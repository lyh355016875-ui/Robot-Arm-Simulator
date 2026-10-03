(function (global) {
  'use strict';
  global.RobotArmSimulator = global.RobotArmSimulator || {};
  const app = global.RobotArmSimulator;
  const MODES = {
    operation: { layout: 'control', visible: ['robotControl', 'robotStatus', 'taskManager', 'targetSettings'] },
    debug: { layout: 'debug', visible: ['robotControl', 'robotStatus', 'ikControl', 'sensors', 'taskManager', 'communications', 'dataMonitor'] },
    monitor: { layout: 'debug', visible: ['robotStatus', 'sensors', 'taskManager', 'dataMonitor'] },
    minimal: { layout: 'minimal', visible: ['robotStatus'] },
  };

  class Workspace {
    constructor(cardManager, { onModeChange = () => {} } = {}) {
      this.cardManager = cardManager;
      this.onModeChange = onModeChange;
      this.mode = 'operation';
    }

    setMode(mode) {
      const config = MODES[mode];
      if (!config) return false;
      this.mode = mode;
      this.cardManager.workspaceMode = mode;
      this.cardManager.layoutManager.apply(config.layout, { save: false });
      const visible = new Set(config.visible);
      for (const id of this.cardManager.cards.keys()) this.cardManager.setVisible(id, visible.has(id));
      this.onModeChange(mode);
      app.emitWorkspaceEvent?.('切换工作台模式：' + this.label(mode));
      this.cardManager.saveSoon();
      return true;
    }

    restoreMode(mode) {
      this.mode = MODES[mode] ? mode : 'operation';
      this.cardManager.workspaceMode = this.mode;
      this.onModeChange(this.mode);
      return true;
    }
    label(mode) { return ({ operation: '操作模式', debug: '调试模式', monitor: '监控模式', minimal: '极简模式' })[mode] || '操作模式'; }
  }

  app.Workspace = Workspace;
  app.WorkspaceModes = Object.keys(MODES);
})(window);
