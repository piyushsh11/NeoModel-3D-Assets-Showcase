import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let renderer, scene, camera, controls;

function ensure(canvas){
  if (!renderer){
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio,2));
    renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(55, canvas.clientWidth/canvas.clientHeight, 0.1, 100);
    camera.position.set(0, 0.8, 2.2);
    controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    const hemi = new THREE.HemisphereLight(0xffffff, 0x111422, 0.9);
    const dir = new THREE.DirectionalLight(0xb16cff, 0.8);
    dir.position.set(2,3,2);
    scene.add(hemi, dir);
    const geo = new THREE.TorusKnotGeometry(0.5, 0.18, 220, 18);
    const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.2, roughness: 0.3, emissive: 0x221133, emissiveIntensity: 0.6 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.name = 'asset';
    scene.add(mesh);
    let last = performance.now();
    function loop(now){
      const dt = Math.min(0.033, (now-last)/1000);
      last = now;
      const m = scene.getObjectByName('asset');
      if (m){ m.rotation.y += dt*0.8 }
      controls.update();
      renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
      camera.aspect = canvas.clientWidth/canvas.clientHeight;
      camera.updateProjectionMatrix();
      renderer.render(scene, camera);
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  }
}

export function openViewer(id){
  const modal = document.getElementById('previewModal');
  modal.classList.add('open');
  modal.setAttribute('aria-hidden','false');
  const canvas = document.getElementById('viewerCanvas');
  ensure(canvas);
  (async ()=>{
    try{
      const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
      const loader = new GLTFLoader();
      const map = { 'gojo1': './assets/gojo1/scene.gltf', 'gojo2': './assets/gojo2/scene.gltf' };
      const path = encodeURI(map[id] || map['gojo1']);
      const gltf = await loader.loadAsync(path);
      const model = gltf.scene || gltf.scenes?.[0];
      if (model){
        const old = scene.getObjectByName('asset');
        if (old){ scene.remove(old) }
        model.name = 'asset';
        model.position.set(0,0,0);
        model.scale.set(1,1,1);
        scene.add(model);
      }
    }catch(e){}
  })();
}
