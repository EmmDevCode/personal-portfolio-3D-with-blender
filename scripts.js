import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS3DRenderer, CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';
// ARREGLO CRÍTICO: Importar todo como TWEEN
import * as TWEEN from '@tweenjs/tween.js';

console.log("Iniciando script 3D...");

// 1. ESCENA
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x202025); 

// 2. CÁMARA
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 10); 

// 3. RENDERERS
const webglRenderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
webglRenderer.setSize(window.innerWidth, window.innerHeight);
webglRenderer.shadowMap.enabled = true;
webglRenderer.shadowMap.type = THREE.PCFSoftShadowMap;
webglRenderer.domElement.style.position = 'absolute';
webglRenderer.domElement.style.pointerEvents = 'none'; 
document.getElementById('webgl-container').appendChild(webglRenderer.domElement);

const cssRenderer = new CSS3DRenderer();
cssRenderer.setSize(window.innerWidth, window.innerHeight);
cssRenderer.domElement.style.position = 'absolute';
cssRenderer.domElement.style.pointerEvents = 'auto'; // IMPORTANTE: Permite clicks
document.getElementById('css3d-container').appendChild(cssRenderer.domElement);

// 4. LUCES
const ambientLight = new THREE.AmbientLight(0xffffff, 1.2); scene.add(ambientLight);
const keyLight = new THREE.DirectionalLight(0xffffff, 2.5);
keyLight.position.set(5, 5, 5); keyLight.castShadow = true; scene.add(keyLight);
const fillLight = new THREE.DirectionalLight(0xbfe3ff, 1);
fillLight.position.set(-5, 0, 5); scene.add(fillLight);

// VARIABLES
let controls;
let initialCameraPosition = new THREE.Vector3();
let initialTarget = new THREE.Vector3();
let isZoomed = false;

// 5. CARGAR MODELO
const loader = new GLTFLoader();

function createCSS3DObject(elementId, width, height, position, rotation) {
    const wrapper = document.getElementById(elementId);
    wrapper.style.width = width + 'px';
    wrapper.style.height = height + 'px';
    const object = new CSS3DObject(wrapper);
    object.position.copy(position);
    object.quaternion.copy(rotation);
    return object;
}

// ⚠️ ASEGÚRATE QUE EL ARCHIVO EN LA CARPETA ASSETS SE LLAME EXACTAMENTE "Portafolio.glb"
loader.load('assets/Portafolio.glb', (gltf) => {
    console.log("Modelo cargado correctamente");
    const model = gltf.scene;
    
    // Centrar modelo
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    model.position.sub(center);

    model.traverse((child) => {
        if (child.isMesh) {
            child.castShadow = true; child.receiveShadow = true;

            // --- MONITOR ---
            if (child.name.includes('DisplayMonitor')) {
                console.log("Monitor encontrado");
                child.material = new THREE.MeshBasicMaterial({ color: 0x000000, opacity: 0, transparent: true, blending: THREE.NoBlending });
                
                const cssObject = createCSS3DObject('monitor-wrapper', 1280, 720, child.position, child.quaternion);
                
                child.geometry.computeBoundingBox();
                const size = child.geometry.boundingBox.getSize(new THREE.Vector3());
                const scaleFactor = size.x / 1280; 
                cssObject.scale.set(scaleFactor, scaleFactor, scaleFactor);
                scene.add(cssObject);

                const blocker = document.getElementById('monitor-blocker');
                blocker.addEventListener('click', () => {
                    if (isZoomed) return;
                    const offset = new THREE.Vector3(0, 0, 0.6); 
                    offset.applyQuaternion(child.quaternion);
                    focusView(child.position.clone().add(offset), child.position, blocker);
                });
            }

            // --- IPAD ---
            if (child.name.includes('Displayipad')) {
                console.log("iPad encontrado");
                child.material.visible = false;
                const cssObject = createCSS3DObject('ipad-wrapper', 768, 1024, child.position, child.quaternion);
                cssObject.rotateX(-Math.PI / 2); 
                cssObject.scale.set(0.00025, 0.00025, 0.00025);
                scene.add(cssObject);

                const blocker = document.getElementById('ipad-blocker');
                blocker.addEventListener('click', () => {
                    if (isZoomed) return;
                    const offset = new THREE.Vector3(0, 0, 0.5); 
                    offset.applyQuaternion(cssObject.quaternion); 
                    focusView(cssObject.position.clone().add(offset), cssObject.position, blocker);
                });
            }
        }
    });

    scene.add(model);
    fitCameraToSelection(camera, controls, model, 1.5);
    
    setTimeout(() => {
        initialCameraPosition.copy(camera.position);
        initialTarget.copy(controls.target);
    }, 500);

}, undefined, (error) => {
    console.error("ERROR CARGANDO EL MODELO:", error);
    alert("Error cargando 'assets/Portafolio.glb'. Revisa la consola (F12) y asegura que el archivo existe y el nombre es correcto.");
});

// 6. CONTROLES
controls = new OrbitControls(camera, cssRenderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;

// 7. ANIMACIÓN FOCUS
const exitBtn = document.getElementById('btn-exit');
let currentBlocker = null;

function focusView(targetPos, lookAtPos, blockerElement) {
    isZoomed = true;
    currentBlocker = blockerElement;
    
    // Usamos TWEEN.Tween porque importamos * as TWEEN
    new TWEEN.Tween(camera.position)
        .to({ x: targetPos.x, y: targetPos.y, z: targetPos.z }, 1000)
        .easing(TWEEN.Easing.Cubic.Out)
        .start();

    new TWEEN.Tween(controls.target)
        .to({ x: lookAtPos.x, y: lookAtPos.y, z: lookAtPos.z }, 1000)
        .easing(TWEEN.Easing.Cubic.Out)
        .onComplete(() => {
            controls.enabled = false; 
            blockerElement.style.display = 'none'; 
            exitBtn.classList.add('visible');
        })
        .start();
}

exitBtn.addEventListener('click', () => {
    if (!isZoomed) return;
    if (currentBlocker) currentBlocker.style.display = 'flex';
    exitBtn.classList.remove('visible');

    new TWEEN.Tween(camera.position)
        .to(initialCameraPosition, 1000)
        .easing(TWEEN.Easing.Cubic.Out)
        .start();

    new TWEEN.Tween(controls.target)
        .to(initialTarget, 1000)
        .easing(TWEEN.Easing.Cubic.Out)
        .onComplete(() => {
            controls.enabled = true;
            isZoomed = false;
        })
        .start();
});

function fitCameraToSelection(camera, controls, selection, fitOffset = 1.2) {
    const box = new THREE.Box3();
    selection.updateMatrixWorld(true);
    box.setFromObject(selection);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    
    // Evitar errores si el modelo no tiene tamaño
    if (size.x === 0 && size.y === 0 && size.z === 0) return;

    const maxSize = Math.max(size.x, size.y, size.z);
    const fitHeightDistance = maxSize / (2 * Math.atan(Math.PI * camera.fov / 360));
    const fitWidthDistance = fitHeightDistance / camera.aspect;
    const distance = fitOffset * Math.max(fitHeightDistance, fitWidthDistance);
    
    const direction = controls.target.clone().sub(camera.position).normalize().multiplyScalar(distance);
    controls.maxDistance = distance * 10;
    controls.target.copy(center);
    camera.near = distance / 100;
    camera.far = distance * 100;
    camera.updateProjectionMatrix();
    camera.position.copy(controls.target).sub(direction);
    controls.update();
}

// 8. ANIMATE LOOP
function animate(time) {
    requestAnimationFrame(animate);
    TWEEN.update(time); // Actualizar animaciones
    controls.update();
    webglRenderer.render(scene, camera);
    cssRenderer.render(scene, camera);
}
animate();

// UI Extras
document.getElementById('btn-reset').addEventListener('click', () => {
   const model = scene.children.find(c => c.type === 'Group' || c.type === 'Scene'); 
   if(model) fitCameraToSelection(camera, controls, model, 1.5);
});
document.getElementById('btn-theme').addEventListener('click', (e) => {
    const isDark = scene.background.getHex() === 0x202025;
    scene.background.set(isDark ? 0xf0f0f0 : 0x202025);
    e.target.innerText = isDark ? "☀️ Modo Día" : "🌙 Modo Noche";
});
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    webglRenderer.setSize(window.innerWidth, window.innerHeight);
    cssRenderer.setSize(window.innerWidth, window.innerHeight);
});