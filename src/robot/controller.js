const JOINT_CONTROLS = [
  { key: 'joint1', inputId: 'joint1-angle', outputId: 'joint1-value' },
  { key: 'joint2', inputId: 'joint2-angle', outputId: 'joint2-value' },
  { key: 'joint3', inputId: 'joint3-angle', outputId: 'joint3-value' },
];

export function connectJointControls(joints, root = document) {
  const listeners = [];

  for (const { key, inputId, outputId } of JOINT_CONTROLS) {
    const joint = joints[key];
    const input = root.getElementById(inputId);
    const output = root.getElementById(outputId);

    if (!joint || typeof joint.setAngleDegrees !== 'function') {
      throw new TypeError(`找不到可控制的关节：${key}`);
    }
    if (!input || !output) {
      throw new Error(`缺少关节 ${key} 的滑块或角度显示元素。`);
    }

    const updateAngle = () => {
      const degrees = joint.setAngleDegrees(input.value);
      const displayValue = `${degrees}°`;
      output.value = displayValue;
      output.textContent = displayValue;
      input.setAttribute('aria-valuetext', displayValue);
    };

    input.addEventListener('input', updateAngle);
    listeners.push(() => input.removeEventListener('input', updateAngle));
    updateAngle();
  }

  return () => listeners.forEach((removeListener) => removeListener());
}
