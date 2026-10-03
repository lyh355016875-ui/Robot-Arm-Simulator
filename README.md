# AI 机械臂模拟器

**简体中文** | [English](README_EN.md)

基于 Three.js 的六轴机械臂 3D 仿真器，可在浏览器或 Windows 桌面端运行。提供正/逆运动学、关节与末端控制、自动抓取、工作台配置和模拟传感器反馈。

- **当前版本：** v1.0.0
- **适用场景：** 机械臂运动学演示、交互式仿真与前端开发学习
- **重要边界：** 本项目是仿真器，不连接真实机械臂、相机或传感器

## 下载 Windows 桌面版

- [GitHub Release 页面](https://github.com/lyh355016875-ui/Robot-Arm-Simulator/releases/tag/v1.0.0)
- [Windows x64 安装版](https://github.com/lyh355016875-ui/Robot-Arm-Simulator/releases/download/v1.0.0/Robot-Arm-Simulator-1.0.0-win-x64.exe)
- [Windows x64 便携版](https://github.com/lyh355016875-ui/Robot-Arm-Simulator/releases/download/v1.0.0/Robot-Arm-Simulator-1.0.0-portable-x64.exe)
- [SHA-256 校验清单](https://github.com/lyh355016875-ui/Robot-Arm-Simulator/releases/download/v1.0.0/SHA256SUMS.txt)

在 PowerShell 中核验下载文件：

```powershell
Get-FileHash .\Robot-Arm-Simulator-1.0.0-win-x64.exe -Algorithm SHA256
```

将结果与 `SHA256SUMS.txt` 中相同文件名对应的哈希比较。

## 界面导览

### 主工作台：关节控制与机器人状态

![六轴机械臂主工作台，展示关节滑块、3D 场景与末端姿态反馈](docs/screenshots/desktop-workbench.png)

左侧控制六个关节，右侧显示末端 XYZ 坐标与 Rx/Ry/Rz 姿态；中间为可旋转、缩放和平移的 3D 场景。

### 自动抓取：任务、工件与工作台

![自动抓取工作台，展示任务管理器、目标物配置和仿真工件](docs/screenshots/desktop-grab-task.png)

可生成待抓取工件，查看任务状态和日志，并配置目标物的类型、数量、颜色与位置。

### 末端目标：交互式逆运动学

![逆运动学控制界面，展示目标位姿输入、场景目标球和求解状态](docs/screenshots/desktop-ik-control.png)

输入目标位置与姿态，或在场景中拖动目标球；程序计算关节解并插值移动到目标附近。

### 传感器监视：可视化模拟遥测

![传感器监视界面，展示末端相机视图、距离、力矩和关节状态](docs/screenshots/desktop-sensor-monitor.png)

可观察机械臂末端相机、距离读数、力/力矩估算值及各关节状态。所有读数均由仿真场景和简化模型计算。

### 工作台配置：卡片与模式

![工作台配置界面，展示目标物设置、卡片显隐与工作台模式管理](docs/screenshots/desktop-workspace-settings.png)

可按需显示控制、状态、IK、任务和监视卡片，并切换操作、调试、监控或极简模式。

> 截图在虚拟软件渲染环境中采集，画面角落的 FPS 数值不代表一般用户设备上的性能。

## 功能与操作

| 功能 | 使用方式 | 说明 |
| --- | --- | --- |
| 六轴关节控制 | 拖动 J1–J6 滑块，或使用键盘微调 | 角度受每个关节的限位约束 |
| 键盘控制 | J1：A/D；J2：S/W；J3：F/R；J4：G/T；J5：H/Y；J6：J/U | 按住 `Shift` 可按 10° 微调 |
| 场景视角 | 左键拖动旋转、滚轮缩放、右键拖动平移 | 控制 Three.js 场景相机 |
| 末端目标控制 | 输入 X/Y/Z 和 RX/RY/RZ，或拖动场景目标球 | 位置单位为米；界面姿态角单位为度 |
| 自动抓取与放置 | 先生成目标工件，再启动自动抓取 | 状态依次经过 `SCAN`、`MOVE`、`GRAB`、`PLACE` |
| 工作台布局 | 拖动、缩放、折叠或隐藏卡片；在菜单中保存布局 | 布局保存在当前应用的浏览器存储中 |
| 场景配置 | 选择工作台、目标物类型、数量、位置和颜色 | 支持方块、球体、圆柱及自定义工件 |
| 监控 | 打开数据、事件和传感器卡片 | 数据仅用于仿真观察与开发调试 |

**停止和恢复：** 若机械臂尚未夹住工件，可停止当前运动；若已在放置阶段，程序会先完成当前放置再停止。遇到无法自动放置的异常时，夹爪可能保留工件，可使用“安全放置”操作恢复。

## 工作原理

### 系统架构

浏览器和 Electron 桌面版共用同一套 HTML、JavaScript 与 Three.js 场景。`src/main.js` 负责装配对象和驱动动画循环；控制器连接运动学、机械臂模型与用户界面。

![系统架构图：浏览器和 Electron 入口共用渲染、模型、运动学、控制器和工作台 UI](docs/architecture.png)

架构图的[可编辑 Mermaid 源文件](docs/architecture.mmd)也保存在仓库中。

### 自动抓取流程

![自动抓取状态流程图：从扫描、逆解和抓取到放置与异常恢复](docs/pick-place-flow.png)

流程图的[可编辑 Mermaid 源文件](docs/pick-place-flow.mmd)可用于后续维护。简要过程：扫描待抓取工件 → 求解接近和抓取位姿 → 闭合夹爪 → 求解放置位 → 放置并继续扫描。不可达目标会被跳过；正常放置位不可达时会尝试安全位置。

## 代码地图

| 路径 | 职责 | 常见修改场景 |
| --- | --- | --- |
| `index.html` | 浏览器入口、基础面板、Three.js 加载引导 | 修改基础控制卡片、启动资源或页面结构 |
| `electron/main.cjs` | Electron 主进程、自定义 `robotarm://` 协议和窗口安全设置 | 修改桌面入口或静态资源访问方式 |
| `electron/preload.cjs` | 向隔离页面提供最小桌面能力 | 扩展渲染页面可访问的桌面接口 |
| `src/main.js` | 初始化场景、机器人、控制器、面板与主动画循环 | 调整模块装配和每帧更新顺序 |
| `src/scene.js`、`camera.js`、`renderer.js` | Three.js 场景、相机、轨道控制和渲染器 | 修改灯光、视角、阴影或渲染参数 |
| `src/robot/` | 关节、连杆、末端夹爪、机械臂层级和工作台工件 | 调整机器人几何、关节轴、工件或夹持行为 |
| `src/kinematics/` | 矩阵工具、正运动学 FK、逆运动学 IK | 修改位姿变换、关节限位或求解收敛参数 |
| `src/controller/` | 关节、键盘、目标位姿、抓取状态机和姿态显示 | 增加控制行为或修改任务流程 |
| `src/RobotSensors.js` | 末端相机、距离、力/力矩和关节状态模拟 | 扩展传感器模型或监视数据 |
| `src/ui/` | 卡片、布局持久化、菜单、工作台模式和监视器 | 添加 UI 卡片、预设布局或工作台模式 |
| `scripts/kinematics.test.mjs` | FK、IK 和抓取状态机自动测试 | 修改运动学或任务状态时增加回归测试 |
| `.github/workflows/windows-release.yml` | 标签触发的测试、Windows 构建及草稿 Release | 修改 CI 或发行流程 |

### 目录结构

```text
.
├── assets/                         # 静态资源
├── docs/
│   ├── architecture.mmd / .png     # 系统架构图及可编辑源文件
│   ├── pick-place-flow.mmd / .png  # 抓取流程图及可编辑源文件
│   └── screenshots/                # README 中的真实界面截图
├── electron/
│   ├── main.cjs                    # Electron 主进程
│   └── preload.cjs                 # 隔离预加载脚本
├── scripts/
│   ├── serve.mjs                   # 本地浏览器开发服务器
│   └── kinematics.test.mjs         # 自动化测试
├── src/
│   ├── controller/
│   ├── kinematics/
│   ├── robot/
│   ├── ui/
│   ├── RobotSensors.js
│   ├── camera.js / renderer.js
│   ├── main.js / scene.js
│   └── styles.css
├── index.html
├── package.json / package-lock.json
└── .github/workflows/windows-release.yml
```

## 核心设计说明

### 坐标、单位和 FK/IK

- 场景位置使用**米**；面板中的 RX/RY/RZ 和关节角使用**度**。
- `forwardKinematics()`、`inverseKinematics()` 的关节角和姿态角参数使用**弧度**。界面控制器负责在度与弧度之间转换。
- FK 的变换顺序必须与 `src/robot/RobotArm.js` 中的 `Object3D` 父子层级和关节轴保持一致。
- IK 使用带阻尼的数值雅可比迭代，检查六个关节限位，并返回是否收敛、位置误差、姿态误差和迭代次数。对不可达目标，应在 UI 中检查误差，而不是只看是否返回了一组角度。

### 动画循环与控制器

`src/main.js` 的循环逐帧更新相机控制、目标运动、抓取状态机、传感器与监视面板，然后渲染场景；单帧 `delta` 有上限，以避免卡顿时模拟时间突然跳变。修改控制器时，应保留取消操作和异步任务失效保护，避免旧任务结果覆盖用户的新操作。

### 卡片和布局

- 基础机器人、IK 与传感器卡片位于 `index.html`；任务、场景设置和监视卡片由 `WorkspaceManager` 创建。
- 新卡片需要稳定的 `data-card-id`；同时检查 `WorkspaceManager.js` 的卡片清单、菜单和工作台管理项。
- 在 `LayoutManager.js` 中为默认、操作、调试和极简预设配置位置、尺寸及显隐状态。
- 卡片位置与工作台模式保存在 `localStorage`。如果更改保存结构，应考虑已有用户数据的兼容和恢复默认行为。

## 本地开发

### 环境要求

- Node.js 22 或兼容版本及 npm。
- 浏览器运行需要支持 WebGL 2 的浏览器/显卡驱动；浏览器模式从 jsDelivr 加载 Three.js，需要网络连接。
- Windows 发行构建需要 Windows x64 环境；桌面版会打包 Three.js，不依赖 CDN 下载引擎。

### 安装和启动

```bash
git clone https://github.com/lyh355016875-ui/Robot-Arm-Simulator.git
cd Robot-Arm-Simulator
npm ci
```

浏览器开发模式：

```bash
npm run dev
```

打开终端显示的本地地址（默认 `http://127.0.0.1:8000/`）。也可以直接打开 `index.html`；如果页面不能加载 Three.js，请使用本地服务器并检查网络。

Electron 桌面开发模式：

```bash
npm run desktop
```

### 测试与构建

```bash
npm test              # FK、IK、关节限位和抓取状态机测试
npm run pack:dir      # 打包当前操作系统的应用目录
npm run dist:win      # 构建 Windows x64 安装版与便携版
```

自动化测试主要覆盖运动学和抓取状态机，不等同于完整 UI/Electron 端到端测试。修改页面、卡片、WebGL 或 Electron 启动行为后，建议额外在浏览器或桌面应用中手动走查：引擎启动、关节拖动、IK 到达/不可达、生成工件、抓取停止与布局保存/恢复。

## 后续开发建议

1. **修改运动学：** 对应更新 `src/kinematics/`，并在 `scripts/kinematics.test.mjs` 覆盖典型姿态、限位和不可达目标。
2. **修改抓取任务：** 先检查 `PickPlaceController` 的 `SCAN → MOVE → GRAB → PLACE` 转换、停止时机和夹持工件恢复路径，再调整工作台行为。
3. **添加卡片：** 明确卡片归属（HTML 静态面板或 `WorkspaceManager` 动态卡片），更新卡片清单、菜单、工作台管理项和布局预设。
4. **扩展传感器：** 将读数标注为模拟或实测；当前项目没有真实硬件驱动，不能把估算值当成设备数据。
5. **提交前验证：** 至少运行 `npm test`；涉及界面或渲染时执行一轮手动冒烟测试。

## 发行流程

推送 `v*` 标签时，GitHub Actions 会核对标签与 `package.json` 版本、安装锁定依赖、运行测试、构建 Windows x64 安装版/便携版并生成 SHA-256 清单。构建成功后先生成 **Draft Release**，由维护者检查资产与说明后再发布。

发行新版本前请同步更新 `package.json` 和 `package-lock.json`，并确保版本号与标签一致；不要仅创建标签而跳过测试与构建检查。

## 限制与边界

- 机械臂运动、碰撞/目标识别、相机画面、距离、力/力矩和通信事件均为模拟或简化估算。
- 本项目没有真实硬件驱动、安全认证或实体机械臂控制能力；不要将仿真结果用于真实设备操作或安全评估。
- IK 受模型、关节限位和数值收敛影响。不可达位姿会返回当前最佳解及误差，操作者应确认目标是否可达。
- 浏览器版依赖网络获取 Three.js；Windows 桌面版随包提供引擎资源。

## 许可证

[MIT](LICENSE)。
