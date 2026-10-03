# AI 机械臂模拟器

《AI 机械臂模拟器》是 3D 机器人数字工作台，当前发行版本为 **V1.0.0 Windows 桌面版**。本次将 V0.9 可配置卡片式工作台封装为独立桌面应用，保留六轴正逆运动学、抓取和传感器仿真，并支持卡片移动、折叠、隐藏、调整大小以及布局保存；浏览器版本仍可直接双击 `index.html` 启动。

## 项目结构

```text
Robot-Arm-Simulator/
├── src/
│   ├── ui/                     # 卡片、菜单、工作台模式和布局管理
│   ├── main.js              # 页面启动和动画循环
│   ├── camera.js            # 摄像机与轨道控制
│   ├── renderer.js          # WebGL 渲染器
│   ├── scene.js             # 场景、灯光和地面
│   ├── styles.css
│   ├── RobotSensors.js      # 末端相机与模拟传感器读数
│   ├── robot/
│   │   ├── RobotArm.js        # 六轴模型、层级和末端姿态计算
│   │   ├── Joint.js           # 关节轴、角度限制和模型
│   │   ├── Link.js            # 金属连杆模型
│   │   ├── EndEffector.js     # 可开合夹爪与工具坐标点
│   │   └── Workbench.js       # 工业工作台、随机工件和虚拟视觉相机
│   ├── controller/
│   │   ├── JointController.js # 六个滑块与角度同步
│   │   ├── KeyboardController.js # 键盘关节微调
│   │   ├── PoseDisplay.js     # 末端 XYZ 与 Rx/Ry/Rz 显示
│   │   ├── TargetController.js # 目标球、逆解和关节动画
│   │   └── PickPlaceController.js # IDLE/SCAN/MOVE/GRAB/PLACE 状态机
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

面板显示末端工具点的世界坐标 X/Y/Z（米），以及按 XYZ 欧拉角表示的方向 Rx/Ry/Rz（度）。数据在任一关节角改变后立即更新。在 IK 卡片输入 XYZ 与 Rx/Ry/Rz，或拖动场景中的青色目标球；机械臂会求解并平滑移动到该位姿。超出工作范围时会移动到当前最佳近似解并显示误差。目标球的坐标轴显示目标姿态。关节角度显示最多保留六位小数。

## 运动学与测试

正运动学和逆运动学使用与模型相同的关节轴、连杆偏移和末端工具长度。逆解以弧度计算，内部使用数值雅可比和阻尼最小二乘法，并在每轮迭代应用六个关节的限位。

在安装 Node.js 的环境中运行 `npm test` 执行运动学和抓取状态机单元测试。

## 自动抓取

工作台会随机生成方块、球体和加工件。点击“开始抓取”后，系统按 IDLE → SCAN → MOVE → GRAB → PLACE 执行：虚拟视觉相机用投影与射线检测可见工件，IK 规划抓取和放置位姿，夹爪闭合后将工件附着到末端，随后放入托盘。任务面板显示当前状态和最近的操作日志；可以停止任务，若工件仍在夹爪中，可选择安全放置到托盘。

当前“视觉检测”是基于 Three.js 场景几何的模拟传感器，不使用真实摄像头图像或机器学习模型。

## 机器人状态与传感器

打开“机器人状态与传感器”面板可查看安装在末端工具上的相机画面、面向工具前方的距离读数、简化力/力矩估值，以及六个关节的位置（度）、速度（度/秒）和估算力矩（牛顿·米）。机器人状态会显示 READY、HOLDING 或当前自动任务状态。所有传感器数据由场景和简化动力学模型计算，不来自真实硬件。

## V0.9 卡片工作台

顶部菜单提供文件、视图、工作台、机器人、场景、工具和设置入口。工作台菜单可勾选卡片、显示全部或隐藏全部，也可切换 Default / Control / Debug / Minimal Layout、恢复默认、保存或加载布局。界面会自动保存当前状态到浏览器 `localStorage` 并在刷新后恢复；“保存布局”另存一个可通过“加载布局”恢复的工作台快照。

卡片标题栏可拖动和置顶；按 `− / +` 折叠和展开；按 `×` 隐藏，再从工作台卡片列表重新打开。拖动右下角手柄调整尺寸。默认只显示机器人控制和机器人状态。

视图菜单提供操作、调试、监控和极简模式。场景菜单提供基础、工业、实验、空白工作台，以及无目标物、单目标、多目标、随机目标和抓取任务。目标物设置卡片支持形状、数量、颜色、位置和是否可抓取；工作台设置卡片支持尺寸、网格、坐标轴、碰撞辅助和地面显示。

通信监视器显示本地模拟器事件，不连接真实控制器或网络通信链路。自动抓取仍通过任务管理器卡片控制。

## 运行方式

**直接运行：** 双击项目根目录的 `index.html`。页面会从 jsDelivr 加载 Three.js 0.186.0、OrbitControls 和 TransformControls，因此这种方式需要互联网连接；无需安装 npm 包或启动本地服务器。

**本地服务器方式：** 安装 Node.js 后，在项目目录运行 `node scripts/serve.mjs`，再打开 <http://127.0.0.1:8000/>；也可以运行 `npm run dev`。本地服务器方式同样需要联网加载 Three.js。

建议使用启用了 WebGL 2 和硬件加速的现代浏览器。

## 技术

- HTML5、CSS、原生 JavaScript（兼容双击打开的经典脚本）
- Three.js 0.186.0、WebGL 2、OrbitControls、TransformControls
- 六自由度 `Object3D` 关节层级、限位 IK 和末端世界姿态反馈

## Windows 桌面版（V1.0.0）

项目可通过 Electron 封装为 Windows 桌面应用。桌面版使用随程序打包的 Three.js，不需要从 CDN 下载引擎；浏览器版的启动方式不变。桌面程序通过 Electron 安全本地协议读取应用资源，不启动网络监听端口；工作台布局可在不同启动间保存在稳定的应用来源下，并关闭渲染进程 Node.js 集成。

### 本地开发与构建

需要 Node.js 22 或兼容版本：

```bash
npm ci
npm run desktop       # 本机开发启动
npm test              # 运动学与抓取测试
npm run pack:dir      # 打包当前操作系统目录，用于检查打包配置
npm run dist:win      # 在 Windows 上构建 x64 安装版和便携版
```

Windows 发行版包含可选择安装目录并创建快捷方式的安装程序，以及无需安装的便携版。应用仍需要具备 WebGL 2 的显卡和驱动；首次运行时 Windows SmartScreen 可能显示下载来源警告，可使用发布页的 SHA-256 校验文件核对安装包。

### v1.0.0 下载

- [GitHub Release 页面](https://github.com/lyh355016875-ui/Robot-Arm-Simulator/releases/tag/v1.0.0)
- [Windows x64 安装版](https://github.com/lyh355016875-ui/Robot-Arm-Simulator/releases/download/v1.0.0/Robot-Arm-Simulator-1.0.0-win-x64.exe)
- [Windows x64 便携版](https://github.com/lyh355016875-ui/Robot-Arm-Simulator/releases/download/v1.0.0/Robot-Arm-Simulator-1.0.0-portable-x64.exe)
- [SHA-256 校验清单](https://github.com/lyh355016875-ui/Robot-Arm-Simulator/releases/download/v1.0.0/SHA256SUMS.txt)

### GitHub Releases

`.github/workflows/windows-release.yml` 在推送与 `package.json` 版本一致的 `v*` 标签后，运行运动学测试并构建两个 `.exe`，计算 SHA-256 校验值，然后上传为 GitHub Release。当前发行版本为 `1.0.0`，使用 `v1.0.0` 标签触发构建。
