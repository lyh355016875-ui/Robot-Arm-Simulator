# AI Robot Arm Simulator

[简体中文](README.md) | **English**

A 3D workbench for simulating a six-axis robot arm, with joint controls, forward/inverse kinematics, pick-and-place, and a configurable card-based UI. Current release: **v1.0.0**.

## Download the Windows desktop app

- [GitHub Release](https://github.com/lyh355016875-ui/Robot-Arm-Simulator/releases/tag/v1.0.0)
- [Windows x64 installer](https://github.com/lyh355016875-ui/Robot-Arm-Simulator/releases/download/v1.0.0/Robot-Arm-Simulator-1.0.0-win-x64.exe)
- [Windows x64 portable app](https://github.com/lyh355016875-ui/Robot-Arm-Simulator/releases/download/v1.0.0/Robot-Arm-Simulator-1.0.0-portable-x64.exe)
- [SHA-256 checksums](https://github.com/lyh355016875-ui/Robot-Arm-Simulator/releases/download/v1.0.0/SHA256SUMS.txt)

Verify a download in PowerShell (replace the filename if needed):

```powershell
Get-FileHash .\Robot-Arm-Simulator-1.0.0-win-x64.exe -Algorithm SHA256
```

Compare the result with the matching entry in `SHA256SUMS.txt`.
This checks file integrity; it does not replace code signing or authenticate the publisher.

## Features

- Six-axis joint sliders and keyboard controls with joint limits.
- Forward/inverse kinematics and end-effector pose control.
- Scene-based pick-and-place simulation.
- Workbench cards that can be moved, collapsed, hidden, resized, and saved.
- End-effector camera, distance, force/torque, and other **simulated** sensors.

> Sensors, vision, and communication events are simulated; the app does not connect to a physical robot or real sensors.

## Run and develop

The Windows desktop app bundles Three.js and requires Windows x64 plus a WebGL 2-capable GPU/driver. The browser version can be opened from `index.html`, but it loads Three.js from a CDN and therefore requires an internet connection.

Requires Node.js 22 or compatible:

```bash
npm ci
npm run desktop       # Run locally for development
npm test              # Kinematics and pick-and-place unit tests
npm run dist:win      # Build the installer and portable app on Windows
```

GitHub Actions tests and builds the Windows x64 packages, then generates SHA-256 checksums when a `v*` tag matches the version in `package.json`. New releases are uploaded as drafts for a maintainer to review and publish.

## SmartScreen and code signing

**The v1.0.0 installer and portable executable are not Authenticode-signed.** Windows SmartScreen may show “Windows protected your PC” or an unknown-publisher warning. Download only from this repository’s Release page and verify the SHA-256 checksum first. Do not disable SmartScreen to run this app.

To reduce warnings in future releases, sign every executable with a trusted code-signing identity and keep the publisher identity consistent. **Signing still does not guarantee a warning-free first run**: SmartScreen reputation takes time to build, and EV certificates no longer bypass that process automatically. Microsoft’s most reliable documented way to avoid SmartScreen download warnings is distributing an MSIX package through the Microsoft Store, which requires separate packaging and store submission. See Microsoft’s [SmartScreen reputation guidance](https://learn.microsoft.com/en-us/windows/apps/package-and-deploy/smartscreen-reputation) and [code-signing options](https://learn.microsoft.com/en-us/windows/apps/package-and-deploy/code-signing-options).

## License

[MIT](LICENSE).
