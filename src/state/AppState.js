export const activeConfig = {
  totalNodes: 8,
  mobileNodes: 4,
  topoChangeMs: 1000,
  reconfigMode: 'holistic',
  queryMode: 'stateful'
};

export function setActiveConfig(cfg) {
  Object.assign(activeConfig, cfg);
}

export const exp = {
  running: false,
  startMs: 0,
  stopMs: 0,
  tickTimer: null,
  points: [],
  maxPoints: 2500,
  lastTopoEventMs: 0,
  frozen: false,
  scrollAfterStop: false,
  holistic: {
    phase: 'idle',
    rampStartMs: 0,
    rampDurationMs: 10000,
    baseAtRampStart: 0,
    jumpTarget: 0,
  }
};

export function resetExperimentGraph() {
  exp.points = [];
  exp.frozen = false;
  exp.lastTopoEventMs = 0;
  exp.scrollAfterStop = false;

  exp.holistic.phase = 'idle';
  exp.holistic.rampStartMs = 0;
  exp.holistic.baseAtRampStart = 0;
  exp.holistic.jumpTarget = 0;
}

export const settings = {
  trainCount: 2,
  speedUser: 0.03,
  speedActive: 0,
};

export const scenario = { map: false, topo: false, shots: false };

export const snapshots = [];

export const modelState = {
  rootRef: null,
  pathCurve: null,
  rawTrainRef: null,
  trainMeshPrototype: null,
  pathMesh: null,
};

export const trains = [];
export const trainData = [];

export function nowMs() { return performance.now(); }
