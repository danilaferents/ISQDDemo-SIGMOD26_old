import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { MAX_PIXEL_RATIO, INIT } from '../state/config.js';

export const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, MAX_PIXEL_RATIO));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.setClearColor(0x000000, 0);
document.getElementById('container').appendChild(renderer.domElement);

export const scene = new THREE.Scene();
scene.background = null;

export const overlayGroup = new THREE.Group();
scene.add(overlayGroup);

export const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 300000);
camera.position.set(0, 600, 900);

export const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.enablePan = true;
controls.screenSpacePanning = true;
controls.zoomSpeed = 1.0;
controls.panSpeed = 0.9;
controls.rotateSpeed = 0.7;
controls.minPolarAngle = 0.05;
controls.maxPolarAngle = Math.PI - 0.05;

scene.add(new THREE.HemisphereLight(0xffffff, 0x2a1a44, 1.8));
scene.add(new THREE.AmbientLight(0xffffff, 0.45));
const sun = new THREE.DirectionalLight(0xffffff, 1.25);
sun.position.set(2000, 4000, 1000);
scene.add(sun);

export function setOrbitView(target, distance, yawDeg, elevationDeg) {
  const yaw = THREE.MathUtils.degToRad(yawDeg);
  const elevClampedDeg = THREE.MathUtils.clamp(elevationDeg, -89.5, 89.5);
  const elev = THREE.MathUtils.degToRad(elevClampedDeg);
  const phi = THREE.MathUtils.degToRad(90) - elev;

  const offset = new THREE.Vector3().setFromSphericalCoords(distance, phi, yaw);
  camera.position.copy(target).add(offset);
  camera.lookAt(target);
  controls.target.copy(target);
  controls.update();
}

export function handleResize() {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, MAX_PIXEL_RATIO));
}
