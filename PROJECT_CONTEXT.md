# 项目上下文：AI 机械臂模拟器

## 1. 项目目标

开发 3D 六轴工业机械臂模拟器，支持关节控制、FK/IK、自动抓取、传感器仿真、可配置卡片式数字工作台，以及正逆运动学互动教学。提供 Windows 桌面版（Electron）与浏览器版两种形态。当前发行版本：V1.1（运动学学习）；V0.8 基线提交 `3358ca3`。

## 2. 当前目录结构

```text
Robot-Arm-Simulator/
├── index.html                 # 页面和经典脚本加载顺序
├── PROJECT_CONTEXT.md
├── README.md
├── README_EN.md
├── package.json
├── electron/                  # 桌面版主进程与预加载脚本
├── scripts/
│   ├── serve.mjs               # 可选本地服务器
│   ├── kinematics.test.mjs     # 运动学与抓取状态机测试
│   └── learning.test.mjs       # fkChain / createIKSession 测试
└── src/
    ├── ui/                     # 卡片、菜单、工作台模式和布局管理
    ├── main.js                 # 初始化和动画循环
    ├── RobotSensors.js         # 末端相机、距离/力矩/关节反馈
    ├── scene.js                # 场景
    ├── camera.js               # 主相机和轨道控制
    ├── renderer.js
    ├── styles.css
    ├── robot/                  # RobotArm、Joint、Link、EndEffector、Workbench
    ├── controller/             # 关节、键盘、姿态、目标 IK、学习、抓取流程
    │   └── LearningController.js  # V1.1 运动学学习卡片
    └── kinematics/             # forward.js（含 fkChain）、inverse.js（含 createIKSession）、matrix.js
```

## 3. 完成的功能

- 六轴机械臂模型、限位滑块/键盘控制、末端坐标与姿态反馈。
- 正运动学及带限位的阻尼最小二乘逆运动学；XYZ/RX/RY/RZ 目标输入、拖拽控制球及平滑移动。
- 工业工作台、随机方块/球体/工件、夹爪和 IDLE/SCAN/MOVE/GRAB/PLACE 自动抓取状态机，含任务日志与安全停止/放置。
- V0.8 末端视角相机、工作台距离射线、简化力/力矩估算、六轴位置/速度/力矩状态表和机器人状态面板。
- V0.9 卡片式 UI：关节、状态、IK、传感器、任务、目标设置、工作台设置、事件和数据监视卡片；Pointer Events 拖动、折叠、隐藏、尺寸调整和层级管理；布局/工作台模式/场景模式，布局保存在 `localStorage` 并在重载后恢复。
- V1.0.0 Electron 桌面封装、离线 Three.js 资源与 Windows 安装/便携版发行流程，机械臂仿真功能保持不变。
- V1.1 运动学学习卡片：
  - FK 演示：13 步平移/旋转变换链逐步讲解，含每步 4×4 累积矩阵、坐标系原点、3D 关节坐标系（AxesHelper）与青色骨架线（按当前步骤 drawRange 渐进显示）；支持点击步骤、上一步/下一步/自动播放，拖动滑块实时联动。
  - IK 演示：createIKSession 单步迭代接口，开始迭代/单步/直接求解/重置/速度（2–16 次/秒）；实时显示迭代号、位置/姿态误差、λ 阻尼；3D 末端轨迹线与目标线框球；canvas 收敛曲线（位置 cm 青色 + 姿态 ° 黄色）；手动关节操作自动暂停；收敛/停滞/最大迭代状态提示。
  - 接入卡片系统：菜单「机器人 → 运动学学习」、工作台卡片列表、四种布局预设、调试模式默认显示。

## 4. 当前版本状态

V0.9 UI 重构和浏览器验收已完成；V1.0.0 桌面版已于 2026-10-03 正式发布。V1.1 运动学学习已开发并验收完成（`node --check` 全部通过；`npm test` 15 项通过；localhost 浏览器实测 FK 步进/矩阵/骨架联动、IK 收敛（默认目标 11 次迭代收敛到 0.0 cm/0.0°）、轨迹线与曲线图、手动干扰暂停、重置、刷新布局恢复均正常）。

## 5. 关键技术

HTML/CSS/原生 JavaScript、Three.js 0.186.0、WebGL 2、OrbitControls、TransformControls。机械臂用六轴串联 `Object3D`；IK 内部用弧度，界面用角度。页面通过 `index.html` 按序加载 IIFE 经典脚本以支持 `file://` 启动；桌面版使用打包内 Three.js。自动抓取视觉、末端相机及力/力矩读数均为场景/模型仿真，不接真实传感器。学习卡片与正式求解共用 `fkChain` / `createIKSession` 同一实现，未复制算法。

## 6. 已知问题

- 浏览器版 Three.js 及控件从 jsDelivr 加载，需网络；桌面版将其打包在应用内。两种运行方式都需要支持 WebGL 2 的显卡和驱动。
- v1.0.0 已发布的 Windows 安装版和便携版均没有 Authenticode 签名（已用 `osslsigncode verify` 检查）；当前 GitHub Actions 未配置签名身份，因此可能触发 SmartScreen 未知发布者提示。未来签名须经用户选定方案并配置凭据后再发布。
- `file://` 下的 Edge 启动和显示尚未验收。
- V1.1 全部 JavaScript 文件通过 `node --check`，`npm test` 15 项通过（kinematics 8 + learning 7）；localhost 浏览器已验收学习卡片全部交互。
- 传感器读数是简化估算，不代表真实硬件数据。

## 7. 下一步

1. Windows 桌面版采用 Electron；桌面启动时使用打包内 Three.js，浏览器版仍可通过 jsDelivr 启动。
2. GitHub Actions 在推送匹配版本的 `v*` 标签后构建 Windows x64 安装版与便携版，并上传发行附件；v1.1 标签推送后即按此流程发行。
3. 新的开发工作需要用户明确指定；V1.1 止于运动学学习卡片。

## 8. 约束与注意事项

- 遵循用户对外部发布的明确授权；v1.0.0 已公开发布，后续版本仍须按用户授权操作。
- 保持六轴手动控制、关节限位、FK/IK 和抓取流程稳定；改动前先检查现有实现。
- 保留 `file://` 启动能力：不要把本地 IIFE 脚本加载改回 ES module；外部 Three.js 仍需联网。
- Electron 使用安全自定义应用协议、隔离渲染进程和本地 Three.js 资源；不启动网络监听端口，也不启用 `nodeIntegration`。
- 传感器是仿真数据，不要描述为真实硬件测量。
- 通信监视器只记录本地模拟器的工作台事件，没有真实通信接口。
- Windows 终端优先 PowerShell 7（`pwsh`）。
