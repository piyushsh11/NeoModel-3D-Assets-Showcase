import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { FilmPass } from 'three/addons/postprocessing/FilmPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { RGBShiftShader } from 'three/addons/shaders/RGBShiftShader.js';

let useWebGPU = false;

async function createRenderer(canvas, antialias) {
  if (navigator.gpu) {
    try {
      const { WebGPURenderer } = await import('three/addons/renderers/webgpu/WebGPURenderer.js');
      const renderer = new WebGPURenderer({ canvas, antialias, alpha: true });
      useWebGPU = true;
      return renderer;
    } catch {}
  }
  const renderer = new THREE.WebGLRenderer({ canvas, antialias, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  return renderer;
}

function createHeroModel() {
  const group = new THREE.Group();
  const material = new THREE.MeshToonMaterial({ color: 0xffffff });
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.6, 64, 64), material);
  head.position.y = 1.6;
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.5, 1.2, 12, 24), material);
  body.position.y = 0.6;
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x111318 });
  const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.08, 16, 16), eyeMat);
  const eyeR = eyeL.clone();
  eyeL.position.set(-0.18,1.75,0.55);
  eyeR.position.set(0.18,1.75,0.55);
  group.add(head, body, eyeL, eyeR);
  return group;
}

// background shader removed in favor of classroom 3D environment

function createLights() {
  const hemi = new THREE.HemisphereLight(0xcfe6ff, 0xf2ede5, 0.85);
  const dir = new THREE.DirectionalLight(0xf3c17a, 1.35);
  dir.position.set(3,4,2);
  const amb = new THREE.AmbientLight(0xffffff, 0.35);
  return { hemi, dir, amb };
}

export async function initExperience({ canvas, manager }) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, window.innerWidth/window.innerHeight, 0.1, 1000);
  camera.position.set(0, 1.4, 3.2);
  const renderer = await createRenderer(canvas, true);
  renderer.setClearColor(0xf6f8fc, 1);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.4;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.target.set(0,1.2,0);
  const { hemi, dir, amb } = createLights();
  scene.add(hemi, dir, amb);
  (async ()=>{
    try{
      const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
      const loader = new GLTFLoader();
      // Load classroom environment in the background
      const classroomPath = './assets/classroom/scene.gltf';
      const classGltf = await loader.loadAsync(classroomPath);
      const classroom = classGltf.scene || classGltf.scenes?.[0];
      if (classroom){
        const meshes = [];
        classroom.traverse(o=>{
          if (o.isMesh) {
            meshes.push(o);
            o.frustumCulled = true;
            o.castShadow=false;
            o.receiveShadow=true;
            const mats = Array.isArray(o.material) ? o.material : [o.material];
            for (const m of mats){ if (m) m.side = THREE.DoubleSide; }
          }
        });
        classroom.position.set(0,0,0);
        classroom.scale.set(1,1,1);
        scene.add(classroom);
        // only classroom as hero scene (no placeholders)
        // Fit camera and controls to classroom bounds
        const box = new THREE.Box3().setFromObject(classroom);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const radius = Math.max(size.x, size.y, size.z);
        // Detect blackboard-like surface to face
        let board = null, boardVol = 0;
        classroom.traverse(obj=>{
          if (obj.isMesh && /(board|blackboard|chalk|screen)/i.test(obj.name||'')) {
            const bb = new THREE.Box3().setFromObject(obj);
            const bs = bb.getSize(new THREE.Vector3());
            const vol = bs.x*bs.y*bs.z;
            if (vol > boardVol){ boardVol = vol; board = { box: bb, size: bs }; }
          }
        });
        // Helpers to find a safe interior pose
        const rc = new THREE.Raycaster(new THREE.Vector3(), new THREE.Vector3(), 0.01, radius*2);
        const dirs = [new THREE.Vector3(1,0,0), new THREE.Vector3(-1,0,0), new THREE.Vector3(0,0,1), new THREE.Vector3(0,0,-1)];
        function isInside(pos){
          for (const d of dirs){
            rc.set(pos, d);
            const hits = rc.intersectObjects(meshes, true);
            if (!hits || hits.length === 0) return false;
          }
          return true;
        }
        function pickInteriorPose(){
          const y = THREE.MathUtils.clamp(box.min.y + size.y*0.28, box.min.y + size.y*0.18, box.max.y - size.y*0.25);
          const face = board ? board.box.getCenter(new THREE.Vector3()) : center.clone();
          const target = face.clone(); target.y = y * 0.98;
          const xmin = box.min.x + size.x*0.2, xmax = box.max.x - size.x*0.2;
          const zmin = box.min.z + size.z*0.2, zmax = box.max.z - size.z*0.2;
          let best = null; let bestScore = -Infinity;
          const steps = 9;
          for (let ix=0; ix<steps; ix++){
            const x = xmin + (xmax-xmin)*ix/(steps-1);
            for (let iz=0; iz<steps; iz++){
              const z = zmin + (zmax-zmin)*iz/(steps-1);
              const p = new THREE.Vector3(x, y, z);
              if (!isInside(p)) continue;
              let minDist = Infinity;
              for (const d of dirs){
                rc.set(p, d);
                const hit = rc.intersectObjects(meshes, true)[0];
                if (!hit) { minDist = 0; break; }
                minDist = Math.min(minDist, hit.distance);
              }
              const score = minDist;
              if (score > bestScore){ bestScore = score; best = p; }
            }
          }
          const camPos = best || new THREE.Vector3(
            THREE.MathUtils.clamp(center.x, xmin, xmax),
            y,
            THREE.MathUtils.clamp(center.z, zmin, zmax)
          );
          return { camPos, target };
        }
        // Prefer embedded glTF camera if present
        let embeddedCam = null;
        classroom.traverse(o=>{ if (o.isCamera && !embeddedCam) embeddedCam = o; });
        if (embeddedCam){
          const wpos = new THREE.Vector3();
          const wquat = new THREE.Quaternion();
          embeddedCam.getWorldPosition(wpos);
          embeddedCam.getWorldQuaternion(wquat);
          if (embeddedCam.isPerspectiveCamera){
            camera.fov = embeddedCam.fov;
            camera.near = embeddedCam.near;
            camera.far = Math.max(camera.far, embeddedCam.far || camera.far);
            camera.updateProjectionMatrix();
          }
          camera.position.copy(wpos);
          camera.quaternion.copy(wquat);
          const forward = new THREE.Vector3(0,0,-1).applyQuaternion(wquat);
          const target = wpos.clone().addScaledVector(forward, 3.0);
          controls.target.copy(target);
          camera.lookAt(controls.target);
          if (!isInside(camera.position)){
            const pose = pickInteriorPose();
            controls.target.copy(pose.target);
            camera.position.copy(pose.camPos);
            camera.lookAt(controls.target);
          }
        } else {
          const pose = pickInteriorPose();
          controls.target.copy(pose.target);
          camera.position.copy(pose.camPos);
          camera.lookAt(controls.target);
        }
        // Lock view: no zoom, no pan, only yaw rotation
        let offset = camera.position.clone().sub(controls.target);
        let spherical = new THREE.Spherical().setFromVector3(offset);
        spherical.theta -= Math.PI/12;
        const yaw20 = Math.PI / 9;
        const baseR = spherical.radius;
        let r = baseR * 1.5; // move camera further back
        let guard = 0;
        function posAt(theta, radius){
          const s = new THREE.Spherical(radius, spherical.phi, theta);
          const v = new THREE.Vector3().setFromSpherical(s);
          return controls.target.clone().add(v);
        }
        while (guard++ < 24) {
          const p0 = posAt(spherical.theta, r);
          const pL = posAt(spherical.theta - yaw20, r);
          const pR = posAt(spherical.theta + yaw20, r);
          if ((!isInside || (isInside(p0) && isInside(pL) && isInside(pR)))) break;
          r *= 0.95;
          if (r <= baseR) { r = baseR; break; }
        }
        spherical.radius = r;
        offset = new THREE.Vector3().setFromSpherical(spherical);
        camera.position.copy(controls.target.clone().add(offset));
        camera.lookAt(controls.target);
        // First-person look: rotate camera in place (yaw + pitch). Scene stays static.
        controls.enabled = false;
        const canvas = document.getElementById('webgl');
        const euler = new THREE.Euler(0, 0, 0, 'YXZ');
        euler.setFromQuaternion(camera.quaternion, 'YXZ');
        let yaw = euler.y;
        let pitch = euler.x;
        const SENS = 0.0022;
        const PITCH_MIN = -Math.PI/2 + 0.05;
        const PITCH_MAX =  Math.PI/2 - 0.05;
        function applyOrientation(){
          euler.set(pitch, yaw, 0, 'YXZ');
          camera.quaternion.setFromEuler(euler);
          const forward = new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion);
          controls.target.copy(camera.position.clone().addScaledVector(forward, 3));
        }
        function onMouseMove(ev){
          if (document.pointerLockElement !== canvas) return;
          yaw   -= ev.movementX * SENS;
          pitch -= ev.movementY * SENS;
          if (pitch < PITCH_MIN) pitch = PITCH_MIN;
          if (pitch > PITCH_MAX) pitch = PITCH_MAX;
          applyOrientation();
        }
        function onClick(){ if (document.pointerLockElement !== canvas) canvas.requestPointerLock(); }
        canvas.addEventListener('click', onClick);
        document.addEventListener('mousemove', onMouseMove);
        applyOrientation();
        // Softer daylight for classroom
        // Softer daylight for classroom
        dir.color.set(0xfff3cf);
        dir.intensity = 0.7;
        dir.position.set(controls.target.x - radius*0.4, controls.target.y + radius*0.6, controls.target.z + radius*0.3);
        hemi.color.setHSL(0.58, 0.35, 0.8);
        hemi.groundColor.setHSL(0.08, 0.2, 0.3);
      }
    }catch(e){}
  })();
  const composer = new EffectComposer(renderer);
  const renderPass = new RenderPass(scene, camera);
  const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.4, 0.3, 0.85);
  const rgbShift = new ShaderPass(RGBShiftShader);
  rgbShift.uniforms.amount.value = 0.0005;
  const film = new FilmPass(0.04, 0.02, 648, false);
  composer.addPass(renderPass);
  composer.addPass(bloom);
  composer.addPass(rgbShift);
  composer.addPass(film);
  function tick(dt) {}
  let raf;
  let last = performance.now();
  function loop(now){
    const dt = Math.min(0.033, (now-last)/1000);
    last = now;
    controls.update();
    tick(dt);
    composer.render();
    raf = requestAnimationFrame(loop);
  }
  raf = requestAnimationFrame(loop);
  function onResize(){
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w,h);
    composer.setSize(w,h);
    camera.aspect = w/h; camera.updateProjectionMatrix();
    bloom.setSize(w,h);
  }
  window.addEventListener('resize', onResize);
  function projectToScreen(v3){
    const v = v3.clone().project(camera);
    const x = (v.x * 0.5 + 0.5) * window.innerWidth;
    const y = ( - v.y * 0.5 + 0.5) * window.innerHeight;
    return { x, y };
  }
  function animateAddToCart(cardEl){
    const rect = cardEl.getBoundingClientRect();
    const target = document.getElementById('cartBtn').getBoundingClientRect();
    const el = document.createElement('div');
    el.style.position='fixed';
    el.style.left = rect.left + rect.width/2 + 'px';
    el.style.top = rect.top + 'px';
    el.style.width='14px'; el.style.height='14px'; el.style.borderRadius='50%';
    el.style.background='linear-gradient(90deg,#b16cff,#00f0ff)';
    el.style.boxShadow='0 0 20px rgba(0,240,255,.6)';
    el.style.zIndex='40';
    document.body.appendChild(el);
    const dx = target.left + 8 - (rect.left + rect.width/2);
    const dy = target.top + 8 - rect.top;
    el.animate([{transform:'translate(0,0) scale(1)'},{transform:`translate(${dx}px,${dy}px) scale(0.6)`}],{duration:700,easing:'cubic-bezier(.2,.8,.2,1)'}).onfinish=()=>{
      el.remove();
      const c = document.getElementById('cartCount');
      const n = parseInt(c.textContent||'0',10)+1;
      c.textContent = String(n);
      c.animate([{transform:'scale(1)'},{transform:'scale(1.3)'},{transform:'scale(1)'}],{duration:260});
    };
  }
  return { scene, camera, renderer, useWebGPU, animateAddToCart };
}
