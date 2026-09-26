(function (global) {
  'use strict';
  global.RobotArmSimulator = global.RobotArmSimulator || {};
  const app = global.RobotArmSimulator;

  class JointController {
    constructor(robot, { root = document, onChange = () => {}, onManualChange = () => {} } = {}) {
      if (!robot || !Array.isArray(robot.joints) || robot.joints.length !== 6) {
        throw new TypeError('六轴控制器需要一个包含六个关节的机械臂。');
      }

      this.robot = robot;
      this.root = root;
      this.onChange = onChange;
      this.onManualChange = onManualChange;
      this.inputs = [];
      this.outputs = [];
      this.listeners = [];

      for (const [index, joint] of robot.joints.entries()) {
        const number = index + 1;
        const input = root.getElementById('joint' + number + '-angle');
        const output = root.getElementById('joint' + number + '-value');
        if (!input || !output) throw new Error('缺少 Joint' + number + ' 的滑块或角度显示。');

        input.min = String(joint.minAngle);
        input.max = String(joint.maxAngle);
        input.value = String(joint.currentAngle);
        this.inputs.push(input);
        this.outputs.push(output);

        const listener = () => this.setAngle(index, input.value);
        input.addEventListener('input', listener);
        this.listeners.push(() => input.removeEventListener('input', listener));
        this.updateReadout(index);
      }

      this.onChange(this.robot);
    }

    setAngle(index, value) {
      const degrees = this.robot.setJointAngle(index, value);
      this.inputs[index].value = String(degrees);
      this.updateReadout(index);
      this.onChange(this.robot);
      this.onManualChange(this.robot);
      return degrees;
    }

    setAngles(degreesList) {
      if (!Array.isArray(degreesList) || degreesList.length !== 6) throw new TypeError('批量关节控制需要六个角度。');
      const values = degreesList.map((degrees, index) => this.robot.setJointAngle(index, degrees));
      values.forEach((degrees, index) => {
        this.inputs[index].value = String(degrees);
        this.updateReadout(index);
      });
      this.onChange(this.robot);
      return values;
    }

    adjustAngle(index, delta) {
      return this.setAngle(index, this.robot.joints[index].currentAngle + delta);
    }

    updateReadout(index) {
      const degrees = this.robot.joints[index].currentAngle;
      const label = degrees + '°';
      this.outputs[index].value = label;
      this.outputs[index].textContent = label;
      this.inputs[index].setAttribute('aria-valuetext', label);
    }

    dispose() {
      this.listeners.forEach((removeListener) => removeListener());
      this.listeners = [];
    }
  }
  app.JointController = JointController;
})(window);
