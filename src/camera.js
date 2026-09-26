import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export function createCamera(viewport) {
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 180);
  camera.position.set(8, 7, 10.8);
  camera.lookAt(0.55, 1.55, 0);

  const controls = new OrbitControls(camera, viewport);
  controls.target.set(0.55, 1.55, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.065;
  controls.minDistance = 3.5;
  controls.maxDistance = 36;
  controls.maxPolarAngle = Math.PI * 0.49;
  controls.update();

  return { camera, controls };
}

