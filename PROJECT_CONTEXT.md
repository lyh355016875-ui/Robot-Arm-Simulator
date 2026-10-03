# 项目上下文：AI 机械臂模拟器

## 1. 项目目标

开发可在浏览器中运行的 3D 六轴机械臂实验平台，支持关节控制、姿态反馈、逆运动学、自动抓取和传感器仿真。当前版本 V0.8。

## 2. 当前目录结构

```text
Robot-Arm-Simulator/
├── index.html
├── README.md
├── package.json
├── assets/                  # 当前为空，供后续资源使用
├── scripts/serve.mjs        # 可选本地 HTTP 服务
├── scripts/kinematics.test.mjs # Node 内置运动学单元测试
└── src/
    ├── main.js
    ├── RobotSensors.js       # 末端相机、距离/力矩与关节状态模拟
    ├── camera.js
    ├── renderer.js
    ├── scene.js
    ├── styles.css
    ├── robot/
    │   ├── RobotArm.js
    │   ├── Joint.js
    │   ├── Link.js
    │   ├── EndEffector.js
    │   └── Workbench.js
    ├── controller/
    │   ├── JointController.js
    │   ├── KeyboardController.js
    │   ├── PoseDisplay.js
    │   ├── TargetController.js
    │   └── PickPlaceController.js
    └── kinematics/
        ├── forward.js
        ├── inverse.js
        └── matrix.js
```

## 3. 已完成功能

- V0.1 基础 Three.js 场景、摄像机、灯光、网格地面和 FPS。
- V0.4 六轴机械臂 Object3D 层级、金属模型、阴影和关节坐标轴。
- V0.5 J1–J6 滑块与键盘控制、关节限位、实时角度、末端 XYZ 和 Rx/Ry/Rz 姿态显示。
- 双击启动修复：`index.html` 加载本地经典脚本，Three.js 0.186.0 与 OrbitControls 从 CDN 动态加载；失败时显示错误状态。
- V0.6 六轴正运动学与带关节限位的阻尼最小二乘逆运动学；支持 XYZ/RX/RY/RZ 数值目标、可拖拽目标球、姿态轴显示和自动关节动画。
- V0.6 Node 内置运动学测试覆盖几何基准、XYZ 欧拉角转换、可达目标求解和关节限位。
- V0.7 工业工作台、随机方块/球体/加工件、基于 Three.js 场景投影与射线的模拟视觉检测、可动画开合夹爪和自动抓取放置。
- V0.7 IDLE/SCAN/MOVE/GRAB/PLACE 状态机、可停止任务、夹爪安全放置和滚动任务日志；测试覆盖任务状态流转与连续桌面取放 IK 位姿。
- V0.8 末端安装的模拟相机视角、工作台距离射线、简化动力学力/力矩读数，以及六关节位置/速度/力矩反馈。
- V0.8 机器人状态面板和关节、姿态、目标、任务面板的折叠控制；目标控制球可隐藏，关节角度最多显示六位小数。

## 4. 当前版本状态

V0.8 的传感器和可折叠面板已接入。传感器读数属于 Three.js 场景和简化动力学模型的估算值，不代表真实硬件采样。直接双击启动仍待 Edge 实机验收。

## 5. 关键技术

HTML5、CSS、JavaScript、Three.js 0.186.0、WebGL 2、OrbitControls、TransformControls。机械臂为六自由度串联 Object3D 层级。IK 使用数值雅可比和阻尼最小二乘法，运动学计算采用弧度，页面输入输出采用角度。自动抓取视觉为场景几何投影与射线模拟，不读取真实摄像头图像。末端传感器相机由独立 Three.js 视口渲染；关节力矩、末端力/力矩均为简化仿真估算。直接双击模式通过 `index.html` 顺序加载 IIFE 经典脚本；不要改回本地 ES 模块脚本加载。

## 6. 已知问题

- Three.js、OrbitControls 和 TransformControls 依赖 jsDelivr，双击运行仍需要互联网；项目不包含离线 Three.js 副本。
- 当前 localhost 页面在内嵌浏览器中已加载到 READY，并完成随机工件整批自动抓取/放置，日志回到 IDLE 并显示本批处理完成；控制台无警告或错误。
- 双击 `file://` 的 Edge 实机验收尚未完成；该方式仍需验证 CDN 加载、WebGL 与显示效果。

## 7. 下一步

1. 在 Edge 中双击项目根目录 `index.html`，确认 READY、模型可见、滑块/键盘/姿态反馈正常；若失败查看 F12 Console 和网络状态。
2. 在直接双击模式下验收目标球拖动、姿态输入与机械臂跟随；保留现有手动控制。

## 8. 约束与注意事项

- 只使用本地 Git；不要添加 GitHub remote、推送或上传项目。V0.8 开发基于 V0.7 本地版本。
- 保持六轴手动控制、现有限位和反馈等稳定功能；改动前先检查当前实现。
- 当前版本 V0.8 包含 FK/IK、自动抓取与传感器仿真，并保留原有关节手动控制。
- 双击运行不需要 Node/npm，但需要互联网访问 jsDelivr 和支持 WebGL 2 的现代浏览器。可选服务器方式：`node scripts/serve.mjs`。
- Windows 终端优先使用 PowerShell 7。
