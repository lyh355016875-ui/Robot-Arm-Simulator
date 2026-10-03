# 项目上下文：AI 机械臂模拟器

## 1. 项目目标

开发 3D 六轴工业机械臂模拟器，支持关节控制、FK/IK、自动抓取、传感器仿真，以及可配置卡片式数字工作台。当前发行目标：V1.0.0 Windows 桌面版；浏览器功能基线：V0.9；V0.8 基线提交 `3358ca3`。

## 2. 当前目录结构

```text
Robot-Arm-Simulator/
├── index.html                 # 页面和经典脚本加载顺序
├── PROJECT_CONTEXT.md
├── README.md
├── package.json
├── scripts/
│   ├── serve.mjs               # 可选本地服务器
│   └── kinematics.test.mjs     # Node 内置测试
└── src/
    ├── ui/                     # 卡片、菜单、工作台模式和布局管理
    ├── main.js                 # 初始化和动画循环
    ├── RobotSensors.js         # 末端相机、距离/力矩/关节反馈
    ├── scene.js                # 场景
    ├── camera.js               # 主相机和轨道控制
    ├── renderer.js
    ├── styles.css
    ├── robot/                  # RobotArm、Joint、Link、EndEffector、Workbench
    ├── controller/             # 关节、键盘、姿态、目标 IK、抓取流程
    └── kinematics/             # forward.js、inverse.js、matrix.js
```

## 3. 完成的功能

- 六轴机械臂模型、限位滑块/键盘控制、末端坐标与姿态反馈。
- 正运动学及带限位的阻尼最小二乘逆运动学；XYZ/RX/RY/RZ 目标输入、拖拽控制球及平滑移动。
- 工业工作台、随机方块/球体/工件、夹爪和 IDLE/SCAN/MOVE/GRAB/PLACE 自动抓取状态机，含任务日志与安全停止/放置。
- V0.8 末端视角相机、工作台距离射线、简化力/力矩估算、六轴位置/速度/力矩状态表和机器人状态面板。
- 控制面板可折叠；目标球可隐藏；六轴角度读数最多六位小数。
- V0.9 卡片式 UI：关节、状态、IK、传感器、任务、目标设置、工作台设置、事件和数据监视卡片；支持 Pointer Events 拖动、折叠、隐藏、尺寸调整和层级管理。
- V0.9 布局和工作台模式：Default / Control / Debug / Minimal Layout，操作 / 调试 / 监控 / 极简模式；布局保存在 `localStorage` 并在重载后恢复。
- V0.9 场景模式：基础 / 工业 / 实验 / 空白工作台；无目标 / 单目标 / 多目标 / 随机目标 / 抓取任务。默认不生成目标物。

## 4. 当前版本状态

V0.9 UI 重构和浏览器验收已完成；V1.0.0 增加 Electron 桌面封装、离线 Three.js 资源与 Windows 安装/便携版发行流程，机械臂仿真功能保持不变。

## 5. 关键技术

HTML/CSS/原生 JavaScript、Three.js 0.186.0、WebGL 2、OrbitControls、TransformControls。机械臂用六轴串联 `Object3D`；IK 内部用弧度，界面用角度。页面通过 `index.html` 按序加载 IIFE 经典脚本以支持 `file://` 启动。自动抓取视觉、末端相机及力/力矩读数均为场景/模型仿真，不接真实传感器。

## 6. 已知问题

- 浏览器版 Three.js 及控件从 jsDelivr 加载，需网络；桌面版将其打包在应用内。两种运行方式都需要支持 WebGL 2 的显卡和驱动。
- `file://` 下的 Edge 启动和显示尚未验收。
- V0.9 本轮全部 JavaScript 文件通过 `node --check`，`node --test scripts/kinematics.test.mjs` 8 项通过；localhost 浏览器已验收卡片、模式、场景、关节、IK、传感器、抓取和布局刷新恢复。
- 传感器读数是简化估算，不代表真实硬件数据。

## 7. 下一步

1. Windows 桌面版采用 Electron；桌面启动时使用打包内 Three.js，浏览器版仍可通过 jsDelivr 启动。
2. GitHub Actions 在推送匹配版本的 `v*` 标签后构建 Windows x64 安装版与便携版，并上传发行附件。
3. 当前用户授权在完成测试后正式发布 v1.0.0；发布前应核验 Windows CI、产物和校验文件。

## 8. 约束与注意事项

- 遵循用户对外部发布的明确授权；当前已授权在测试通过后公开发布 v1.0.0。
- 保持六轴手动控制、关节限位、FK/IK 和抓取流程稳定；改动前先检查现有实现。
- 保留 `file://` 启动能力：不要把本地 IIFE 脚本加载改回 ES module；外部 Three.js 仍需联网。
- Electron 使用安全自定义应用协议、隔离渲染进程和本地 Three.js 资源；不启动网络监听端口，也不启用 `nodeIntegration`。
- 传感器是仿真数据，不要描述为真实硬件测量。
- 通信监视器只记录本地模拟器的工作台事件，没有真实通信接口。
- Windows 终端优先 PowerShell 7（`pwsh`）。
