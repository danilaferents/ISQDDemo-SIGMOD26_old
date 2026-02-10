import * as THREE from 'three';

export const MODEL_URL = 'models/gltf/Berlin.glb';
export const MAX_PIXEL_RATIO = 1.5;

export const INIT = {
  target: new THREE.Vector3(214, 0, -5000),
  modelPos: new THREE.Vector3(734, -3291, -419),
  cam: { dist: 7800, yaw: 0, elev: -43 }
};

export const DEBUG = {
  showTrainSettings: false,
};

export const Y_MIN = 10;
export const Y_MAX = 1e4;
export const LOG_MIN = Math.log10(Y_MIN);
export const LOG_MAX = Math.log10(Y_MAX);

export const SUPER = { 1: '\u00B9', 2: '\u00B2', 3: '\u00B3', 4: '\u2074' };
