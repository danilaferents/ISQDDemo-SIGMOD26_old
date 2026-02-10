import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { MODEL_URL, INIT } from '../state/config.js';
import { modelState } from '../state/AppState.js';

function scorePolyline(pts) {
  if (!pts || pts.length < 2) return 0;
  let len = 0;
  for (let i = 1; i < pts.length; i++) len += pts[i].distanceTo(pts[i - 1]);
  return len;
}

function extractOrderedCenterlineByGetter(mesh, root, binsCount, getU) {
  root.updateWorldMatrix(true, true);
  mesh.updateWorldMatrix(true, true);

  const pos = mesh.geometry.attributes.position;
  if (!pos) return null;

  const X = new THREE.Matrix4().copy(root.matrixWorld).invert().multiply(mesh.matrixWorld);

  let uMin = Infinity, uMax = -Infinity;
  for (let i = 0; i < pos.count; i++) {
    const u = getU(i);
    if (!Number.isFinite(u)) continue;
    uMin = Math.min(uMin, u);
    uMax = Math.max(uMax, u);
  }
  if (!Number.isFinite(uMin) || !Number.isFinite(uMax) || Math.abs(uMax - uMin) < 1e-9) return null;

  const invRange = 1 / (uMax - uMin);
  const bins = Array.from({ length: binsCount }, () => ({ sum: new THREE.Vector3(), n: 0 }));
  const v = new THREE.Vector3();

  for (let i = 0; i < pos.count; i++) {
    let u = getU(i);
    if (!Number.isFinite(u)) continue;
    u = (u - uMin) * invRange;
    u = Math.min(1, Math.max(0, u));
    const idx = Math.min(binsCount - 1, Math.max(0, Math.floor(u * binsCount)));

    v.set(pos.getX(i), pos.getY(i), pos.getZ(i)).applyMatrix4(X);
    bins[idx].sum.add(v);
    bins[idx].n++;
  }

  const pts = [];
  for (const b of bins) if (b.n) pts.push(b.sum.multiplyScalar(1 / b.n));

  const out = [];
  const EPS = 0.01;
  for (const pp of pts) {
    if (!out.length || out[out.length - 1].distanceTo(pp) > EPS) out.push(pp.clone());
  }

  return out.length >= 2 ? out : null;
}

function extractOrderedCenterlineAutoUV(mesh, root, binsCount = 1500) {
  const uv = mesh.geometry.attributes.uv;
  if (!uv) return null;

  const ptsX = extractOrderedCenterlineByGetter(mesh, root, binsCount, (i) => uv.getX(i));
  const ptsY = extractOrderedCenterlineByGetter(mesh, root, binsCount, (i) => uv.getY(i));

  const lx = scorePolyline(ptsX);
  const ly = scorePolyline(ptsY);

  return (ly > lx) ? ptsY : ptsX;
}

function findTrainPathMesh(root) {
  let best = null;
  root.traverse(o => {
    if (!o.isMesh) return;
    const n = (o.name || '').toLowerCase();
    if (!n.includes('trainpath')) return;
    const v = o.geometry?.attributes?.position?.count ?? 0;
    if (!best || v > (best.geometry?.attributes?.position?.count ?? 0)) best = o;
  });
  return best;
}

function countMeshes(o) { let meshes = 0; o.traverse(x => { if (x.isMesh) meshes++; }); return meshes; }

function findBestTrainContainer(root) {
  const candidates = [];
  root.traverse(o => {
    const n = (o.name || '').toLowerCase();
    if (!n) return;
    if (n === 'train' || n.includes('train')) candidates.push({ o, meshes: countMeshes(o) });
  });
  candidates.sort((a, b) => b.meshes - a.meshes);
  return candidates.length ? candidates[0].o : null;
}

export function detectForwardAxisFromBBox(objLocal) {
  const box = new THREE.Box3().setFromObject(objLocal);
  const size = new THREE.Vector3();
  box.getSize(size);

  let axis = new THREE.Vector3(1, 0, 0);
  if (size.y > size.x && size.y > size.z) axis.set(0, 1, 0);
  else if (size.z > size.x && size.z > size.y) axis.set(0, 0, 1);
  return axis;
}

export function buildVisiblePath(curve) {
  if (modelState.pathMesh && modelState.pathMesh.parent) {
    modelState.pathMesh.parent.remove(modelState.pathMesh);
    modelState.pathMesh.geometry?.dispose?.();
    modelState.pathMesh.material?.dispose?.();
    modelState.pathMesh = null;
  }

  const radius = 6;
  const tubularSegments = 600;
  const radialSegments = 8;
  const closed = false;

  const geom = new THREE.TubeGeometry(curve, tubularSegments, radius, radialSegments, closed);

  const mat = new THREE.MeshBasicMaterial({
    color: 0xff2bd6,
    transparent: true,
    opacity: 0.70,
    depthTest: true,
    depthWrite: false
  });

  modelState.pathMesh = new THREE.Mesh(geom, mat);
  modelState.pathMesh.position.z -= 10;
  modelState.pathMesh.renderOrder = -10;
  modelState.pathMesh.material.depthTest = true;
  modelState.pathMesh.material.depthWrite = false;

  return modelState.pathMesh;
}

export let modelFixedQ = new THREE.Quaternion();

export function rebuildPrototypeAndHideOriginal() {
  const { rootRef, rawTrainRef } = modelState;
  if (!rootRef || !rawTrainRef) return;

  const baked = rawTrainRef.clone(true);

  const bakedMatrix = new THREE.Matrix4()
    .copy(rootRef.matrixWorld).invert()
    .multiply(rawTrainRef.matrixWorld);

  baked.matrixAutoUpdate = false;
  baked.matrix.copy(bakedMatrix);
  baked.matrix.decompose(baked.position, baked.quaternion, baked.scale);
  baked.matrixAutoUpdate = true;
  baked.updateWorldMatrix(true, true);

  baked.position.set(0, 0, 0);
  baked.updateWorldMatrix(true, true);

  const forwardAxis = detectForwardAxisFromBBox(baked).normalize();
  modelFixedQ.setFromUnitVectors(forwardAxis, new THREE.Vector3(0, 0, 1));

  modelState.trainMeshPrototype = new THREE.Object3D();
  modelState.trainMeshPrototype.add(baked);

  rawTrainRef.visible = false;
  rawTrainRef.traverse(o => { o.visible = false; });
}

export function loadModel(scene, controls, onLoaded) {
  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/libs/draco/');
  const loader = new GLTFLoader();
  loader.setDRACOLoader(dracoLoader);

  loader.load(MODEL_URL, (gltf) => {
    modelState.rootRef = gltf.scene;
    scene.add(modelState.rootRef);

    controls.target.copy(INIT.target);
    controls.update();

    modelState.rootRef.position.copy(INIT.modelPos);
    modelState.rootRef.updateWorldMatrix(true, true);

    const trainPathMeshRef = findTrainPathMesh(modelState.rootRef);
    if (!trainPathMeshRef) return;

    trainPathMeshRef.visible = false;

    const pts = extractOrderedCenterlineAutoUV(trainPathMeshRef, modelState.rootRef, 1500);
    if (!pts) return;

    modelState.pathCurve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
    modelState.rootRef.add(buildVisiblePath(modelState.pathCurve));

    modelState.rawTrainRef = findBestTrainContainer(modelState.rootRef);
    if (!modelState.rawTrainRef) return;

    rebuildPrototypeAndHideOriginal();

    if (onLoaded) onLoaded();
  });
}
