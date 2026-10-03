(function (global) {
  'use strict';
  global.RobotArmSimulator = global.RobotArmSimulator || {};
  const app = global.RobotArmSimulator;

  class Card {
    constructor(element, manager) {
      this.manager = manager;
      this.expandedHeight = null;
      this.id = element.dataset.cardId;
      this.title = element.dataset.cardTitle || this.id;
      const summary = element.querySelector(':scope > summary');
      if (!this.id || !summary) throw new Error('工作台卡片缺少 ID 或标题栏。');
      const shell = document.createElement('section');
      for (const attribute of [...element.attributes]) if (attribute.name !== 'open') shell.setAttribute(attribute.name, attribute.value);
      shell.classList.add('workspace-card');
      const header = document.createElement('div');
      header.className = summary.className;
      header.setAttribute('aria-label', summary.getAttribute('aria-label') || this.title);
      header.setAttribute('title', summary.getAttribute('title') || '拖动移动');
      while (summary.firstChild) header.append(summary.firstChild);
      summary.remove();
      const body = document.createElement('div');
      body.className = 'card-body';
      shell.append(header);
      for (const child of [...element.children]) body.append(child);
      shell.append(body);
      element.replaceWith(shell);
      this.element = shell;
      this.header = header;
      this.body = body;
      this.element.dataset.collapsed = String(!element.open);
      this.header.classList.add('card-header');
      this.header.setAttribute('aria-label', this.title + ' 卡片标题栏；拖动移动');
      this.header.setAttribute('title', '拖动移动');
      this.collapseButton = this.createAction('collapse', '−', '折叠卡片');
      this.closeButton = this.createAction('close', '×', '隐藏卡片');
      this.header.append(this.collapseButton, this.closeButton);
      this.resizeHandle = document.createElement('button');
      this.resizeHandle.type = 'button';
      this.resizeHandle.className = 'card-resize-handle';
      this.resizeHandle.setAttribute('aria-label', '调整' + this.title + '卡片大小');
      this.resizeHandle.title = '拖动调整大小';
      this.element.append(this.resizeHandle);
      this.onHeaderPointerDown = (event) => this.manager.beginDrag(this, event);
      this.onResizePointerDown = (event) => this.manager.beginResize(this, event);
      this.onHeaderClick = (event) => event.preventDefault();
      this.onCollapse = (event) => { event.preventDefault(); event.stopPropagation(); this.setCollapsed(!this.isCollapsed()); };
      this.onClose = (event) => { event.preventDefault(); event.stopPropagation(); this.manager.setVisible(this.id, false); };
      this.header.addEventListener('pointerdown', this.onHeaderPointerDown);
      this.header.addEventListener('click', this.onHeaderClick);
      this.collapseButton.addEventListener('click', this.onCollapse);
      this.closeButton.addEventListener('click', this.onClose);
      this.resizeHandle.addEventListener('pointerdown', this.onResizePointerDown);
      this.element.addEventListener('pointerdown', () => this.manager.bringToFront(this.id));
      this.element.addEventListener('focusin', () => this.manager.bringToFront(this.id));
      this.element.addEventListener('toggle', () => this.updateCollapseButton());
      this.updateCollapseButton();
    }

    createAction(action, label, title) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'card-action card-action-' + action;
      button.dataset.cardAction = action;
      button.textContent = label;
      button.title = title;
      button.setAttribute('aria-label', title);
      return button;
    }

    setCollapsed(collapsed) {
      if (collapsed && !this.isCollapsed()) {
        this.expandedHeight = this.element.getBoundingClientRect().height;
        this.element.dataset.collapsed = 'true';
        this.body.hidden = true;
        this.element.style.height = '48px';
      } else if (!collapsed && this.isCollapsed()) {
        this.element.dataset.collapsed = 'false';
        this.body.hidden = false;
        if (this.expandedHeight) this.element.style.height = this.expandedHeight + 'px';
        this.expandedHeight = null;
      }
      this.updateCollapseButton();
      this.manager.saveSoon();
    }

    updateCollapseButton() {
      const collapsed = this.isCollapsed();
      this.collapseButton.textContent = collapsed ? '+' : '−';
      this.collapseButton.title = collapsed ? '展开卡片' : '折叠卡片';
      this.collapseButton.setAttribute('aria-label', this.collapseButton.title);
    }

    isCollapsed() { return this.element.dataset.collapsed === 'true'; }
  }

  app.Card = Card;
})(window);
