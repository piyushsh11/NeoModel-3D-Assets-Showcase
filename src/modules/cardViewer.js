import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

function createPreview(el, id){
  const w = el.clientWidth, h = el.clientHeight;
  const canvas = document.createElement('canvas');
  canvas.style.width='100%'; canvas.style.height='100%'; canvas.style.display='block';
  el.innerHTML=''; el.appendChild(canvas);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, w/h, 0.05, 50);
  camera.position.set(0.8, 0.6, 1.1);
  const hemi = new THREE.HemisphereLight(0xffffff, 0x40404a, 0.9);
  const dir = new THREE.DirectionalLight(0xffffff, 0.6);
  dir.position.set(1,1,1);
  scene.add(hemi, dir);
  const loader = new GLTFLoader();
  const map = { 'gojo1': './assets/gojo1/scene.gltf', 'gojo2': './assets/gojo2/scene.gltf' };
  loader.load(map[id]||map['gojo1'], (gltf)=>{
    const model = gltf.scene || gltf.scenes?.[0];
    if (!model) return;
    model.traverse(o=>{ if (o.isMesh){ o.frustumCulled=true; }});
    // fit
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const scale = 1.0 / Math.max(size.x, size.y, size.z);
    model.position.sub(center).multiplyScalar(scale);
    model.scale.setScalar(scale);
    scene.add(model);
  });
  let rx = 0, ry = 0, dragging = false, px=0, py=0;
  canvas.addEventListener('pointerdown', e=>{ dragging=true; px=e.clientX; py=e.clientY; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointerup', e=>{ dragging=false; canvas.releasePointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', e=>{
    if (!dragging) return;
    const dx = (e.clientX - px)/w;
    const dy = (e.clientY - py)/h;
    px = e.clientX; py = e.clientY;
    ry += dx * Math.PI;
    rx = Math.max(-0.8, Math.min(0.8, rx + dy * Math.PI));
  });
  function render(){
    const cw = el.clientWidth, ch = el.clientHeight;
    renderer.setSize(cw, ch, false);
    camera.aspect = cw/ch; camera.updateProjectionMatrix();
    camera.position.set(Math.sin(ry)*1.2, 0.6+rx*0.2, Math.cos(ry)*1.2);
    camera.lookAt(0, 0.4, 0);
    renderer.render(scene, camera);
    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);
}

export function setupCardPreviews(){
  const cards = document.querySelectorAll('.card');
  const io = new IntersectionObserver((entries)=>{
    for (const entry of entries){
      if (entry.isIntersecting){
        const id = entry.target.getAttribute('data-id');
        const slot = entry.target.querySelector('.card-3d');
        if (slot && !slot.__preview){
          slot.__preview = true;
          createPreview(slot, id);
        }
      }
    }
  }, { threshold: 0.2 });
  cards.forEach(c=>io.observe(c));
}
