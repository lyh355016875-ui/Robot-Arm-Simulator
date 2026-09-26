# AI 机械臂模拟器

《AI 机械臂模拟器》是运行在浏览器中的 3D 机器人实验平台。当前版本为 **V0.6 六轴机械臂逆运动学**，支持正向与逆向运动学、目标位姿控制、六轴关节控制和末端姿态反馈。页面支持直接双击 `index.html` 启动。

## 项目结构

```text
Robot-Arm-Simulator/
├── src/
│   ├── main.js              # 页面启动和动画循环
│   ├── camera.js            # 摄像机与轨道控制
│   ├── renderer.js          # WebGL 渲染器
│   ├── scene.js             # 场景、灯光和地面
│   ├── styles.css
│   ├── robot/
│   │   ├── RobotArm.js        # 六轴模型、层级和末端姿态计算
│   │   ├── Joint.js           # 关节轴、角度限制和模型
│   │   ├── Link.js            # 金属连杆模型
│   │   └── EndEffector.js     # 末端工具与工具坐标点
│   ├── controller/
│   │   ├── JointController.js # 六个滑块与角度同步
│   │   ├── KeyboardController.js # 键盘关节微调
│   │   ├── PoseDisplay.js     # 末端 XYZ 与 Rx/Ry/Rz 显示
│   │   └── TargetController.js # 目标球、逆解和关节动画
│   └── kinematics/
│       ├── forward.js        # 六轴正运动学
│       ├── inverse.js        # 带关节限位的阻尼最小二乘逆解
│       └── matrix.js         # 矩阵与旋转工具
├── assets/
├── scripts/
├── index.html
├── package.json
└── README.md
```

## 机械臂结构与关节限制

层级为 `Robot → Base → J1 → Link1 → J2 → Link2 → J3 → Link3 → J4 → J5 → J6 → EndEffector`。每个关节由独立 Three.js `Object3D` 驱动，父节点转动会传递到其下游连杆和末端工具。

| 关节 | 作用 | 角度限制 |
| --- | --- | ---: |
| J1 | 底座旋转 | -180° 至 180° |
| J2 | 肩部俯仰 | -90° 至 90° |
| J3 | 肘部旋转 | -120° 至 120° |
| J4 | 腕部旋转 | -180° 至 180° |
| J5 | 腕部俯仰 | -125° 至 125° |
| J6 | 末端旋转 | -360° 至 360° |

可拖动控制面板中的滑块控制关节。键盘每按一次调整 1°，按住 `Shift` 调整 10°：

| 关节 | 减小 | 增大 |
| --- | --- | --- |
| J1 | A | D |
| J2 | S | W |
| J3 | F | R |
| J4 | G | T |
| J5 | H | Y |
| J6 | J | U |

焦点位于滑块、文本框等输入控件时，键盘控制会暂停，以保留这些控件的按键操作。滑块、键盘和逆运动学输出都会遵守关节限制。自动运动期间使用滑块或键盘会停止当前动画。

## 实时反馈

面板显示末端工具点的世界坐标 X/Y/Z（米），以及按 XYZ 欧拉角表示的方向 Rx/Ry/Rz（度）。数据在任一关节角改变后立即更新。在右侧目标面板输入 XYZ 与 Rx/Ry/Rz，或拖动场景中的青色目标球；机械臂会求解并平滑移动到该位姿。超出工作范围时会移动到当前最佳近似解并显示误差。目标球的坐标轴显示目标姿态。

## 运动学与测试

正运动学和逆运动学使用与模型相同的关节轴、连杆偏移和末端工具长度。逆解以弧度计算，内部使用数值雅可比和阻尼最小二乘法，并在每轮迭代应用六个关节的限位。

在安装 Node.js 的环境中运行 `npm test` 执行运动学单元测试。

## 运行方式

**直接运行：** 双击项目根目录的 `index.html`。页面会从 jsDelivr 加载 Three.js 0.186.0、OrbitControls 和 TransformControls，因此这种方式需要互联网连接；无需安装 npm 包或启动本地服务器。

**本地服务器方式：** 安装 Node.js 后，在项目目录运行 `node scripts/serve.mjs`，再打开 <http://127.0.0.1:8000/>；也可以运行 `npm run dev`。本地服务器方式同样需要联网加载 Three.js。

建议使用启用了 WebGL 2 和硬件加速的现代浏览器。

## 技术

- HTML5、CSS、原生 JavaScript（兼容双击打开的经典脚本）
- Three.js 0.186.0、WebGL 2、OrbitControls、TransformControls
- 六自由度 `Object3D` 关节层级、限位 IK 和末端世界姿态反馈
