import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GUI } from "dat.gui";

// Cena, câmera, renderer
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf0f0f0);
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(3, 3, 3);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Controles de órbita
const controlsOrbit = new OrbitControls(camera, renderer.domElement);
controlsOrbit.enableDamping = true;
controlsOrbit.dampingFactor = 0.05;
controlsOrbit.enablePan = true;
controlsOrbit.screenSpacePanning = false;

// Luz
scene.add(new THREE.AmbientLight(0xffffff, 0.6));
const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
dirLight.position.set(5, 5, 5);
scene.add(dirLight);

// Auxiliar de eixos
scene.add(new THREE.AxesHelper(2));

// Parâmetros de transformação
const controls = {
  showOriginal: true,
  showTransformed: false,
  tx: 0,
  ty: 0,
  rotX: 0,
  rotZ: 0,
  scaleX: 1,
  scaleY: 1,
};

// Geometria do cubo (tamanho unitário)
const size = 1;
const boxGeom = new THREE.BoxGeometry(size, size, size);
const edgesGeom = new THREE.EdgesGeometry(boxGeom);

// Materiais
const matOrig = new THREE.LineBasicMaterial({ color: 0x0077be });
const matTrans = new THREE.LineBasicMaterial({ color: 0xd41c1c });
const ptMatOrig = new THREE.PointsMaterial({
  color: 0x0077be,
  size: 0.05,
});
const ptMatTrans = new THREE.PointsMaterial({
  color: 0xd41c1c,
  size: 0.05,
});

// Tamanho dos pontos = cada vértice do cubo
const verts = [
  [0, 0, 0],
  [size, 0, 0],
  [size, size, 0],
  [0, size, 0],
  [0, 0, size],
  [size, 0, size],
  [size, size, size],
  [0, size, size],
];
const ptsOrigGeom = new THREE.BufferGeometry().setFromPoints(
  verts.map((v) => new THREE.Vector3(...v))
);
const ptsTransGeom = ptsOrigGeom.clone();

// Criação dos objetos originais
const originalGroup = new THREE.Group();
const wireOrig = new THREE.LineSegments(edgesGeom, matOrig);
const ptsOrig = new THREE.Points(ptsOrigGeom, ptMatOrig);
originalGroup.add(wireOrig, ptsOrig);
scene.add(originalGroup);

// Grupo transformado (sem autoUpdate: usa matrix manual)
const transGroup = new THREE.Group();
transGroup.matrixAutoUpdate = false;
const wireTrans = new THREE.LineSegments(edgesGeom, matTrans);
const ptsTrans = new THREE.Points(ptsTransGeom, ptMatTrans);
transGroup.add(wireTrans, ptsTrans);
scene.add(transGroup);

// Display de matrizes
const matrixDiv = document.getElementById("matrixDisplay");

// Atualiza transformações e texto de matrizes
function updateTransform() {
  // Criar matrizes individuais
  const S = new THREE.Matrix4().makeScale(
    controls.scaleX,
    controls.scaleY,
    1
  );
  const Rx = new THREE.Matrix4().makeRotationX(controls.rotX);
  const Rz = new THREE.Matrix4().makeRotationZ(controls.rotZ);
  const T = new THREE.Matrix4().makeTranslation(
    controls.tx,
    controls.ty,
    0
  );
  // Compor: M = T * Rz * Rx * S
  const M = new THREE.Matrix4()
    .identity()
    .multiply(T)
    .multiply(Rz)
    .multiply(Rx)
    .multiply(S);
  transGroup.matrix.copy(M);

  // Texto formatado
  function fmt(m) {
    const e = m.elements;
    return `[
${e[0].toFixed(2)}, ${e[4].toFixed(2)}, ${e[8].toFixed(2)}, ${e[12].toFixed(2)}
${e[1].toFixed(2)}, ${e[5].toFixed(2)}, ${e[9].toFixed(2)}, ${e[13].toFixed(2)}
${e[2].toFixed(2)}, ${e[6].toFixed(2)}, ${e[10].toFixed(2)}, ${e[14].toFixed(
      2
    )}
${e[3].toFixed(2)}, ${e[7].toFixed(2)}, ${e[11].toFixed(2)}, ${e[15].toFixed(
      2
    )}
]`;
  }

  matrixDiv.textContent =
    "Matriz de Escala (S):\n" +
    fmt(S) +
    "\nMatriz Rot X (Rx):\n" +
    fmt(Rx) +
    "\nMatriz Rot Z (Rz):\n" +
    fmt(Rz) +
    "\nMatriz Translação (T):\n" +
    fmt(T) +
    "\nMatriz Composta (M=T·Rz·Rx·S):\n" +
    fmt(M);

  originalGroup.visible = controls.showOriginal;
  transGroup.visible = controls.showTransformed;
}

// GUI
const gui = new GUI();
const fVis = gui.addFolder("Visibilidade");
fVis
  .add(controls, "showOriginal")
  .name("Padrão")
  .onChange(updateTransform);
fVis
  .add(controls, "showTransformed")
  .name("Transformado")
  .onChange(updateTransform);
const fTrans = gui.addFolder("Transformações");
fTrans
  .add(controls, "tx", -2, 2, 0.1)
  .name("Transl X")
  .onChange(updateTransform);
fTrans
  .add(controls, "ty", -2, 2, 0.1)
  .name("Transl Y")
  .onChange(updateTransform);
fTrans
  .add(controls, "rotX", 0, 2 * Math.PI, 0.01)
  .name("Rot X")
  .onChange(updateTransform);
fTrans
  .add(controls, "rotZ", 0, 2 * Math.PI, 0.01)
  .name("Rot Z")
  .onChange(updateTransform);
fTrans
  .add(controls, "scaleX", 0.1, 3, 0.1)
  .name("Escala X")
  .onChange(updateTransform);
fTrans
  .add(controls, "scaleY", 0.1, 3, 0.1)
  .name("Escala Y")
  .onChange(updateTransform);

updateTransform();

// Responsividade
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Render loop
(function animate() {
  requestAnimationFrame(animate);
  controlsOrbit.update();
  renderer.render(scene, camera);
})();