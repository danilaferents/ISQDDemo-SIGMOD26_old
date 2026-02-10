import * as THREE from 'three';
import { modelState, trains, trainData } from '../state/AppState.js';
import { overlayGroup } from './ThreeScene.js';
import { modelFixedQ } from './ModelLoader.js';
import { normalized01 } from '../utils/mathHelpers.js';

const EDGE = {
  centers: [],
  height: 650,
  radius: 10,
  lateralOffset: 320,
  alongOffset: 90,
  arrowTargetMix: 0.75,
  arrowEndLift: 120,
  arrowStopGap: 70,
};

export { EDGE };

const trainConnections = [];

const _tmpA = new THREE.Vector3();
const _tmpB = new THREE.Vector3();
const _tmpDir = new THREE.Vector3();
const _tmpQuat = new THREE.Quaternion();
const columnRaycaster = new THREE.Raycaster();
const MAP_UP_LOCAL = new THREE.Vector3(0, 0, 1);
const _tmpWorldUp = new THREE.Vector3();
const _tmpW = new THREE.Vector3();
const _tmpLocal = new THREE.Vector3();
const _tmpQ = new THREE.Quaternion();

function makeOrangeArrow() {
  const g = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ color: 0xff8a00, transparent: true, opacity: 1.0 });

  const shaftGeom = new THREE.CylinderGeometry(4.6, 4.6, 1, 10, 1, false);
  const shaft = new THREE.Mesh(shaftGeom, mat);
  shaft.position.y = 0.5;
  g.add(shaft);

  const headGeom = new THREE.ConeGeometry(16, 44, 14, 1, false);
  const head = new THREE.Mesh(headGeom, mat);
  head.position.y = 1;
  g.add(head);

  g.visible = false;
  g.renderOrder = 25;

  return { group: g, shaft, head, headLen: 44 };
}

export function setMapOverlayVisible(visible) {
  EDGE.centers.forEach(m => { if (m) m.visible = !!visible; });
  trainConnections.forEach(c => { if (c?.arrowGroup) c.arrowGroup.visible = !!visible; });
}

export function clearEdgeCenters() {
  for (const m of EDGE.centers) {
    if (m.parent) m.parent.remove(m);
    m.geometry?.dispose?.();
    m.material?.dispose?.();
  }
  EDGE.centers.length = 0;
}

export function clearTrainArrows() {
  for (const c of trainConnections) {
    if (c?.arrowGroup?.parent) c.arrowGroup.parent.remove(c.arrowGroup);
    c?.shaft?.geometry?.dispose?.();
    c?.head?.geometry?.dispose?.();
    c?.shaft?.material?.dispose?.();
  }
  trainConnections.length = 0;
}

export function buildEdgeCenters(count) {
  const { rootRef, pathCurve } = modelState;
  if (!rootRef || !pathCurve) return;

  clearEdgeCenters();

  const baseMat = new THREE.MeshStandardMaterial({
    color: 0x1f5cff,
    emissive: 0x1336aa,
    emissiveIntensity: 0.55,
    metalness: 0.15,
    roughness: 0.35,
    transparent: true,
    opacity: 0.95,
  });

  const geom = new THREE.CylinderGeometry(EDGE.radius, EDGE.radius, EDGE.height, 10, 1, false);
  geom.rotateX(Math.PI / 2);

  const tan = new THREE.Vector3();
  const right = new THREE.Vector3();

  rootRef.getWorldQuaternion(_tmpQ);
  _tmpWorldUp.copy(MAP_UP_LOCAL).applyQuaternion(_tmpQ).normalize();

  for (let i = 0; i < count; i++) {
    const u = (i + 0.5) / count;

    pathCurve.getPointAt(u, _tmpA);
    pathCurve.getTangentAt(u, tan).normalize();

    right.copy(MAP_UP_LOCAL).cross(tan);
    if (right.lengthSq() < 1e-10) right.set(1, 0, 0);
    right.normalize();

    const side = (i % 2 === 0) ? 1 : -1;

    _tmpA.addScaledVector(right, EDGE.lateralOffset * side);
    _tmpA.addScaledVector(tan, EDGE.alongOffset * side);

    _tmpW.copy(_tmpA);
    rootRef.localToWorld(_tmpW);

    const rayOrigin = _tmpW.clone().addScaledVector(_tmpWorldUp, 2500);
    const rayDir = _tmpWorldUp.clone().multiplyScalar(-1);

    columnRaycaster.set(rayOrigin, rayDir);
    const hits = columnRaycaster.intersectObject(rootRef, true);

    let anchorWorld = _tmpW.clone();
    if (hits.length) anchorWorld.copy(hits[0].point);

    _tmpLocal.copy(anchorWorld);
    rootRef.worldToLocal(_tmpLocal);

    const m = new THREE.Mesh(geom, baseMat.clone());
    m.position.copy(_tmpLocal);
    m.renderOrder = 5;
    m.visible = false;
    m.userData.anchorWorld = anchorWorld.clone();

    EDGE.centers.push(m);
    rootRef.add(m);
  }
}

export function initTrainConnections() {
  clearTrainArrows();
  const { rootRef } = modelState;
  if (!rootRef || EDGE.centers.length <= 0) return;

  for (let i = 0; i < trains.length; i++) {
    const { group, shaft, head, headLen } = makeOrangeArrow();
    overlayGroup.add(group);
    trainConnections.push({ arrowGroup: group, shaft, head, headLen });
  }
}

export function updateConnections() {
  if (!EDGE.centers.length || !trainConnections.length) return;

  for (let i = 0; i < trains.length; i++) {
    const c = trainConnections[i];
    const train = trains[i];
    if (!c || !train) continue;

    train.getWorldPosition(_tmpA);
    _tmpA.z += 30;

    let bestIdx = 0;
    let bestD2 = Infinity;

    for (let j = 0; j < EDGE.centers.length; j++) {
      const e = EDGE.centers[j];
      if (!e) continue;
      const aw = e.userData.anchorWorld;
      if (!aw) continue;

      const d2 = _tmpA.distanceToSquared(aw);
      if (d2 < bestD2) { bestD2 = d2; bestIdx = j; }
    }

    const edge = EDGE.centers[bestIdx];
    if (!edge) continue;

    const anchorWorld = edge.userData.anchorWorld;
    if (!anchorWorld) continue;

    edge.getWorldPosition(_tmpB);

    const mix = EDGE.arrowTargetMix;
    _tmpB.lerpVectors(anchorWorld, _tmpB, mix);
    _tmpB.addScaledVector(_tmpWorldUp, EDGE.arrowEndLift);

    _tmpDir.copy(_tmpB).sub(_tmpA);
    const fullLen = _tmpDir.length();
    if (fullLen < 1e-6) continue;
    _tmpDir.multiplyScalar(1 / fullLen);

    _tmpQuat.setFromUnitVectors(new THREE.Vector3(0, 1, 0), _tmpDir);

    const arrow = c.arrowGroup;
    arrow.position.copy(_tmpA);
    arrow.quaternion.copy(_tmpQuat);

    const stopGap = EDGE.arrowStopGap;
    const headLen = c.headLen ?? 44;

    const usable = Math.max(40, fullLen - stopGap);
    const shaftLen = Math.max(1, usable - headLen);

    c.shaft.scale.set(1, shaftLen, 1);
    c.shaft.position.y = shaftLen * 0.5;

    c.head.position.y = shaftLen + headLen * 0.5;

    const maxLen = 2600;
    if (usable > maxLen) {
      const k = maxLen / usable;
      c.shaft.scale.y *= k;
      c.shaft.position.y *= k;
      c.head.position.y *= k;
    }
  }
}

function makeTrainInstance() {
  const rig = new THREE.Object3D();
  const visual = new THREE.Object3D();
  rig.add(visual);
  rig.userData.visual = visual;

  if (modelState.trainMeshPrototype) visual.add(modelState.trainMeshPrototype.clone(true));
  return rig;
}

function sortUs() {
  return trainData
    .map((d, idx) => ({ u: normalized01(d.u), idx }))
    .sort((a, b) => a.u - b.u);
}

function findLargestGapMidpoint() {
  if (trainData.length === 0) return 0;

  const arr = sortUs();
  if (arr.length === 1) return normalized01(arr[0].u + 0.5);

  let bestGap = -1;
  let bestMid = 0;

  for (let i = 0; i < arr.length; i++) {
    const a = arr[i].u;
    const b = (i === arr.length - 1) ? (arr[0].u + 1) : arr[i + 1].u;
    const gap = b - a;
    if (gap > bestGap) {
      bestGap = gap;
      bestMid = a + gap * 0.5;
    }
  }
  return normalized01(bestMid);
}

function addOneTrainInLargestGap() {
  const { rootRef, pathCurve, trainMeshPrototype } = modelState;
  if (!rootRef || !pathCurve || !trainMeshPrototype) return;

  const rig = makeTrainInstance();
  rootRef.add(rig);
  trains.push(rig);

  const uNew = findLargestGapMidpoint();
  trainData.push({ u: uNew });
}

export function ensureTrainCount(targetCount) {
  while (trains.length < targetCount) addOneTrainInLargestGap();

  while (trains.length > targetCount) {
    const train = trains.pop();
    train?.parent?.remove(train);
    trainData.pop();
  }
}

// Animation helpers
const worldUp = new THREE.Vector3(0, 1, 0);
const p = new THREE.Vector3();
const t0 = new THREE.Vector3();
const t1 = new THREE.Vector3();
const fwd = new THREE.Vector3();
const rightVec = new THREE.Vector3();
const up2 = new THREE.Vector3();
const basisM = new THREE.Matrix4();
const targetQ = new THREE.Quaternion();

export function animateTrainsWithSpeed(dt, speedActive) {
  const { pathCurve } = modelState;
  if (!pathCurve || !trains.length) return;

  for (let i = 0; i < trains.length; i++) {
    const rig = trains[i];
    const visual = rig.userData.visual;
    const d = trainData[i];

    d.u = (d.u + dt * speedActive) % 1;

    pathCurve.getPointAt(d.u, p);
    rig.position.copy(p);
    rig.position.z -= 10;

    pathCurve.getTangentAt(d.u, t0);
    pathCurve.getTangentAt((d.u + 0.01) % 1, t1);
    fwd.copy(t0).lerp(t1, 0.6).normalize();

    rightVec.copy(worldUp).cross(fwd);
    if (rightVec.lengthSq() < 1e-12) rightVec.set(1, 0, 0);
    rightVec.normalize();

    up2.copy(fwd).cross(rightVec).normalize();

    basisM.makeBasis(rightVec, up2, fwd);
    targetQ.setFromRotationMatrix(basisM);
    targetQ.multiply(modelFixedQ);

    visual.quaternion.slerp(targetQ, 0.15);
  }
}
