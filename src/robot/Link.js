(function (global) {
  'use strict';
  global.RobotArmSimulator = global.RobotArmSimulator || {};
  const app = global.RobotArmSimulator;

  const THREE = global.THREE;
  const LINK_MATERIAL = new THREE.MeshStandardMaterial({ color: '#7792a8', metalness: 0.66, roughness: 0.28 });
  const PANEL_MATERIAL = new THREE.MeshStandardMaterial({ color: '#c3d2dd', metalness: 0.72, roughness: 0.24 });
  const DARK_MATERIAL = new THREE.MeshStandardMaterial({ color: '#26394c', metalness: 0.8, roughness: 0.32 });
  const ACCENT_MATERIAL = new THREE.MeshStandardMaterial({
    color: '#43c8d8',
    metalness: 0.62,
    roughness: 0.23,
    emissive: '#0a3138',
    emissiveIntensity: 0.35,
  });

  function addBox(parent, name, size, position, material) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
    mesh.name = name;
    mesh.position.set(...position);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
  }

  class Link {
    constructor({ name, length, width = 0.38, depth = 0.44, direction = 'x' }) {
      if (!name || !Number.isFinite(length) || length <= 0) throw new TypeError('连杆名称和长度必须有效。');
      if (!['x', 'y'].includes(direction)) throw new TypeError('不支持的连杆方向：' + direction);

      this.name = name;
      this.length = length;
      this.direction = direction;
      this.object3D = new THREE.Group();
      this.object3D.name = name;

      const alongX = direction === 'x';
      const center = alongX ? [length / 2, 0, 0] : [0, length / 2, 0];
      const beamSize = alongX ? [length, width, depth] : [width, length, depth];
      addBox(this.object3D, name + ' Main Beam', beamSize, center, LINK_MATERIAL);

      if (alongX) {
        addBox(this.object3D, name + ' Top Cover', [length * 0.65, 0.075, depth * 1.08], [length * 0.5, width * 0.68, 0], PANEL_MATERIAL);
        addBox(this.object3D, name + ' Status Rail', [length * 0.5, 0.035, 0.045], [length * 0.48, width * 0.9, depth * 0.52], ACCENT_MATERIAL);
        addBox(this.object3D, name + ' Root Collar', [0.18, width * 1.2, depth * 1.18], [0.08, 0, 0], DARK_MATERIAL);
        addBox(this.object3D, name + ' Tip Collar', [0.14, width * 1.18, depth * 1.16], [length - 0.06, 0, 0], DARK_MATERIAL);
      } else {
        addBox(this.object3D, name + ' Front Panel', [width * 0.55, length * 0.72, 0.045], [0, length * 0.51, depth * 0.54], PANEL_MATERIAL);
        addBox(this.object3D, name + ' Indicator Strip', [0.035, length * 0.54, 0.025], [width * 0.72, length * 0.5, depth * 0.59], ACCENT_MATERIAL);
        addBox(this.object3D, name + ' Root Collar', [width * 1.2, 0.16, depth * 1.18], [0, 0.08, 0], DARK_MATERIAL);
        addBox(this.object3D, name + ' Tip Collar', [width * 1.2, 0.14, depth * 1.16], [0, length - 0.06, 0], DARK_MATERIAL);
      }
    }
  }
  app.Link = Link;
})(window);
