const JOINT_COUNT = 6;

export function connectJointControls(joints, root = document) {
  if (!Array.isArray(joints) || joints.length !== JOINT_COUNT) {
    throw new TypeError('控制面板需要 ' + JOINT_COUNT + ' 个关节。');
  }

  const listeners = [];
  for (const [index, joint] of joints.entries()) {
    const number = index + 1;
    const input = root.getElementById('joint' + number + '-angle');
    const output = root.getElementById('joint' + number + '-value');

    if (!input || !output) throw new Error('缺少 Joint' + number + ' 的滑块或角度读数。');
    if (typeof joint.setAngleDegrees !== 'function') throw new TypeError('Joint' + number + ' 不支持角度控制。');

    input.min = String(joint.minAngle);
    input.max = String(joint.maxAngle);
    input.value = String(joint.currentAngle);

    const updateAngle = () => {
      const degrees = joint.setAngleDegrees(input.value);
      input.value = String(degrees);
      const displayValue = degrees + '°';
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
