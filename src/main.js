import * as THREE from "three"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js"
import { GUI } from "dat.gui"

// Valor p baseado no último dígito do RA (1)
const p = 1
const size = p

// Sistema de Referência Universal (SRU) / Sistema de Referência do Objeto (SRO)
// Limites da Window: -2p a 2p em todos os eixos
const windowMin = -2 * p
const windowMax = 2 * p

// Limites da Viewport (SRD): 1024 x 768 x 768
const viewportWidth = 1024
const viewportHeight = 768
const viewportDepth = 768

// Matriz de vértices do cubo em coordenadas homogêneas (4x8)
// [x1 x2 x3 x4 x5 x6 x7 x8]
// [y1 y2 y3 y4 y5 y6 y7 y8]
// [z1 z2 z3 z4 z5 z6 z7 z8]
// [1  1  1  1  1  1  1  1 ]
const verts = [
  [0, 0, 0, 1],  // V1 (0,0,0)
  [p, 0, 0, 1],  // V2 (p,0,0)
  [p, p, 0, 1],  // V3 (p,p,0)
  [0, p, 0, 1],  // V4 (0,p,0)
  [0, 0, p, 1],  // V5 (0,0,p)
  [p, 0, p, 1],  // V6 (p,0,p)
  [p, p, p, 1],  // V7 (p,p,p)
  [0, p, p, 1],  // V8 (0,p,p)
]

function createScene(name, matrixSteps, color) {
  const container = document.createElement('div')
  container.className = 'scene-block'

  const label = document.createElement('h3')
  label.textContent = name
  container.appendChild(label)

  const canvas = document.createElement('canvas')
  container.appendChild(canvas)

  const matrixDisplay = document.createElement('pre')
  container.appendChild(matrixDisplay)

  document.getElementById('sceneGrid').appendChild(container)

  // Configuração do viewport (SRD - Sistema de Referência do Dispositivo)
  // Limites: 1024 x 768 x 768
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
  // Mantemos proporção 4:3 para visualização, mas internamente a lógica usa as dimensões reais
  renderer.setSize(400, 300) // Tamanho proporcional para melhor visualização na tela

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x0c0c0c)

  // Definição da câmera de projeção para transformar de SRU para SRD
  // A câmera define a transformação de visualização que mapeia o SRU para o SRD
  // Com sistema de coordenadas conforme especificado:
  // SRD: eixo X (horizontal, direita), eixo Y (vertical, baixo), eixo Z (perpendicular, para dentro)
  const camera = new THREE.PerspectiveCamera(45, viewportWidth / viewportHeight, 0.1, 100)
  camera.position.set(3.5 * p, 3.5 * p, 4.5 * p)
  camera.lookAt(new THREE.Vector3(0, 0, 0)) // Olhando para o centro da window

  const controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true

  scene.add(new THREE.AmbientLight(0xffffff, 0.6))
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.6)
  dirLight.position.set(5, 5, 5)
  scene.add(dirLight)

  // Axes helper - Representa o SRU (Sistema de Referência Universal)
  // Limites da Window: -2p a 2p em todos os eixos
  const axesHelper = new THREE.AxesHelper(windowMax)
  scene.add(axesHelper)

  // Representação do volume da window (-2p a 2p)
  const windowBox = new THREE.Box3(
    new THREE.Vector3(windowMin, windowMin, windowMin),
    new THREE.Vector3(windowMax, windowMax, windowMax)
  )
  const windowBoxHelper = new THREE.Box3Helper(windowBox, 0x444444)
  scene.add(windowBoxHelper)

  // Points - Vértices do cubo
  const pointsGeom = new THREE.BufferGeometry().setFromPoints(
    verts.map((v) => new THREE.Vector3(v[0], v[1], v[2]))
  )
  const pointMaterial = new THREE.PointsMaterial({ color, size: 0.2, sizeAttenuation: true })
  const points = new THREE.Points(pointsGeom, pointMaterial)

  // Wireframe - Arestas do cubo (Equivalente ao algoritmo de Bresenham em 3D)
  // O Three.js implementa internamente um algoritmo similar ao Bresenham para renderizar as linhas
  const indices = [
    [0, 1], [1, 2], [2, 3], [3, 0],  // Face frontal
    [4, 5], [5, 6], [6, 7], [7, 4],  // Face traseira
    [0, 4], [1, 5], [2, 6], [3, 7],  // Arestas conectoras
  ]

  const wireGeom = new THREE.BufferGeometry()
  const wireVertices = []
  for (const [a, b] of indices) {
    const va = new THREE.Vector3(verts[a][0], verts[a][1], verts[a][2])
    const vb = new THREE.Vector3(verts[b][0], verts[b][1], verts[b][2])
    wireVertices.push(va, vb)
  }
  wireGeom.setFromPoints(wireVertices)
  const wire = new THREE.LineSegments(
    wireGeom,
    new THREE.LineBasicMaterial({ color })
  )

  const group = new THREE.Group()
  group.add(points, wire)

  // Aplicação das transformações matriciais
  // O método reduce aplica as matrizes da direita para a esquerda
  const finalMatrix = matrixSteps.reduce((acc, m) => acc.multiply(m), new THREE.Matrix4())
  group.applyMatrix4(finalMatrix)

  scene.add(group)

  // Exibição das matrizes aplicadas e cálculo das novas coordenadas dos vértices
  let displayText = ''
  
  // Primeiro exibimos as matrizes
  const reversedForDisplay = [...matrixSteps].slice().reverse()
  displayText = reversedForDisplay
    .map((m, i) => `Matriz ${i + 1} (${m.name}):\n` + formatMatrix(m))
    .join('\n\n')

  // Se for a cena final ou incluir translação, calculamos e mostramos as coordenadas transformadas
  if (name === 'Matriz Final' || name.includes('Translação')) {
    let verticesText = '\n\nCoordenadas dos vértices transformados:\n'
    
    // Para cada vértice, aplicamos a transformação e calculamos as coordenadas no SRD
    for (let i = 0; i < verts.length; i++) {
      const v = verts[i]
      // Criamos um vetor 4D para aplicar a matriz homogênea
      const vertex = new THREE.Vector4(v[0], v[1], v[2], v[3])
      // Aplicamos a matriz de transformação
      vertex.applyMatrix4(finalMatrix)
      
      // Converter para coordenadas da viewport (SRD)
      const viewportX = Math.round(((vertex.x - windowMin) / (windowMax - windowMin)) * viewportWidth)
      const viewportY = Math.round(((windowMax - vertex.y) / (windowMax - windowMin)) * viewportHeight) // Inverter Y para SRD
      const viewportZ = Math.round(((windowMax - vertex.z) / (windowMax - windowMin)) * viewportDepth) // Inverter Z para SRD
      
      verticesText += `V${i+1} (SRU): (${vertex.x.toFixed(2)}, ${vertex.y.toFixed(2)}, ${vertex.z.toFixed(2)})\n`
      verticesText += `V${i+1} (SRD): (${viewportX}, ${viewportY}, ${viewportZ})\n\n`
    }
    
    // Adicionamos as coordenadas transformadas ao texto de exibição
    displayText += verticesText
  }

  // Exibimos o texto final
  matrixDisplay.textContent = displayText

  // Loop de renderização - Transforma o SRU para SRD através da pipeline gráfica
  renderer.setAnimationLoop(() => {
    controls.update()
    renderer.render(scene, camera)
  })
}

function formatMatrix(m) {
  // Formata uma matriz 4x4 para exibição textual
  const e = m.elements.map((v) => v.toFixed(2))
  return `[${e[0]}, ${e[4]}, ${e[8]}, ${e[12]}]\n[${e[1]}, ${e[5]}, ${e[9]}, ${e[13]}]\n[${e[2]}, ${e[6]}, ${e[10]}, ${e[14]}]\n[${e[3]}, ${e[7]}, ${e[11]}, ${e[15]}]`
}

// MATRIZES de transformação (4x4) em coordenadas homogêneas
const I = new THREE.Matrix4().identity()
I.name = 'Identidade'

// Escala (4x4)
const S = new THREE.Matrix4().makeScale(1.5, 0.5, 2)
S.name = 'Escala'

// Rotação (4x4) - theta = 10.p graus em torno do eixo Y
const theta = (10 * p * Math.PI) / 180 // Ângulo de rotação baseado em p
const Ry = new THREE.Matrix4().makeRotationY(theta)
Ry.name = 'Rotação Y'

// Reflexão (4x4) - em torno do eixo X
const Rf = new THREE.Matrix4().makeScale(1, -1, 1)
Rf.name = 'Reflexão X'

// Translação (4x4) - para centralizar o cubo na viewport
// O centro do cubo original está em (p/2, p/2, p/2)
// Translação necessária para levar ao centro (0,0,0)
const T = new THREE.Matrix4().makeTranslation(-p/2, -p/2, -p/2)
T.name = 'Translação'

// Cálculo da matriz final com a ordem: Escala → Rotação → Reflexão → Translação
// Aplicado da direita para a esquerda: T * Rf * Ry * S
const matrixFinal = new THREE.Matrix4()
  .copy(T)
  .multiply(Rf)
  .multiply(Ry)
  .multiply(S)
matrixFinal.name = 'Matriz Final'

// Cor verde para p=1 (G na tabela do exercício)
const corBase = 0x00FF00 // Verde

// SCENES - Cada cena mostra uma etapa da transformação
createScene('Original (SRU)', [I], corBase)
createScene('Escala', [S], corBase)
createScene('Escala + Rotação', [Ry, S], corBase)
createScene('Escala + Rotação + Reflexão', [Rf, Ry, S], corBase)
createScene('Escala + Rotação + Reflexão + Translação', [T, Rf, Ry, S], corBase)
createScene('Matriz Final', [matrixFinal], 0xFFFFFF) // Matriz final em branco para destaque

/* 
 * Detalhamento das transformações em WebGL (Three.js):
 * 
 * 1. Escala (S) (4x4): 
 *    - Three.js: new THREE.Matrix4().makeScale(1.5, 0.5, 2)
 *    - Matriz 4x4 que escala os objetos pelos fatores 1.5 no eixo X, 0.5 no eixo Y e 2 no eixo Z
 * 
 * 2. Rotação Y (Ry) (4x4): 
 *    - Three.js: new THREE.Matrix4().makeRotationY(theta)
 *    - Matriz 4x4 que rotaciona o objeto em torno do eixo Y por theta = 10.p radianos
 * 
 * 3. Reflexão X (Rf) (4x4): 
 *    - Three.js: new THREE.Matrix4().makeScale(1, -1, 1)
 *    - Matriz 4x4 que reflete o objeto em relação ao plano XZ (em torno do eixo X)
 * 
 * 4. Translação (T) (4x4): 
 *    - Three.js: new THREE.Matrix4().makeTranslation(-p/2, -p/2, -p/2)
 *    - Matriz 4x4 que desloca o objeto para centralizar na viewport
 *
 * Transformação SRU para SRD:
 * - SRU (Sistema de Referência Universal): X (direita), Y (cima), Z (fora)
 * - SRD (Sistema de Referência do Dispositivo): X (direita), Y (baixo), Z (dentro)
 * - Window: -2p a 2p em todos os eixos
 * - Viewport: 1024 x 768 x 768
 * - O Three.js implementa algoritmos similares ao Bresenham para renderização das linhas
 * - A transformação de coordenadas da window para a viewport é realizada internamente pela pipeline gráfica
 */