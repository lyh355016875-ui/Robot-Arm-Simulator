# AI 机械臂模拟器

《AI 机械臂模拟器》是运行在浏览器中的 3D 机器人实验平台。当前版本为 **V0.2 三维机械臂系统**：在 V0.1 场景框架上加入了由 Three.js `Object3D` 层级驱动的三自由度机械臂、金属材质、实时阴影、世界及关节坐标轴，并可通过面板调节三个转动关节。

## 项目结构

```text
Robot-Arm-Simulator/
├── src/
│   ├── main.js       # 应用入口、关节控制与 FPS 动画循环
│   ├── scene.js      # 场景、光源与网格地面
│   ├── camera.js     # 透视摄像机与 OrbitControls
│   ├── renderer.js   # WebGL 渲染器与尺寸适配
│   ├── robotArm.js   # 机械臂模型与 Object3D 层级
│   └── styles.css    # 实验平台界面
├── assets/           # 模型、纹理等静态资源
├── scripts/
│   └── serve.mjs     # Node.js 内置模块开发服务器
├── index.html
├── package.json
└── README.md
```

## 机械臂层级

```text
Base
└── Joint1（底座旋转）
    └── Arm1（立柱连杆）
        └── Joint2（肩部俯仰）
            └── Arm2（前臂连杆）
                └── Joint3（腕部俯仰）
                    └── EndEffector（夹爪）
```

子对象随父关节一起变换。场景中的角度面板可交互调节 J1、J2、J3；拖动视口可旋转相机，滚轮缩放，右键拖动平移。

## 运行方式

需要安装 Node.js，并保持网络连接以从 jsDelivr 加载固定版本的 Three.js 和 OrbitControls。在项目目录执行：

```powershell
npm run dev
```

然后在浏览器打开 `http://127.0.0.1:8000/`。也可以直接运行 `node scripts/serve.mjs`。需要更换端口时，可在 PowerShell 中运行 `$env:PORT = 8080; npm run dev`。

建议使用启用了 WebGL 2 的现代桌面浏览器。

## 技术

- HTML5、CSS、原生 JavaScript ES Modules
- Three.js 0.186.0、WebGL 2、OrbitControls
- `Object3D` 关节层级与 MeshStandardMaterial 金属表面
- DirectionalLight 阴影与 HemisphereLight / DirectionalLight 补光
