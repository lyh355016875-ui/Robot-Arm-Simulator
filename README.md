# AI 机械臂模拟器

**简体中文** | [English](README_EN.md)

六轴机械臂 3D 仿真工作台，支持关节控制、正/逆运动学、自动抓取和可配置卡片界面。当前发行版：**V1.0.0**。

## 下载 Windows 桌面版

- [GitHub Release 页面](https://github.com/lyh355016875-ui/Robot-Arm-Simulator/releases/tag/v1.0.0)
- [Windows x64 安装版](https://github.com/lyh355016875-ui/Robot-Arm-Simulator/releases/download/v1.0.0/Robot-Arm-Simulator-1.0.0-win-x64.exe)
- [Windows x64 便携版](https://github.com/lyh355016875-ui/Robot-Arm-Simulator/releases/download/v1.0.0/Robot-Arm-Simulator-1.0.0-portable-x64.exe)
- [SHA-256 校验清单](https://github.com/lyh355016875-ui/Robot-Arm-Simulator/releases/download/v1.0.0/SHA256SUMS.txt)

下载后可在 PowerShell 中校验文件（将文件名替换为实际下载的版本）：

```powershell
Get-FileHash .\Robot-Arm-Simulator-1.0.0-win-x64.exe -Algorithm SHA256
```

将输出与 `SHA256SUMS.txt` 中对应的哈希比较。

## 项目目录

```text
.
├── assets/                 # 静态资源
├── docs/screenshots/       # README 界面截图
├── electron/               # 桌面主进程与 preload
├── scripts/                # 本地服务器与自动化测试
├── src/
│   ├── controller/         # 关节、目标姿态与抓取控制
│   ├── kinematics/         # 正/逆运动学与矩阵工具
│   ├── robot/              # 机械臂、关节、连杆、夹爪与工作台
│   ├── ui/                 # 卡片、布局、菜单与工作台模式
│   └── main.js、scene.js、renderer.js、camera.js、RobotSensors.js
├── index.html              # 浏览器版入口
└── package.json            # 依赖、脚本与桌面打包配置
```

## 功能

- 六轴关节滑块和键盘控制，带关节角度限制。
- 正运动学、逆运动学和末端位姿控制。
- 基于场景仿真的抓取/放置状态机。
- 可移动、折叠、隐藏、缩放并保存的工作台卡片。
- 末端相机、距离、力/力矩等**模拟**传感器面板。

> 传感器、视觉检测和通信事件均为仿真，不连接真实机械臂或真实传感器。

## 界面截图

![Windows 桌面版主工作台：六轴关节控制、机器人状态与 3D 场景](docs/screenshots/desktop-workbench.png)

主工作台展示机械臂三维场景、关节控制面板和实时位姿状态。

![自动抓取场景：任务管理、目标物设置与机械臂工作台](docs/screenshots/desktop-grab-task.png)

抓取视图展示任务状态、目标物设置，以及工作台上的仿真工件。
截图在虚拟软件渲染环境中采集，界面角落的 FPS 数值不代表一般用户设备上的运行表现。

## 技术栈

- **浏览器端：** HTML、CSS、原生 JavaScript、Three.js 0.186.0、WebGL 2。
- **桌面端：** Electron 44；隔离渲染进程、preload 与本地应用协议，Three.js 随应用打包。
- **测试与发行：** Node.js 内置测试运行器；GitHub Actions 构建 Windows x64 安装版、便携版及 SHA-256 清单。

## 运行与开发

Windows 桌面版将 Three.js 随应用打包；需要 Windows x64 和支持 WebGL 2 的显卡/驱动。浏览器版可直接打开 `index.html`，但 Three.js 从 CDN 加载，需要互联网。

需要 Node.js 22 或兼容版本：

```bash
npm ci
npm run desktop       # 本机开发启动
npm test              # 运动学与抓取单元测试
npm run dist:win      # 在 Windows 上构建安装版和便携版
```

GitHub Actions 会在推送与 `package.json` 版本一致的 `v*` 标签后运行测试、构建 Windows x64 发行文件并生成 SHA-256 清单；新版本先上传为草稿 Release，之后需由维护者发布。

## 许可证

[MIT](LICENSE)。
