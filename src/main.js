import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GUI } from "dat.gui";

// Cena e câmera
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf0f0f0);
const camera = new THREE.PerspectiveCamera(70, window.innerWidth/window.innerHeight, 0.1, 100);
camera.position.set(6,6,8);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias:true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// OrbitControls
const controlsOrbit = new OrbitControls(camera, renderer.domElement);
controlsOrbit.enableDamping = true;
controlsOrbit.dampingFactor = 0.05;
controlsOrbit.enablePan = true;

// Luz e eixos
scene.add(new THREE.AmbientLight(0xffffff,0.7));
const dirLight = new THREE.DirectionalLight(0xffffff,0.5);
dirLight.position.set(5,10,7);
scene.add(dirLight);
scene.add(new THREE.AxesHelper(5));

// Parâmetro p e constantes de cálculo
const calc = { p: 1, showOriginal: true, showTransformed: true };
const theta1 = THREE.MathUtils.degToRad(10);
const theta2 = THREE.MathUtils.degToRad(20);

// Vértices do cubo 0..1
const size = 1;
const verts = [
  [0,0,0],[1,0,0],[1,1,0],[0,1,0],
  [0,0,1],[1,0,1],[1,1,1],[0,1,1]
];
const edgeIndices = [
  [0,1],[1,2],[2,3],[3,0],
  [4,5],[5,6],[6,7],[7,4],
  [0,4],[1,5],[2,6],[3,7]
];

// Cubo original (azul)
const boxGeom = new THREE.BoxGeometry(size,size,size);
boxGeom.translate(0.5,0.5,0.5);
const edgesOrig = new THREE.EdgesGeometry(boxGeom);
const wireOrig = new THREE.LineSegments(edgesOrig, new THREE.LineBasicMaterial({color:0x0077be}));
scene.add(wireOrig);
const ptsOrig = new THREE.Points(
  new THREE.BufferGeometry().setFromPoints(verts.map(v=>new THREE.Vector3(...v))),
  new THREE.PointsMaterial({color:0x0077be,size:0.025})
);
scene.add(ptsOrig);

// Cubo transformado (vermelho): pontos + linhas
const ptsTransGeom = new THREE.BufferGeometry();
ptsTransGeom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(verts.length*3),3));
const ptsTrans = new THREE.Points(ptsTransGeom, new THREE.PointsMaterial({color:0xd41c1c,size:0.1}));
scene.add(ptsTrans);
const linePos = new Float32Array(edgeIndices.length*2*3);
const linesTrans = new THREE.LineSegments(
  new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(linePos,3)),
  new THREE.LineBasicMaterial({color:0xd41c1c})
);
scene.add(linesTrans);

// Função de formatação de matrizes
function fmt(m) {
  const e = m.elements;
  return(
    `[${e[0].toFixed(2)}, ${e[4].toFixed(2)}, ${e[8].toFixed(2)}, ${e[12].toFixed(2)}]\n`+
    `[${e[1].toFixed(2)}, ${e[5].toFixed(2)}, ${e[9].toFixed( 2)}, ${e[13].toFixed(2)}]\n`+
    `[${e[2].toFixed(2)}, ${e[6].toFixed(2)}, ${e[10].toFixed(2)}, ${e[14].toFixed(2)}]\n`+
    `[${e[3].toFixed(2)}, ${e[7].toFixed(2)}, ${e[11].toFixed(2)}, ${e[15].toFixed(2)}]`
  );
}

// Atualiza transformações e exibição
const matrixDiv = document.getElementById('matrixDisplay');
function update() {
  const p = calc.p;
  // Matrizes conforme caderno:
  const tx = p + p, ty = 2*p + 2*p;
  const S = new THREE.Matrix4().makeScale(p * 2 * p, p * 2 * p, 1); // K2·K1 = (2p * p)
  const R = new THREE.Matrix4().makeRotationZ(theta1 + theta2);
  const T = new THREE.Matrix4().makeTranslation(tx, ty, 0);
  const M = new THREE.Matrix4().identity().multiply(T).multiply(R).multiply(S);

  // Atualizar pontos transformados
  const transPts = verts.map(v=> new THREE.Vector3(...v).applyMatrix4(M));
  ptsTrans.geometry.setFromPoints(transPts);

  // Atualizar linhas transformadas
  const pos = linesTrans.geometry.getAttribute('position');
  edgeIndices.forEach((e,i)=>{
    const a = transPts[e[0]], b = transPts[e[1]];
    pos.setXYZ(i*2,   a.x, a.y, a.z);
    pos.setXYZ(i*2+1, b.x, b.y, b.z);
  });
  pos.needsUpdate = true;

  // Visibilidade
  wireOrig.visible = calc.showOriginal;
  ptsOrig.visible  = calc.showOriginal;
  linesTrans.visible = calc.showTransformed;
  ptsTrans.visible   = calc.showTransformed;

  // Exibir matrizes
  matrixDiv.textContent =
    'S (Escala):\n' + fmt(S) +
    '\nR (Rotação Z = 10°+20°):\n' + fmt(R) +
    '\nT (Translação = [2p,4p]):\n' + fmt(T) +
    '\nM = T·R·S:\n' + fmt(M);
}

// GUI
const gui = new GUI();
gui.add(calc, 'p', 0, 10, 1).name('p (RA digito)').onChange(update);
gui.add(calc, 'showOriginal').name('Mostrar Azul').onChange(update);
gui.add(calc, 'showTransformed').name('Mostrar Vermelho').onChange(update);

// Inicial
update();

// Loop
window.addEventListener('resize', ()=>{
  camera.aspect = window.innerWidth/window.innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
(function animate(){ requestAnimationFrame(animate); controlsOrbit.update(); renderer.render(scene,camera); })();