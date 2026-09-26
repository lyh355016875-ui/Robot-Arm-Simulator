const DISPLAY_IDS = {
  x: 'pose-x',
  y: 'pose-y',
  z: 'pose-z',
  roll: 'pose-roll',
  pitch: 'pose-pitch',
  yaw: 'pose-yaw',
};

export class PoseDisplay {
  constructor(robot, root = document) {
    this.robot = robot;
    this.outputs = Object.fromEntries(
      Object.entries(DISPLAY_IDS).map(([key, id]) => {
        const output = root.getElementById(id);
        if (!output) throw new Error('缺少末端姿态显示元素：' + id);
        return [key, output];
      }),
    );
  }

  update() {
    const { position, orientation } = this.robot.getEndEffectorPose();
    this.outputs.x.textContent = position.x.toFixed(3) + ' m';
    this.outputs.y.textContent = position.y.toFixed(3) + ' m';
    this.outputs.z.textContent = position.z.toFixed(3) + ' m';
    this.outputs.roll.textContent = orientation.roll.toFixed(1) + '°';
    this.outputs.pitch.textContent = orientation.pitch.toFixed(1) + '°';
    this.outputs.yaw.textContent = orientation.yaw.toFixed(1) + '°';
  }
}
