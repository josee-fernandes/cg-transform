import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GUI } from "dat.gui";

const p = 1;
const size = p;

const verts = [
  [0, 0, 0],
  [p, 0, 0],
  [p, p, 0],
  [0, p, 0],
  [0, 0, p],
  [p, 0, p],
  [p, p, p],
  [0, p, p],
];

function createScene(name, matrixSteps, color) {
  const container = document.createElement('div');
  container.className = 'scene-block';

  const label = document.createElement('h3');
  label.textContent = name;
  container.appendChild(label);

  const canvas = document.createElement('canvas');
  container.appendChild(canvas);

  const matrixDisplay = document.createElement('pre');
  container.appendChild(matrixDisplay);

  document.getElementById('sceneGrid').appendChild(container);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(300, 300);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0c0c0c);

  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(3.5 * p, 3.5 * p, 4.5 * p);
  camera.lookAt(new THREE.Vector3(p / 2, p / 2, p / 2));

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;

  scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
  dirLight.position.set(5, 5, 5);
  scene.add(dirLight);

  // Axes helper
  scene.add(new THREE.AxesHelper(2 * p));

  // Points
  const pointsGeom = new THREE.BufferGeometry().setFromPoints(
    verts.map((v) => new THREE.Vector3(...v))
  );
  const pointMaterial = new THREE.PointsMaterial({ color, size: 0.2, sizeAttenuation: true });
  const points = new THREE.Points(pointsGeom, pointMaterial);

  // Wireframe
  const indices = [
    [0, 1], [1, 2], [2, 3], [3, 0],
    [4, 5], [5, 6], [6, 7], [7, 4],
    [0, 4], [1, 5], [2, 6], [3, 7],
  ];

  const wireGeom = new THREE.BufferGeometry();
  const wireVertices = [];
  for (const [a, b] of indices) {
    const va = new THREE.Vector3(...verts[a]);
    const vb = new THREE.Vector3(...verts[b]);
    wireVertices.push(va, vb);
  }
  wireGeom.setFromPoints(wireVertices);
  const wire = new THREE.LineSegments(
    wireGeom,
    new THREE.LineBasicMaterial({ color })
  );

  const group = new THREE.Group();
  group.add(points, wire);

  // Apply matrix transformations
  const finalMatrix = matrixSteps.reduce((acc, m) => acc.multiply(m), new THREE.Matrix4());
  group.applyMatrix4(finalMatrix);

  scene.add(group);

  const reversedForDisplay = [...matrixSteps].slice().reverse();

  matrixDisplay.textContent = reversedForDisplay
    .map((m, i) => `Matriz ${i + 1} (${m.name}):\n` + formatMatrix(m))
    .join('\n\n');

  renderer.setAnimationLoop(() => {
    controls.update();
    renderer.render(scene, camera);
  });
}

function formatMatrix(m) {
  const e = m.elements.map((v) => v.toFixed(2));
  return `[${e[0]}, ${e[4]}, ${e[8]}, ${e[12]}]\n[${e[1]}, ${e[5]}, ${e[9]}, ${e[13]}]\n[${e[2]}, ${e[6]}, ${e[10]}, ${e[14]}]\n[${e[3]}, ${e[7]}, ${e[11]}, ${e[15]}]`;
}

// MATRIZES (nomeadas)
const I = new THREE.Matrix4().identity(); I.name = 'Identidade';
const S = new THREE.Matrix4().makeScale(1.5, 0.5, 2); S.name = 'Escala';
const theta = (10 * p * Math.PI) / 180;
const Ry = new THREE.Matrix4().makeRotationY(theta); Ry.name = 'Rotação Y';
const Rf = new THREE.Matrix4().makeScale(1, -1, 1); Rf.name = 'Reflexão X';
const T = new THREE.Matrix4().makeTranslation(-p / 2, -p / 2, -p / 2); T.name = 'Translação';

const matrixFinal = new THREE.Matrix4()
  .copy(T)
  .multiply(Rf)
  .multiply(Ry)
  .multiply(S);
matrixFinal.name = 'Matriz Final';

// SCENES
createScene('Original (SRU)', [I], 0x0077be);
createScene('Escala', [S], 0xd41c1c);
createScene('Escala + Rotação', [Ry, S], 0xe67300);
createScene('Escala + Rotação + Reflexão', [Rf, Ry, S], 0x990099);
createScene('Escala + Rotação + Reflexão + Translação', [T, Rf, Ry, S], 0x00994d);
createScene('Matriz Final', [matrixFinal], 0xffffff);