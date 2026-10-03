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
哈希比对用于检查文件完整性，不能代替代码签名或证明发布者身份。

## 功能

- 六轴关节滑块和键盘控制，带关节角度限制。
- 正运动学、逆运动学和末端位姿控制。
- 基于场景仿真的抓取/放置状态机。
- 可移动、折叠、隐藏、缩放并保存的工作台卡片。
- 末端相机、距离、力/力矩等**模拟**传感器面板。

> 传感器、视觉检测和通信事件均为仿真，不连接真实机械臂或真实传感器。

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

## 关于 SmartScreen

**V1.0.0 的安装版和便携版均未进行 Authenticode 代码签名。** Windows SmartScreen 可能显示“Windows 已保护你的电脑”或未知发布者提示。请仅从本仓库 Release 下载，并先核对 SHA-256；不要为了运行本软件而关闭系统 SmartScreen 防护。

降低未来版本警告的办法是用可信代码签名身份对每个发布版的程序文件持续签名，并保持发布者身份一致。**签名也不保证新应用首次运行完全无提示**：SmartScreen 仍需建立文件或发布者信誉；EV 证书已不再自动绕过这段信誉建立过程。微软文档列出的最可靠免 SmartScreen 下载警告方案是通过 Microsoft Store 分发 MSIX 包（需另行适配并通过商店流程）。详见 [SmartScreen 信誉说明](https://learn.microsoft.com/en-us/windows/apps/package-and-deploy/smartscreen-reputation) 和[代码签名选项](https://learn.microsoft.com/en-us/windows/apps/package-and-deploy/code-signing-options)。

## 许可证

[MIT](LICENSE)。
