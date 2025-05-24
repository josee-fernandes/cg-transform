import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GUI } from "dat.gui";

// Valor p baseado no último dígito do RA (1)
const p = 1;
const size = p;

// Coordenadas dos vértices do cubo no SRU (Sistema de Referência Universal)
const verts = [
  [0, 0, 0],  // V1
  [p, 0, 0],  // V2
  [p, p, 0],  // V3
  [0, p, 0],  // V4
  [0, 0, p],  // V5
  [p, 0, p],  // V6
  [p, p, p],  // V7
  [0, p, p],  // V8
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

  // Configuração do viewport (janela de visualização) no SRD
  // xpMin=0, ypMin=0, xpMax=300, ypMax=300
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(300, 300); // Define o tamanho do viewport

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0c0c0c);

  // Definição da câmera de projeção para transformar de SRU para SRD
  // A câmera define a transformação de visualização que mapeia o SRU para o SRD
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(3.5 * p, 3.5 * p, 4.5 * p);
  camera.lookAt(new THREE.Vector3(p / 2, p / 2, p / 2));

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;

  scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
  dirLight.position.set(5, 5, 5);
  scene.add(dirLight);

  // Axes helper - Representa o SRU (Sistema de Referência Universal)
  scene.add(new THREE.AxesHelper(2 * p));

  // Points - Vértices do cubo
  const pointsGeom = new THREE.BufferGeometry().setFromPoints(
    verts.map((v) => new THREE.Vector3(...v))
  );
  const pointMaterial = new THREE.PointsMaterial({ color, size: 0.2, sizeAttenuation: true });
  const points = new THREE.Points(pointsGeom, pointMaterial);

  // Wireframe - Arestas do cubo
  const indices = [
    [0, 1], [1, 2], [2, 3], [3, 0],  // Face frontal
    [4, 5], [5, 6], [6, 7], [7, 4],  // Face traseira
    [0, 4], [1, 5], [2, 6], [3, 7],  // Arestas conectoras
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

  // Aplicação das transformações matriciais
  // O método reduce aplica as matrizes da direita para a esquerda
  const finalMatrix = matrixSteps.reduce((acc, m) => acc.multiply(m), new THREE.Matrix4());
  group.applyMatrix4(finalMatrix);

  scene.add(group);

  // Exibição das matrizes aplicadas
  const reversedForDisplay = [...matrixSteps].slice().reverse();

  matrixDisplay.textContent = reversedForDisplay
    .map((m, i) => `Matriz ${i + 1} (${m.name}):\n` + formatMatrix(m))
    .join('\n\n');

  // Loop de renderização - Transforma o SRU para SRD através da pipeline gráfica
  renderer.setAnimationLoop(() => {
    controls.update();
    renderer.render(scene, camera);
  });
}

function formatMatrix(m) {
  const e = m.elements.map((v) => v.toFixed(2));
  return `[${e[0]}, ${e[4]}, ${e[8]}, ${e[12]}]\n[${e[1]}, ${e[5]}, ${e[9]}, ${e[13]}]\n[${e[2]}, ${e[6]}, ${e[10]}, ${e[14]}]\n[${e[3]}, ${e[7]}, ${e[11]}, ${e[15]}]`;
}

// MATRIZES de transformação (nomeadas)
const I = new THREE.Matrix4().identity(); I.name = 'Identidade';
const S = new THREE.Matrix4().makeScale(1.5, 0.5, 2); S.name = 'Escala';
const theta = (10 * p * Math.PI) / 180; // Ângulo de rotação baseado em p
const Ry = new THREE.Matrix4().makeRotationY(theta); Ry.name = 'Rotação Y';
const Rf = new THREE.Matrix4().makeScale(1, -1, 1); Rf.name = 'Reflexão X';
const T = new THREE.Matrix4().makeTranslation(-p / 2, -p / 2, -p / 2); T.name = 'Translação';

// Cálculo da matriz final com a ordem: Escala → Rotação → Reflexão → Translação
// Aplicado da direita para a esquerda: T * Rf * Ry * S
const matrixFinal = new THREE.Matrix4()
  .copy(T)
  .multiply(Rf)
  .multiply(Ry)
  .multiply(S);
matrixFinal.name = 'Matriz Final';

// Cor verde para p=1 (G na tabela do exercício)
const corBase = 0x00FF00; // Verde

// SCENES - Cada cena mostra uma etapa da transformação
createScene('Original (SRU)', [I], corBase);
createScene('Escala', [S], corBase);
createScene('Escala + Rotação', [Ry, S], corBase);
createScene('Escala + Rotação + Reflexão', [Rf, Ry, S], corBase);
createScene('Escala + Rotação + Reflexão + Translação', [T, Rf, Ry, S], corBase);
createScene('Matriz Final', [matrixFinal], 0xFFFFFF); // Matriz final em branco para destaque

/* 
 * Detalhamento das transformações em WebGL (Three.js):
 * 
 * 1. Escala (S): 
 *    - Three.js: new THREE.Matrix4().makeScale(1.5, 0.5, 2)
 *    - Matriz 4x4 que escala os objetos pelos fatores 1.5 no eixo X, 0.5 no eixo Y e 2 no eixo Z
 * 
 * 2. Rotação Y (Ry): 
 *    - Three.js: new THREE.Matrix4().makeRotationY(theta)
 *    - Matriz 4x4 que rotaciona o objeto em torno do eixo Y por theta radianos
 * 
 * 3. Reflexão X (Rf): 
 *    - Three.js: new THREE.Matrix4().makeScale(1, -1, 1)
 *    - Matriz 4x4 que reflete o objeto em relação ao plano XZ
 * 
 * 4. Translação (T): 
 *    - Three.js: new THREE.Matrix4().makeTranslation(-p/2, -p/2, -p/2)
 *    - Matriz 4x4 que desloca o objeto pelas coordenadas (-p/2, -p/2, -p/2)
 *
 * Transformação SRU para SRD:
 * - O Three.js manipula automaticamente a transformação do Sistema de Referência Universal (SRU) 
 *   para o Sistema de Referência do Dispositivo (SRD) através da pipeline gráfica.
 * - As coordenadas do viewport são definidas com renderer.setSize(300, 300)
 * - A câmera define a transformação de visualização e projeção
 */