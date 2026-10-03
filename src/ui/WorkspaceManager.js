(function (global) {
  'use strict';
  global.RobotArmSimulator = global.RobotArmSimulator || {};
  const app = global.RobotArmSimulator;
  const CARD_DEFS = [
    ['robotControl', '机器人控制'], ['robotStatus', '机器人状态'], ['ikControl', 'IK 控制'],
    ['sensors', '传感器监视'], ['taskManager', '任务管理器'], ['targetSettings', '目标物设置'],
    ['workbenchSettings', '工作台设置'], ['workspaceSettings', '工作台管理'],
    ['communications', '通信监视器'], ['dataMonitor', '数据监视器'],
  ];

  class WorkspaceManager {
    constructor({ layer, workbench, scene }) {
      this.layer = layer;
      this.workbench = workbench;
      this.scene = scene;
      this.cardManager = new app.CardManager(layer);
      this.makeTaskCard();
      this.makeSettingsCards();
      this.makeMonitorCards();
      this.makeWorkspaceSettingsCard();
      this.cardManager.clampAll();
      this.workspace = new app.Workspace(this.cardManager);
      this.menuBar = new app.MenuBar(document.getElementById('workspace-menu-bar'), this);
      this.workspace.onModeChange = () => this.menuBar?.syncCardChecks();
      this.cardManager.layoutManager.onChange = (name) => this.menuBar?.syncLayout(name);
      this.bindSettings();
      if (!this.cardManager.layoutManager.loadCurrent()) {
        this.cardManager.layoutManager.restoreDefault();
      }
      this.workspace.restoreMode(this.cardManager.workspaceMode);
      this.applySceneModes(this.cardManager.benchMode, this.cardManager.targetMode, { quiet: true });
      this.syncCardChecks();
      this.menuBar.syncSceneSelects();
      app.emitWorkspaceEvent?.('V0.9 工作台就绪');
    }

    makeTaskCard() {
      const card = this.createCard('taskManager', '任务管理器', 'PICK & PLACE', '自动抓取');
      card.open = true;
      card.innerHTML += '<div class="task-control-body"><div class="task-buttons">'
        + '<button id="spawn-workpieces" type="button">随机生成</button>'
        + '<button id="start-pick-place" class="task-start-button" type="button">开始抓取</button>'
        + '<button id="stop-pick-place" class="task-stop-button" type="button" disabled>停止</button></div>'
        + '<button id="release-held-part" class="task-recovery-button" type="button" disabled>安全放置夹爪中的工件</button>'
        + '<div class="task-log-heading"><span>任务日志</span><span>视觉 · 运动 · 夹爪</span></div>'
        + '<ol id="task-log" class="task-log" aria-live="polite" aria-relevant="additions"></ol></div>';
      const taskState = document.createElement('span');
      taskState.id = 'task-state';
      taskState.className = 'task-state';
      taskState.dataset.state = 'idle';
      taskState.textContent = 'IDLE';
      card.querySelector(':scope > summary').append(taskState);
      this.cardManager.register(card);
    }

    makeSettingsCards() {
      const targets = this.createCard('targetSettings', '目标物设置', 'SCENE OBJECTS', '目标物设置');
      targets.innerHTML += '<div class="settings-form">'
        + '<label>目标类型<select id="target-object-type"><option value="cube">方块</option><option value="sphere">球体</option><option value="cylinder">圆柱</option><option value="custom">自定义（工件）</option></select></label>'
        + '<label>数量<select id="target-object-count"><option>1</option><option selected>5</option><option>10</option><option>20</option></select></label>'
        + '<label>颜色<input id="target-object-color" type="color" value="#ed9c49" /></label>'
        + '<fieldset class="position-fields"><legend>位置 · 米</legend><label>X<input id="target-position-x" type="number" value="2.35" step="0.05" /></label><label>Y<input id="target-position-y" type="number" value="1.02" step="0.01" /></label><label>Z<input id="target-position-z" type="number" value="-0.20" step="0.05" /></label></fieldset>'
        + '<label class="toggle-row"><input id="target-object-grabbable" type="checkbox" checked />允许自动抓取</label>'
        + '<label class="toggle-row"><input id="target-object-random" type="checkbox" />随机位置与颜色</label>'
        + '<div class="settings-actions"><button id="create-target-objects" type="button">创建目标</button><button id="random-target-objects" type="button">随机生成</button><button id="clear-target-objects" type="button">清除目标</button></div>'
        + '<p id="target-object-status" class="settings-note" role="status">当前场景没有目标物。</p></div>';
      this.cardManager.register(targets);

      const bench = this.createCard('workbenchSettings', '工作台设置', 'WORKCELL CONFIG', '工作台设置');
      bench.innerHTML += '<div class="settings-form">'
        + '<label>工作台类型<select id="bench-type"><option value="basic">基础工作台</option><option value="industrial" selected>工业工作台</option><option value="lab">实验工作台</option><option value="blank">空白工作台</option></select></label>'
        + '<fieldset class="position-fields"><legend>工作台尺寸</legend><label>宽度<input id="bench-width" type="number" value="3.8" min="1" max="8" step="0.1" /></label><label>深度<input id="bench-depth" type="number" value="2.6" min="1" max="6" step="0.1" /></label></fieldset>'
        + '<label class="toggle-row"><input id="show-grid" type="checkbox" checked />显示网格</label>'
        + '<label class="toggle-row"><input id="show-axes" type="checkbox" checked />显示坐标轴</label>'
        + '<label class="toggle-row"><input id="show-collision" type="checkbox" />显示碰撞辅助</label>'
        + '<label class="toggle-row"><input id="show-ground" type="checkbox" checked />显示地面</label>'
        + '<p class="settings-note">空白工作台会隐藏工作台对象；地面、网格和机械臂可独立控制。</p></div>';
      this.cardManager.register(bench);
    }

    makeMonitorCards() {
      const communications = this.createCard('communications', '通信监视器', 'LOCAL EVENT MONITOR', '工作台事件');
      communications.innerHTML += '<p class="monitor-disclaimer">本地模拟器事件流 · 不连接真实控制器</p><ol id="workspace-event-log" class="event-log" aria-live="polite"></ol>';
      this.cardManager.register(communications);
      const data = this.createCard('dataMonitor', '数据监视器', 'LIVE TELEMETRY', '数据监视器');
      data.innerHTML += '<div class="data-monitor-grid"><div><span>关节角度</span><output id="data-joints">--</output></div>'
        + '<div><span>末端坐标</span><output id="data-pose">--</output></div><div><span>任务状态</span><output id="data-task-state">IDLE</output></div>'
        + '<div><span>当前目标</span><output id="data-workpieces">0</output></div></div><p class="settings-note">每 250 ms 刷新一次</p>';
      this.cardManager.register(data);
    }

    makeWorkspaceSettingsCard() {
      const card = this.createCard('workspaceSettings', '工作台管理', 'WORKSPACE MANAGER', '工作台设置');
      const list = CARD_DEFS.map(([id, title]) => '<label class="toggle-row"><input type="checkbox" data-workspace-card="' + id + '" />' + title + '</label>').join('');
      card.innerHTML += '<div class="settings-form"><div class="workspace-card-list">' + list + '</div>'
        + '<div class="settings-actions"><button id="workspace-restore" type="button">恢复默认</button><button id="workspace-save" type="button">保存布局</button></div>'
        + '<label>工作台模式<select id="workspace-mode"><option value="operation">操作模式</option><option value="debug">调试模式</option><option value="monitor">监控模式</option><option value="minimal">极简模式</option></select></label></div>';
      this.cardManager.register(card);
      for (const input of this.layer.querySelectorAll('[data-workspace-card]')) input.addEventListener('change', () => this.cardManager.setVisible(input.dataset.workspaceCard, input.checked));
      document.getElementById('workspace-restore').addEventListener('click', () => this.menuBar.restoreDefault());
      document.getElementById('workspace-save').addEventListener('click', () => this.cardManager.layoutManager.save());
      document.getElementById('workspace-mode').addEventListener('change', (event) => this.workspace.setMode(event.target.value));
    }

    setTaskController(controller) {
      this.taskController = controller;
      this.taskController?.updateControls();
    }

    loadLayout() {
      const sceneBusy = this.taskController?.running
        || this.workbench.workpieces.some((part) => part.status === 'held');
      const currentBenchMode = this.workbench.benchMode;
      const currentTargetMode = this.workbench.targetMode;
      const loaded = this.cardManager.layoutManager.load();
      this.workspace.restoreMode(this.cardManager.workspaceMode);
      if (sceneBusy) {
        this.cardManager.benchMode = currentBenchMode;
        this.cardManager.targetMode = currentTargetMode;
        this.applyBenchMode(currentBenchMode, { quiet: true });
        this.cardManager.showNotice('任务运行或夹爪持有工件，已保留当前场景模式。');
      } else {
        this.applySceneModes(this.cardManager.benchMode, this.cardManager.targetMode, { quiet: true });
      }
      this.syncCardChecks();
      this.syncWorkspaceSettings();
      this.menuBar.syncSceneSelects();
      return loaded;
    }

    createCard(id, title, eyebrow, heading) {
      const card = document.createElement('details');
      card.dataset.cardId = id;
      card.dataset.cardTitle = title;
      card.setAttribute('aria-label', title);
      card.open = false;
      const summary = document.createElement('summary');
      summary.className = 'panel-summary';
      summary.innerHTML = '<div><span class="card-label">' + eyebrow + '</span><h2>' + heading + '</h2></div>';
      card.append(summary);
      this.layer.append(card);
      return card;
    }

    bindSettings() {
      const byId = (id) => document.getElementById(id);
      byId('create-target-objects').addEventListener('click', () => this.createTargets(false));
      byId('random-target-objects').addEventListener('click', () => this.createTargets(true));
      byId('clear-target-objects').addEventListener('click', () => this.clearTargets());
      byId('bench-type').addEventListener('change', (event) => this.applyBenchMode(event.target.value));
      byId('show-grid').addEventListener('change', (event) => this.setSceneObject('World Grid', event.target.checked));
      byId('show-axes').addEventListener('change', (event) => this.setSceneObject('World Axes', event.target.checked));
      byId('show-ground').addEventListener('change', (event) => this.setSceneObject('Ground', event.target.checked));
      byId('show-collision').addEventListener('change', (event) => this.workbench.setCollisionHelpers(event.target.checked));
      byId('bench-width').addEventListener('change', (event) => this.workbench.setDimensions(Number(event.target.value), Number(byId('bench-depth').value)));
      byId('bench-depth').addEventListener('change', (event) => this.workbench.setDimensions(Number(byId('bench-width').value), Number(event.target.value)));
    }

    createTargets(forceRandom) {
      if (this.taskController?.running || this.workbench.workpieces.some((part) => part.status === 'held')) {
        document.getElementById('target-object-status').textContent = '请先停止任务并安全放置夹爪中的工件，再更改目标物。';
        return;
      }
      try {
        const random = forceRandom || document.getElementById('target-object-random').checked;
        const count = Number(document.getElementById('target-object-count').value);
        const typeValue = document.getElementById('target-object-type').value;
        const type = typeValue === 'custom' ? 'workpiece' : typeValue;
        const color = document.getElementById('target-object-color').value;
        const position = { x: Number(document.getElementById('target-position-x').value), y: Number(document.getElementById('target-position-y').value), z: Number(document.getElementById('target-position-z').value) };
        const grabbable = document.getElementById('target-object-grabbable').checked;
        const made = this.workbench.spawnConfiguredWorkpieces({ type, count, color, random, position, grabbable });
        this.cardManager.targetMode = count === 1 ? 'single' : (random ? 'random' : 'multiple');
        this.workbench.targetMode = this.cardManager.targetMode;
        this.menuBar?.syncSceneSelects();
        this.workbench.placementGroup.visible = false;
        this.taskController?.updateControls();
        document.getElementById('target-object-status').textContent = '已创建 ' + made + ' 个目标物。';
        this.cardManager.saveSoon();
        app.emitWorkspaceEvent?.('创建' + (random ? '随机' : '') + '目标物：' + made + ' 个');
      } catch (error) { document.getElementById('target-object-status').textContent = error.message || '创建目标失败。'; }
    }

    clearTargets() {
      if (this.taskController?.running || this.workbench.workpieces.some((part) => part.status === 'held')) {
        document.getElementById('target-object-status').textContent = '请先停止任务并安全放置夹爪中的工件，再清除目标物。';
        return;
      }
      try {
        this.workbench.clearWorkpieces();
        this.workbench.targetMode = 'none';
        this.workbench.placementGroup.visible = false;
        this.taskController?.updateControls();
        this.cardManager.targetMode = 'none';
        this.menuBar?.syncSceneSelects();
        document.getElementById('target-object-status').textContent = '当前场景没有目标物。';
        this.cardManager.saveSoon();
        app.emitWorkspaceEvent?.('已清除场景目标物');
      } catch (error) { document.getElementById('target-object-status').textContent = error.message || '清除目标失败。'; }
    }

    applySceneModes(benchMode, targetMode, { quiet = false } = {}) {
      this.applyBenchMode(benchMode, { quiet: true });
      this.applyTargetMode(targetMode, { quiet: true });
      if (!quiet) { this.cardManager.saveSoon(); app.emitWorkspaceEvent?.('场景模式：' + benchMode + ' / ' + targetMode); }
    }

    applyBenchMode(mode, { quiet = false } = {}) {
      this.cardManager.benchMode = mode;
      this.workbench.setBenchMode(mode);
      if (document.getElementById('bench-type')) document.getElementById('bench-type').value = mode;
      this.menuBar?.syncSceneSelects();
      if (!quiet) { this.cardManager.saveSoon(); app.emitWorkspaceEvent?.('工作台类型：' + mode); }
    }

    applyTargetMode(mode, { quiet = false } = {}) {
      if (this.taskController?.running || this.workbench.workpieces.some((part) => part.status === 'held')) {
        this.cardManager.showNotice('请先停止任务并安全放置夹爪中的工件，再切换目标物模式。');
        this.menuBar?.syncSceneSelects();
        return false;
      }
      this.cardManager.targetMode = mode;
      this.workbench.setTargetMode(mode);
      this.menuBar?.syncSceneSelects();
      this.taskController?.updateControls();
      if (document.getElementById('target-object-status')) {
        document.getElementById('target-object-status').textContent = this.workbench.workpieces.length
          ? '场景中有 ' + this.workbench.workpieces.length + ' 个目标物。' : '当前场景没有目标物。';
      }
      if (!quiet) { this.cardManager.saveSoon(); app.emitWorkspaceEvent?.('目标物模式：' + mode); }
      return true;
    }

    syncWorkspaceSettings() {
      for (const input of document.querySelectorAll('[data-workspace-card]')) {
        const card = this.cardManager.cards.get(input.dataset.workspaceCard);
        input.checked = Boolean(card && !card.element.hidden);
      }
      const mode = document.getElementById('workspace-mode');
      if (mode) mode.value = this.workspace.mode;
    }

    setSceneObject(name, visible) { const object = this.scene.getObjectByName(name); if (object) object.visible = visible; }
    syncCardChecks() { this.menuBar?.syncCardChecks(); }
  }

  app.WorkspaceManager = WorkspaceManager;
  app.WorkspaceCardDefinitions = CARD_DEFS;
})(window);
