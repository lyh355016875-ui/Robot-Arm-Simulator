(function (global) {
  'use strict';
  global.RobotArmSimulator = global.RobotArmSimulator || {};
  const app = global.RobotArmSimulator;

  class CardManager {
    constructor(layer) {
      this.layer = layer;
      this.cards = new Map();
      this.nextZ = 20;
      this.activePointer = null;
      this.saveTimer = 0;
      this.layoutManager = new app.LayoutManager(this);
      this.workspaceMode = 'operation';
      this.benchMode = 'industrial';
      this.targetMode = 'none';
      this.onVisibilityChange = () => {};
      this.notice = null;
      this.onPointerMove = (event) => this.handlePointerMove(event);
      this.onPointerUp = (event) => this.handlePointerUp(event);
      for (const element of layer.querySelectorAll('[data-card-id]')) this.register(element);
      this.installNotice();
      global.addEventListener('resize', () => this.clampAll());
      this.clampAll();
    }

    register(element) { const card = new app.Card(element, this); this.cards.set(card.id, card); return card; }

    installNotice() {
      this.notice = document.createElement('div');
      this.notice.className = 'workspace-notice';
      this.notice.setAttribute('role', 'status');
      this.notice.setAttribute('aria-live', 'polite');
      this.layer.append(this.notice);
    }

    showNotice(message) {
      this.notice.textContent = message;
      this.notice.classList.add('is-visible');
      clearTimeout(this.noticeTimer);
      this.noticeTimer = setTimeout(() => this.notice.classList.remove('is-visible'), 2300);
    }

    setVisible(id, visible) {
      const card = this.cards.get(id);
      if (!card) return false;
      card.element.hidden = !visible;
      if (visible) this.bringToFront(id);
      this.onVisibilityChange();
      this.saveSoon();
      app.emitWorkspaceEvent?.((visible ? '显示' : '隐藏') + '卡片：' + card.title);
      return true;
    }

    toggleVisible(id) { const card = this.cards.get(id); return card ? this.setVisible(id, card.element.hidden) : false; }
    showAll() { for (const id of this.cards.keys()) this.setVisible(id, true); }
    hideAll() { for (const id of this.cards.keys()) this.setVisible(id, false); }

    bringToFront(id) {
      const card = this.cards.get(id);
      if (!card || card.element.hidden) return;
      card.element.style.zIndex = String(++this.nextZ);
      this.saveSoon();
    }

    applyCardState(id, state) {
      const card = this.cards.get(id);
      if (!card || !state) return;
      const layerWidth = Math.max(this.layer.clientWidth, 220);
      const layerHeight = Math.max(this.layer.clientHeight, 160);
      const position = this.clampPosition({ x: Number(state.x) || 0, y: Number(state.y) || 0 }, card);
      const width = this.clamp(Number(state.width) || 280, 220, layerWidth);
      const height = this.clamp(Number(state.height) || 260, 48, Math.max(48, layerHeight - position.y));
      const collapsed = state.collapsed === true;
      card.expandedHeight = collapsed ? height : null;
      card.element.style.width = width + 'px';
      card.element.style.height = (collapsed ? 48 : height) + 'px';
      card.element.style.transform = 'translate3d(' + position.x + 'px, ' + position.y + 'px, 0)';
      card.element.style.zIndex = String(Math.max(1, Math.floor(Number(state.zIndex) || 1)));
      this.nextZ = Math.max(this.nextZ, Number(card.element.style.zIndex) || 0);
      card.element.hidden = state.visible === false;
      card.element.dataset.collapsed = String(collapsed);
      card.body.hidden = collapsed;
      card.updateCollapseButton();
      this.clampCard(card);
    }

    getCardState(id) {
      const card = this.cards.get(id);
      if (!card) return null;
      const match = card.element.style.transform.match(/translate3d\(([-\d.]+)px,\s*([-\d.]+)px/);
      return { visible: !card.element.hidden, x: match ? Number(match[1]) : 0, y: match ? Number(match[2]) : 0,
        width: card.element.getBoundingClientRect().width, height: card.isCollapsed() ? (card.expandedHeight || card.element.getBoundingClientRect().height) : card.element.getBoundingClientRect().height,
        collapsed: card.isCollapsed(), zIndex: Number(card.element.style.zIndex) || 1 };
    }

    beginDrag(card, event) {
      if (event.button !== 0 || event.target.closest('[data-card-action]')) return;
      event.preventDefault();
      this.bringToFront(card.id);
      this.activePointer = { card, pointerId: event.pointerId, kind: 'move', startX: event.clientX, startY: event.clientY,
        origin: this.readPosition(card), moved: false, pending: null, frame: 0 };
      global.addEventListener('pointermove', this.onPointerMove, { passive: false });
      global.addEventListener('pointerup', this.onPointerUp, { once: true });
      global.addEventListener('pointercancel', this.onPointerUp, { once: true });
    }

    beginResize(card, event) {
      if (event.button !== 0) return;
      event.preventDefault(); event.stopPropagation(); this.bringToFront(card.id);
      const bounds = card.element.getBoundingClientRect();
      this.activePointer = { card, pointerId: event.pointerId, kind: 'resize', startX: event.clientX, startY: event.clientY,
        origin: { x: bounds.width, y: bounds.height }, moved: true, pending: null, frame: 0 };
      global.addEventListener('pointermove', this.onPointerMove, { passive: false });
      global.addEventListener('pointerup', this.onPointerUp, { once: true });
      global.addEventListener('pointercancel', this.onPointerUp, { once: true });
    }

    handlePointerMove(event) {
      const active = this.activePointer;
      if (!active || event.pointerId !== active.pointerId) return;
      event.preventDefault();
      const dx = event.clientX - active.startX;
      const dy = event.clientY - active.startY;
      if (active.kind === 'move' && Math.hypot(dx, dy) < 4 && !active.moved) return;
      active.moved = true;
      active.pending = active.kind === 'move'
        ? this.clampPosition({ x: active.origin.x + dx, y: active.origin.y + dy }, active.card)
        : this.clampSize({ width: active.origin.x + dx, height: active.origin.y + dy }, active.card);
      if (!active.frame) active.frame = requestAnimationFrame(() => {
        const current = this.activePointer;
        if (!current || !current.pending) return;
        if (current.kind === 'move') this.writePosition(current.card, current.pending);
        else { current.card.element.style.width = current.pending.width + 'px'; current.card.element.style.height = current.pending.height + 'px'; }
        current.frame = 0;
      });
    }

    handlePointerUp(event) {
      const active = this.activePointer;
      if (!active || event.pointerId !== active.pointerId) return;
      if (active.frame) cancelAnimationFrame(active.frame);
      if (active.pending) {
        if (active.kind === 'move') this.writePosition(active.card, active.pending);
        else { active.card.element.style.width = active.pending.width + 'px'; active.card.element.style.height = active.pending.height + 'px'; }
      }
      this.activePointer = null;
      global.removeEventListener('pointermove', this.onPointerMove);
      global.removeEventListener('pointercancel', this.onPointerUp);
      this.saveSoon();
    }

    readPosition(card) {
      const match = card.element.style.transform.match(/translate3d\(([-\d.]+)px,\s*([-\d.]+)px/);
      return { x: match ? Number(match[1]) : 0, y: match ? Number(match[2]) : 0 };
    }
    writePosition(card, position) { card.element.style.transform = 'translate3d(' + position.x + 'px, ' + position.y + 'px, 0)'; }

    clampPosition(position, card) {
      const width = this.layer.clientWidth, height = this.layer.clientHeight;
      const cardWidth = Number.parseFloat(card.element.style.width) || 280;
      return { x: this.clamp(position.x, Math.min(20 - cardWidth + 100, 0), Math.max(0, width - 100)), y: this.clamp(position.y, 0, Math.max(0, height - 42)) };
    }

    clampSize(size, card) {
      const position = this.readPosition(card), minimumHeight = card.isCollapsed() ? 48 : 140;
      return { width: this.clamp(size.width, 220, Math.max(220, this.layer.clientWidth - Math.max(0, position.x))),
        height: this.clamp(size.height, minimumHeight, Math.max(minimumHeight, this.layer.clientHeight - Math.max(0, position.y))) };
    }

    clampCard(card) {
      if (card.element.hidden) return;
      const position = this.clampPosition(this.readPosition(card), card);
      this.writePosition(card, position);
      const bounds = card.element.getBoundingClientRect();
      const expandedHeight = card.isCollapsed() ? (card.expandedHeight || bounds.height) : bounds.height;
      const size = this.clampSize({ width: bounds.width, height: expandedHeight }, card);
      card.element.style.width = size.width + 'px';
      if (!card.isCollapsed()) card.element.style.height = size.height + 'px';
      else { card.expandedHeight = size.height; card.element.style.height = '48px'; }
    }
    clampAll() { for (const card of this.cards.values()) this.clampCard(card); }

    saveSoon() {
      clearTimeout(this.saveTimer);
      this.saveTimer = setTimeout(() => {
        try { localStorage.setItem('robot-arm-simulator.workspace.v09', JSON.stringify(this.layoutManager.capture())); }
        catch (_) { /* Explicit save reports storage errors to the user. */ }
      }, 450);
    }

    clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
  }
  app.CardManager = CardManager;
})(window);
