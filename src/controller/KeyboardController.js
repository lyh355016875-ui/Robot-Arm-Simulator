(function (global) {
  'use strict';
  global.RobotArmSimulator = global.RobotArmSimulator || {};
  const app = global.RobotArmSimulator;

  const KEY_BINDINGS = new Map([
    ['a', [0, -1]], ['d', [0, 1]],
    ['s', [1, -1]], ['w', [1, 1]],
    ['f', [2, -1]], ['r', [2, 1]],
    ['g', [3, -1]], ['t', [3, 1]],
    ['h', [4, -1]], ['y', [4, 1]],
    ['j', [5, -1]], ['u', [5, 1]],
  ]);

  class KeyboardController {
    constructor(jointController, target = document) {
      this.jointController = jointController;
      this.target = target;
      this.handleKeyDown = this.handleKeyDown.bind(this);
      target.addEventListener('keydown', this.handleKeyDown);
    }

    handleKeyDown(event) {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      const elementName = event.target?.tagName?.toLowerCase();
      if (['input', 'textarea', 'select'].includes(elementName) || event.target?.isContentEditable) return;

      const binding = KEY_BINDINGS.get(event.key.toLowerCase());
      if (!binding) return;

      const [jointIndex, direction] = binding;
      const step = event.shiftKey ? 10 : 1;
      event.preventDefault();
      this.jointController.adjustAngle(jointIndex, direction * step);
    }

    dispose() {
      this.target.removeEventListener('keydown', this.handleKeyDown);
    }
  }
  app.KeyboardController = KeyboardController;
})(window);
