# 项目上下文：AI 机械臂模拟器

## 1. 项目目标

开发可在浏览器中运行的 3D 六轴机械臂实验平台，支持关节控制、姿态反馈，后续计划加入逆运动学（IK）。

## 2. 当前目录结构

```text
Robot-Arm-Simulator/
├── index.html
├── README.md
├── package.json
├── assets/                  # 当前为空，供后续资源使用
├── scripts/serve.mjs        # 可选本地 HTTP 服务
└── src/
    ├── main.js
    ├── camera.js
    ├── renderer.js
    ├── scene.js
    ├── styles.css
    ├── robot/
    │   ├── RobotArm.js
    │   ├── Joint.js
    │   ├── Link.js
    │   └── EndEffector.js
    └── controller/
        ├── JointController.js
        ├── KeyboardController.js
        └── PoseDisplay.js
```

## 3. 已完成功能

- V0.1 基础 Three.js 场景、摄像机、灯光、网格地面和 FPS。
- V0.4 六轴机械臂 Object3D 层级、金属模型、阴影和关节坐标轴。
- V0.5 J1–J6 滑块与键盘控制、关节限位、实时角度、末端 XYZ 和 Rx/Ry/Rz 姿态显示。
- 双击启动修复：`index.html` 加载本地经典脚本，Three.js 0.186.0 与 OrbitControls 从 CDN 动态加载；失败时显示错误状态。

## 4. 正在开发的功能

当前没有新的功能开发中；双击启动仍待 Edge 实机验收。IK 尚未开始，作为下一阶段候选功能。

## 5. 关键技术

HTML5、CSS、JavaScript、Three.js 0.186.0、WebGL 2、OrbitControls。机械臂为六自由度串联 Object3D 层级。直接双击模式通过 `index.html` 顺序加载 IIFE 经典脚本；不要改回本地 ES 模块脚本加载。

## 6. 已知问题

- Three.js 和 OrbitControls 依赖 jsDelivr，双击运行仍需要互联网；项目不包含离线 Three.js 副本。
- 双击 `file://` 的 Edge 视觉验收尚未完成。已通过 JS 语法、模拟 Three.js 的本地脚本装配冒烟检查和 localhost HTTP 检查；需在真实浏览器验证 CDN、WebGL 和显示效果。
- 浏览器自动化接口此前报错 `nodeRepl.fetch request failed`，无法通过该接口截图验收。

## 7. 下一步

1. 在 Edge 中双击项目根目录 `index.html`，确认状态变为 READY、模型可见，滑块/键盘/姿态反馈正常；若失败查看 F12 Console 和网络状态。
2. 修复浏览器实测发现的问题。
3. 规划 V0.6 逆运动学（IK），保留现有手动控制。

## 8. 约束与注意事项

- 只使用本地 Git；不要添加 GitHub remote、推送或上传项目。最近代码提交：`d5bcfa7`（双击 HTML 启动修复）。
- 保持六轴手动控制、现有限位和反馈等稳定功能；改动前先检查当前实现。
- V0.5 不包含 IK；除非进入后续版本，不要提前混入。
- 双击运行不需要 Node/npm，但需要互联网访问 jsDelivr 和支持 WebGL 2 的现代浏览器。可选服务器方式：`node scripts/serve.mjs`。
- Windows 终端优先使用 PowerShell 7。
