(function (global) {
  'use strict';
  global.RobotArmSimulator = global.RobotArmSimulator || {};
  const app = global.RobotArmSimulator;

  class MenuBar {
    constructor(nav, manager) {
      this.nav = nav;
      this.manager = manager;
      this.cardManager = manager.cardManager;
      this.groups = new Map();
      this.cardManager.onVisibilityChange = () => this.syncCardChecks();
      this.build();
      document.addEventListener('pointerdown', (event) => { if (!this.nav.contains(event.target)) this.closeAll(); });
      document.addEventListener('keydown', (event) => { if (event.key === 'Escape') this.closeAll(); });
      this.syncCardChecks();
    }

    build() {
      this.addGroup('file', '文件', (menu) => {
        this.addAction(menu, '保存当前布局', () => this.cardManager.layoutManager.save());
        this.addAction(menu, '加载保存的布局', () => this.manager.loadLayout());
      });
      this.addGroup('view', '视图', (menu) => {
        this.addSection(menu, '工作台模式');
        for (const [mode, label] of [['operation', '操作模式'], ['debug', '调试模式'], ['monitor', '监控模式'], ['minimal', '极简模式']]) {
          this.addAction(menu, label, () => this.manager.workspace.setMode(mode));
        }
        this.addSection(menu, '快捷显示');
        this.addAction(menu, '显示全部卡片', () => this.cardManager.showAll());
        this.addAction(menu, '隐藏全部卡片', () => this.cardManager.hideAll());
      });
      this.addGroup('workspace', '工作台', (menu) => {
        this.addAction(menu, '显示全部卡片', () => this.cardManager.showAll());
        this.addAction(menu, '隐藏全部卡片', () => this.cardManager.hideAll());
        this.addAction(menu, '恢复默认布局', () => this.restoreDefault());
        this.addAction(menu, '保存当前布局', () => this.cardManager.layoutManager.save());
        this.addAction(menu, '加载布局', () => this.manager.loadLayout());
        this.addSection(menu, '布局');
        for (const [layout, label] of [['default', 'Default Layout'], ['control', 'Control Layout'], ['debug', 'Debug Layout'], ['minimal', 'Minimal Layout']]) {
          this.addAction(menu, label, () => this.cardManager.layoutManager.apply(layout));
        }
        this.addSection(menu, '卡片列表');
        const list = document.createElement('div'); list.className = 'menu-card-list';
        for (const [id, title] of app.WorkspaceCardDefinitions) {
          const label = document.createElement('label');
          label.className = 'menu-check-row';
          const input = document.createElement('input'); input.type = 'checkbox'; input.dataset.cardToggle = id;
          input.addEventListener('change', () => { this.cardManager.setVisible(id, input.checked); this.syncCardChecks(); });
          label.append(input, document.createTextNode(title)); list.append(label);
        }
        menu.append(list);
      });
      this.addGroup('robot', '机器人', (menu) => {
        this.addAction(menu, '机器人控制', () => this.cardManager.toggleVisible('robotControl'));
        this.addAction(menu, '机器人状态', () => this.cardManager.toggleVisible('robotStatus'));
        this.addAction(menu, 'IK 控制', () => this.cardManager.toggleVisible('ikControl'));
        this.addAction(menu, '传感器监视', () => this.cardManager.toggleVisible('sensors'));
        this.addAction(menu, '任务管理器', () => this.cardManager.toggleVisible('taskManager'));
      });
      this.addGroup('scene', '场景', (menu) => {
        this.addSelect(menu, '工作台模式', 'menu-bench-mode', [['basic', '基础工作台'], ['industrial', '工业工作台'], ['lab', '实验工作台'], ['blank', '空白工作台']], this.cardManager.benchMode,
          (value) => this.manager.applyBenchMode(value));
        this.addSelect(menu, '目标物模式', 'menu-target-mode', [['none', '无目标物'], ['single', '单目标'], ['multiple', '多目标'], ['random', '随机目标'], ['grabTask', '抓取任务']], this.cardManager.targetMode,
          (value) => this.manager.applyTargetMode(value));
        this.addAction(menu, '目标物设置…', () => this.cardManager.setVisible('targetSettings', true));
        this.addAction(menu, '工作台设置…', () => this.cardManager.setVisible('workbenchSettings', true));
      });
      this.addGroup('tools', '工具', (menu) => {
        this.addAction(menu, '通信监视器', () => this.cardManager.toggleVisible('communications'));
        this.addAction(menu, '数据监视器', () => this.cardManager.toggleVisible('dataMonitor'));
        this.addAction(menu, '工作台设置', () => this.cardManager.toggleVisible('workbenchSettings'));
      });
      this.addGroup('settings', '设置', (menu) => {
        this.addAction(menu, '打开工作台管理卡片', () => this.cardManager.setVisible('workspaceSettings', true));
        this.addAction(menu, '打开工作台设置卡片', () => this.cardManager.setVisible('workbenchSettings', true));
        this.addAction(menu, '打开目标物设置卡片', () => this.cardManager.setVisible('targetSettings', true));
      });
    }

    addGroup(id, title, buildMenu) {
      const group = document.createElement('div'); group.className = 'menu-group'; group.dataset.menuGroup = id;
      const trigger = document.createElement('button'); trigger.type = 'button'; trigger.className = 'menu-trigger'; trigger.textContent = title;
      trigger.setAttribute('aria-haspopup', 'true'); trigger.setAttribute('aria-expanded', 'false');
      const menu = document.createElement('div'); menu.className = 'menu-popover'; menu.hidden = true; menu.setAttribute('role', 'menu');
      trigger.addEventListener('click', () => {
        const shouldOpen = menu.hidden; this.closeAll(); menu.hidden = !shouldOpen; trigger.setAttribute('aria-expanded', String(shouldOpen));
        if (shouldOpen) this.syncCardChecks();
      });
      buildMenu(menu); group.append(trigger, menu); this.nav.append(group); this.groups.set(id, { group, trigger, menu });
    }

    addAction(menu, title, action) {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'menu-item'; button.textContent = title;
      button.setAttribute('role', 'menuitem'); button.addEventListener('click', () => { action(); this.closeAll(); this.syncCardChecks(); }); menu.append(button); return button;
    }

    addSection(menu, title) { const heading = document.createElement('div'); heading.className = 'menu-section-title'; heading.textContent = title; menu.append(heading); }

    addSelect(menu, labelText, id, options, value, onChange) {
      const row = document.createElement('label'); row.className = 'menu-select-row'; row.textContent = labelText;
      const select = document.createElement('select'); select.id = id;
      for (const [optionValue, label] of options) { const option = document.createElement('option'); option.value = optionValue; option.textContent = label; select.append(option); }
      select.value = value; select.addEventListener('change', () => { onChange(select.value); this.syncSceneSelects(); });
      row.append(select); menu.append(row);
    }

    restoreDefault() {
      const sceneBusy = this.manager.taskController?.running
        || this.manager.workbench.workpieces.some((part) => part.status === 'held');
      if (!sceneBusy) this.manager.applySceneModes('industrial', 'none', { quiet: true });
      else this.cardManager.showNotice('抓取任务正在运行，已保留当前场景。');
      this.cardManager.layoutManager.restoreDefault();
      if (sceneBusy) {
        this.cardManager.benchMode = this.manager.workbench.benchMode;
        this.cardManager.targetMode = this.manager.workbench.targetMode;
      }
      this.manager.workspace.restoreMode('operation');
      this.syncSceneSelects();
      this.manager.syncWorkspaceSettings();
      this.syncSceneSelects();
      this.cardManager.saveSoon();
    }

    syncCardChecks() {
      for (const input of this.nav.querySelectorAll('[data-card-toggle]')) {
        const card = this.cardManager.cards.get(input.dataset.cardToggle);
        input.checked = Boolean(card && !card.element.hidden);
      }
      this.manager.syncWorkspaceSettings?.();
    }

    syncLayout(name) { this.nav.dataset.layout = name; }
    syncSceneSelects() {
      const bench = this.nav.querySelector('#menu-bench-mode'), target = this.nav.querySelector('#menu-target-mode');
      if (bench) bench.value = this.cardManager.benchMode;
      if (target) target.value = this.cardManager.targetMode;
    }

    closeAll() { for (const { menu, trigger } of this.groups.values()) { menu.hidden = true; trigger.setAttribute('aria-expanded', 'false'); } }
  }
  app.MenuBar = MenuBar;
})(window);
