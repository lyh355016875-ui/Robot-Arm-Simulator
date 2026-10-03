(function (global) {
  'use strict';
  global.RobotArmSimulator = global.RobotArmSimulator || {};
  const app = global.RobotArmSimulator;
  const STORAGE_KEY = 'robot-arm-simulator.workspace.v09';
  const SAVED_STORAGE_KEY = STORAGE_KEY + '.saved';

  class LayoutManager {
    constructor(cardManager) { this.cardManager = cardManager; this.activeLayout = 'default'; this.onChange = () => {}; }

    getPreset(name) {
      const width = this.cardManager.layer.clientWidth || 1200;
      const height = this.cardManager.layer.clientHeight || 800;
      const right = (cardWidth) => Math.max(16, width - cardWidth - 20);
      const presets = {
        default: {
          robotControl: [20, 130, 270, 470, true], robotStatus: [right(280), 105, 280, 205, true],
          ikControl: [right(300), 242, 300, 330, false], sensors: [right(420), 24, 420, 600, false],
          taskManager: [310, 130, 320, 255, false], targetSettings: [right(290), 240, 290, 390, false],
          workbenchSettings: [right(280), 24, 280, 310, false], workspaceSettings: [right(290), 360, 290, 360, false], communications: [right(290), 24, 290, 260, false],
          dataMonitor: [right(290), 298, 290, 245, false],
        },
        control: {
          robotControl: [20, 100, 270, 470, true], robotStatus: [right(280), 24, 280, 205, true],
          ikControl: [20, Math.min(582, height - 345), 300, 330, true], sensors: [right(420), 24, 420, 600, false],
          taskManager: [310, 100, 320, 255, true], targetSettings: [right(290), 242, 290, 390, true],
          workbenchSettings: [right(280), 24, 280, 310, false], workspaceSettings: [right(290), 360, 290, 360, false], communications: [right(290), 24, 290, 260, false],
          dataMonitor: [right(290), 298, 290, 245, false],
        },
        debug: {
          robotControl: [20, 120, 270, 470, true], robotStatus: [20, 24, 280, 205, true],
          ikControl: [right(300), 306, 300, 330, true], sensors: [right(420), 24, 420, 600, true],
          taskManager: [310, 120, 320, 255, true], targetSettings: [right(290), 644, 290, 390, false],
          workbenchSettings: [right(280), 24, 280, 310, false], workspaceSettings: [right(290), 644, 290, 360, false], communications: [310, 390, 290, 260, true],
          dataMonitor: [310, 660, 290, 245, true],
        },
        minimal: {
          robotControl: [20, 130, 270, 470, false], robotStatus: [20, 24, 270, 180, true],
          ikControl: [right(300), 24, 300, 330, false], sensors: [right(420), 24, 420, 600, false],
          taskManager: [310, 130, 320, 255, false], targetSettings: [right(290), 24, 290, 390, false],
          workbenchSettings: [right(280), 24, 280, 310, false], workspaceSettings: [right(290), 360, 290, 360, false], communications: [right(290), 24, 290, 260, false],
          dataMonitor: [310, 130, 290, 245, false],
        },
      };
      return presets[name] || presets.default;
    }

    apply(name, { save = true } = {}) {
      const preset = this.getPreset(name);
      this.activeLayout = name;
      for (const [id, value] of Object.entries(preset)) {
        const [x, y, width, height, visible] = value;
        this.cardManager.applyCardState(id, { x, y, width, height, visible, collapsed: false });
      }
      this.onChange(name);
      if (save) this.cardManager.saveSoon();
    }

    capture() {
      const cards = {};
      for (const id of this.cardManager.cards.keys()) cards[id] = this.cardManager.getCardState(id);
      return { version: 1, activeLayout: this.activeLayout, workspaceMode: this.cardManager.workspaceMode || 'operation',
        benchMode: this.cardManager.benchMode || 'industrial', targetMode: this.cardManager.targetMode || 'none', cards };
    }

    save() {
      try {
        const snapshot = JSON.stringify(this.capture());
        localStorage.setItem(SAVED_STORAGE_KEY, snapshot);
        localStorage.setItem(STORAGE_KEY, snapshot);
        this.cardManager.showNotice('当前工作台布局已保存。');
        app.emitWorkspaceEvent?.('工作台布局已保存');
        return true;
      } catch (_) { this.cardManager.showNotice('布局保存失败：浏览器存储不可用。'); return false; }
    }

    load() {
      try {
        const raw = localStorage.getItem(SAVED_STORAGE_KEY) || localStorage.getItem(STORAGE_KEY);
        if (!raw) {
          this.cardManager.workspaceMode = 'operation';
          this.cardManager.benchMode = 'industrial';
          this.cardManager.targetMode = 'none';
          this.apply('default', { save: false });
          this.cardManager.showNotice('没有已保存的布局，已载入默认布局。');
          return false;
        }
        this.restoreSnapshot(raw);
        this.cardManager.saveSoon();
        return true;
      } catch (_) {
        this.cardManager.workspaceMode = 'operation';
        this.cardManager.benchMode = 'industrial';
        this.cardManager.targetMode = 'none';
        this.apply('default', { save: false });
        this.cardManager.showNotice('已保存布局不可用，已载入默认布局。');
        return false;
      }
    }

    loadCurrent() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return false;
        this.restoreSnapshot(raw);
        return true;
      } catch (_) {
        this.cardManager.workspaceMode = 'operation';
        this.cardManager.benchMode = 'industrial';
        this.cardManager.targetMode = 'none';
        this.apply('default', { save: false });
        this.cardManager.showNotice('已保存布局不可用，已载入默认布局。');
        return false;
      }
    }

    restoreSnapshot(raw) {
      const saved = JSON.parse(raw);
      if (!saved || saved.version !== 1 || !saved.cards || typeof saved.cards !== 'object') throw new Error('格式不兼容');
      this.activeLayout = typeof saved.activeLayout === 'string' ? saved.activeLayout : 'default';
      for (const [id, state] of Object.entries(saved.cards)) if (this.cardManager.cards.has(id) && state && typeof state === 'object') this.cardManager.applyCardState(id, state);
      this.cardManager.workspaceMode = ['operation', 'debug', 'monitor', 'minimal'].includes(saved.workspaceMode) ? saved.workspaceMode : 'operation';
      this.cardManager.benchMode = ['basic', 'industrial', 'lab', 'blank'].includes(saved.benchMode) ? saved.benchMode : 'industrial';
      this.cardManager.targetMode = ['none', 'single', 'multiple', 'random', 'grabTask'].includes(saved.targetMode) ? saved.targetMode : 'none';
      this.onChange(this.activeLayout, saved);
      return saved;
    }

    restoreDefault() {
      this.activeLayout = 'default';
      this.cardManager.workspaceMode = 'operation';
      this.cardManager.benchMode = 'industrial';
      this.cardManager.targetMode = 'none';
      this.apply('default', { save: false });
      this.cardManager.showNotice('已恢复默认工作台布局。');
      app.emitWorkspaceEvent?.('已恢复默认工作台布局');
    }
  }
  app.LayoutManager = LayoutManager;
})(window);
