import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS3DRenderer, CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';
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
webglRenderer.domElement.style.pointerEvents = 'auto'; // ✅ IMPORTANTE
document.getElementById('webgl-container').appendChild(webglRenderer.domElement);

const cssRenderer = new CSS3DRenderer();
cssRenderer.setSize(window.innerWidth, window.innerHeight);
cssRenderer.domElement.style.pointerEvents = 'none'; // ✅ CSS3D no bloquea
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

// 5. CONTROLES - APUNTAR AL WEBGL RENDERER
controls = new OrbitControls(camera, webglRenderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;

// 6. FUNCIÓN PARA CREAR OBJETOS CSS3D
function createCSS3DObject(elementId, width, height) {
    const element = document.getElementById(elementId);
    if (!element) {
        console.error("Elemento no encontrado:", elementId);
        return null;
    }
    
    // Clonar el elemento para evitar problemas de DOM
    const clone = element.cloneNode(true);
    clone.style.display = 'block';
    clone.style.width = width + 'px';
    clone.style.height = height + 'px';
    clone.style.pointerEvents = 'auto'; // ✅ El contenido es interactivo
    
    const object = new CSS3DObject(clone);
    object.elementId = elementId;
    
    return object;
}

// 7. DETECCIÓN DE CLICS EN ELEMENTOS 3D
function setupElementInteractions(cssObject, child) {
    setTimeout(() => {
        const blocker = cssObject.element.querySelector('.click-blocker');
        const screenContent = cssObject.element.querySelector('.screen-content');
        
        if (blocker) {
            blocker.style.pointerEvents = 'auto';
            blocker.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                if (isZoomed) return;
                
                // ✅ DIAGNÓSTICO
                debugCameraPositions(child, child.name);
                
                const targetWorldPos = new THREE.Vector3();
                child.getWorldPosition(targetWorldPos);
                
                // ✅ OFFSETS MUCHO MÁS GRANDES - ESCALA CORREGIDA
                let offset, lookAtOffset;
                
                if (child.name.includes('DisplayMonitor')) {
                    // MONITOR: Offsets mucho más grandes
                    offset = new THREE.Vector3(0, 0.2, 5.0); // 8.0 de distancia!!!
                    lookAtOffset = new THREE.Vector3(0, 0.5, 0);
                    console.log("Monitor - Offset grande aplicado: 8.0");
                } else if (child.name.includes('Displayipad')) {
                    // IPAD: Offsets mucho más grandes  
                    offset = new THREE.Vector3(0, 5.0, 0.0); // 4.0 de altura!!!
                    lookAtOffset = new THREE.Vector3(0, 1.0, 0);
                    console.log("iPad - Offset grande aplicado: 4.0 altura");
                }
                
                // Aplicar rotación
                offset.applyQuaternion(child.quaternion);
                lookAtOffset.applyQuaternion(child.quaternion);
                
                const cameraTarget = targetWorldPos.clone().add(offset);
                const lookAtTarget = targetWorldPos.clone().add(lookAtOffset);
                
                console.log("Final Camera Target:", cameraTarget);
                console.log("Final Look At Target:", lookAtTarget);
                
                focusView(cameraTarget, lookAtTarget, blocker);
            });
        }
        
        if (screenContent) {
            screenContent.style.pointerEvents = 'auto';
            screenContent.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        }
        
        cssObject.element.style.pointerEvents = 'none';
    }, 100);
}

// 8. CARGAR MODELO
const loader = new GLTFLoader();

loader.load('assets/Portafolio2.glb', (gltf) => {
    console.log("Modelo cargado correctamente");
    const model = gltf.scene;
    
    // Centrar modelo
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    model.position.sub(center);

    model.traverse((child) => {
        if (child.isMesh) {
            child.castShadow = true; 
            child.receiveShadow = true;

            // MONITOR
            if (child.name.includes('DisplayMonitor')) {
                console.log("Monitor encontrado");
                
                // Material sólido para el monitor
                child.material = new THREE.MeshBasicMaterial({ 
                    color: 0x000000,
                    transparent: false,
                    opacity: 0.95
                });

                const cssObject = createCSS3DObject('monitor-wrapper', 1280, 720);
                if (cssObject) {
                    cssObject.position.set(0, 0, 0.01);
                    
                    child.geometry.computeBoundingBox();
                    const size = child.geometry.boundingBox.getSize(new THREE.Vector3());
                    const scaleX = size.x / 1280;
                    const scaleY = size.y / 720;
                    cssObject.scale.set(scaleX, scaleY, 1);
                    
                    child.add(cssObject);
                    setupElementInteractions(cssObject, child);
                }
            }

            // IPAD
            if (child.name.includes('Displayipad')) {
                console.log("iPad encontrado");
                child.material = new THREE.MeshBasicMaterial({ 
               color: 0x000000,
               transparent: true,
               opacity: 0.95
            });

                const cssObject = createCSS3DObject('ipad-wrapper', 768, 1024);
                if (cssObject) {
                    cssObject.position.set(0, 0, 0.01);
                    cssObject.rotateX(-Math.PI / 2);
                    
                    const scaleX = 1.43 / 768;
                    const scaleY = 1.92 / 1024;
                    cssObject.scale.set(scaleX, scaleY, scaleX);
                    
                    child.add(cssObject);
                    setupElementInteractions(cssObject, child);
                }
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
});

// 9. ANIMACIÓN FOCUS
    const exitBtn = document.getElementById('btn-exit');
    let currentBlocker = null;

    function focusView(targetPos, lookAtPos, blockerElement) {
        isZoomed = true;
        currentBlocker = blockerElement;
        
        // Ocultar blocker
        if (blockerElement) blockerElement.style.display = 'none';
        
        new TWEEN.Tween(camera.position)
            .to({ x: targetPos.x, y: targetPos.y, z: targetPos.z }, 1000)
            .easing(TWEEN.Easing.Cubic.Out)
            .start();

        new TWEEN.Tween(controls.target)
            .to({ x: lookAtPos.x, y: lookAtPos.y, z: lookAtPos.z }, 1000)
            .easing(TWEEN.Easing.Cubic.Out)
            .onComplete(() => {
                controls.enabled = false;
                exitBtn.classList.add('visible');
            })
            .start();
    }

// 10. BOTÓN SALIR
exitBtn.addEventListener('click', () => {
    if (!isZoomed) return;
    
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
            if (currentBlocker) currentBlocker.style.display = 'flex';
        })
        .start();
});

// 11. FUNCIONES AUXILIARES
function fitCameraToSelection(camera, controls, selection, fitOffset = 1.2) {
    const box = new THREE.Box3();
    selection.updateMatrixWorld(true);
    box.setFromObject(selection);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    
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

// 12. UI CONTROLS
document.getElementById('btn-reset').addEventListener('click', () => {
   const model = scene.children.find(c => c.type === 'Group'); 
   if(model) fitCameraToSelection(camera, controls, model, 1.5);
});

document.getElementById('btn-theme').addEventListener('click', (e) => {
    const isDark = scene.background.getHex() === 0x202025;
    scene.background.set(isDark ? 0xf0f0f0 : 0x202025);
    e.target.innerText = isDark ? "☀️ Modo Día" : "🌙 Modo Noche";
});

// 13. ANIMATION LOOP
function animate(time) {
    requestAnimationFrame(animate);
    TWEEN.update(time);
    controls.update();
    webglRenderer.render(scene, camera);
    cssRenderer.render(scene, camera);
}
animate();

// 14. RESIZE
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    webglRenderer.setSize(window.innerWidth, window.innerHeight);
    cssRenderer.setSize(window.innerWidth, window.innerHeight);
});

console.log("Sistema 3D inicializado correctamente");

// 15. NAVEGACIÓN DEL FOOTER LATERAL - CON OFFSETS GRANDES
function navigateToSection(section) {
    const monitor = findObjectByName(scene, 'DisplayMonitor');
    const ipad = findObjectByName(scene, 'Displayipad');
    
    if (!monitor || !ipad) {
        console.warn('No se encontraron los objetos 3D');
        return;
    }
    
    let cameraTarget, lookAtTarget;
    const monitorWorldPos = new THREE.Vector3();
    const ipadWorldPos = new THREE.Vector3();
    
    monitor.getWorldPosition(monitorWorldPos);
    ipad.getWorldPosition(ipadWorldPos);
    
    // ✅ DIAGNÓSTICO
    debugCameraPositions(monitor, 'Monitor');
    debugCameraPositions(ipad, 'iPad');
    
    switch(section) {
        case 'about':
        case 'skills':
            // MONITOR: Offsets enormes
            const monitorOffset = new THREE.Vector3(0, 1.0, 8.0);
            const monitorLookAt = new THREE.Vector3(0, 0.5, 0);
            
            monitorOffset.applyQuaternion(monitor.quaternion);
            monitorLookAt.applyQuaternion(monitor.quaternion);
            
            cameraTarget = monitorWorldPos.clone().add(monitorOffset);
            lookAtTarget = monitorWorldPos.clone().add(monitorLookAt);
            
            console.log("NAV: Monitor camera target:", cameraTarget);
            
            focusView(cameraTarget, lookAtTarget, document.querySelector('#monitor-blocker'));
            
            setTimeout(() => {
                if (section === 'about') {
                    const aboutSection = document.querySelector('#about-section');
                    if (aboutSection) aboutSection.scrollIntoView({ behavior: 'smooth' });
                } else if (section === 'skills') {
                    const skillsSection = document.querySelector('#skills-section');
                    if (skillsSection) skillsSection.scrollIntoView({ behavior: 'smooth' });
                }
            }, 1200);
            break;
            
        case 'projects':
            // IPAD: Offsets enormes
            const ipadOffset = new THREE.Vector3(0, 4.0, 3.0);
            const ipadLookAt = new THREE.Vector3(0, 1.0, 0);
            
            ipadOffset.applyQuaternion(ipad.quaternion);
            ipadLookAt.applyQuaternion(ipad.quaternion);
            
            cameraTarget = ipadWorldPos.clone().add(ipadOffset);
            lookAtTarget = ipadWorldPos.clone().add(ipadLookAt);
            
            console.log("NAV: iPad camera target:", cameraTarget);
            
            focusView(cameraTarget, lookAtTarget, document.querySelector('#ipad-blocker'));
            break;
    }
}

function findObjectByName(scene, name) {
    let found = null;
    scene.traverse((child) => {
        if (child.name && child.name.includes(name)) {
            found = child;
        }
    });
    return found;
}

// 16. INICIALIZAR NAVEGACIÓN
setupFooterNavigation();

function debugCameraPositions(child, deviceName) {
    const worldPos = new THREE.Vector3();
    child.getWorldPosition(worldPos);
    
    const box = new THREE.Box3().setFromObject(child);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    
    console.log(`=== ${deviceName} DEBUG ===`);
    console.log('World Position:', worldPos);
    console.log('Bounding Box Size:', size);
    console.log('Bounding Box Center:', center);
    console.log('Camera Position:', camera.position);
    console.log('====================');
}

