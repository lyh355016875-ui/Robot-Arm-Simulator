# AI 机械臂模拟器

《AI 机械臂模拟器》是运行在浏览器中的 3D 机器人实验平台。当前版本为 **V0.4 六轴工业机械臂**：重构为由独立 Three.js Object3D 关节和工业连杆组成的六自由度串联结构，六个滑块控制各自关节并实时显示角度。

## 项目结构

Robot-Arm-Simulator/
├── src/
│   ├── main.js
│   ├── scene.js
│   ├── camera.js
│   ├── renderer.js
│   ├── robot/
│   │   ├── RobotArm.js    # 六轴机器人和串联层级
│   │   ├── Joint.js       # 关节旋转轴、角度限制和外壳
│   │   ├── Link.js        # 金属连杆模型
│   │   ├── EndEffector.js # 末端夹爪
│   │   └── controller.js  # 六轴滑块和角度读数
│   └── styles.css
├── assets/
├── scripts/
├── index.html
├── package.json
└── README.md

## 六轴机械臂层级

Robot → Base → Joint1 → Link1 → Joint2 → Link2 → Joint3 → Link3 → Joint4 → Joint5 → Joint6 → EndEffector

六个关节是独立 Object3D，各自定义旋转轴、当前角度和最小/最大角度。父关节旋转会带动下游连杆和末端工具。控制面板可实时调节底座旋转、肩部俯仰、肘部旋转、腕部旋转、腕部俯仰和末端旋转。

当前版本实现正向层级旋转控制，不包含逆运动学（IK）。

## 运行方式

需要安装 Node.js，并保持网络连接以从 jsDelivr 加载固定版本的 Three.js 和 OrbitControls。在项目目录执行 npm run dev，然后在浏览器打开 http://127.0.0.1:8000/。也可以直接运行 node scripts/serve.mjs。

建议使用启用了 WebGL 2 的现代桌面浏览器。

## 技术

- HTML5、CSS、原生 JavaScript ES Modules
- Three.js 0.186.0、WebGL 2、OrbitControls
- 六自由度 Object3D 关节层级、金属材质和实时阴影
