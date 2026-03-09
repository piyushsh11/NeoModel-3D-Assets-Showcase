import { initExperience } from './three/scene.js';
import { setupScroll } from './modules/scroll.js';
import { setupUI } from './modules/ui.js';
import { loadWasm } from './wasm/loader.js';
import { setupCardPreviews } from './modules/cardViewer.js';
import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';
gsap.registerPlugin(ScrollTrigger);

const state = { loaded: 0, total: 1 };
const loadingEl = document.getElementById('loading');
const bar = loadingEl.querySelector('.bar');

const manager = new (window.THREE?.LoadingManager ?? class {
  constructor(){this.onProgress=()=>{};this.onLoad=()=>{}}
})();

manager.onProgress = (_, itemsLoaded, itemsTotal) => {
  state.loaded = itemsLoaded;
  state.total = itemsTotal;
  const p = Math.round((itemsLoaded / itemsTotal) * 100);
  bar.style.width = p + '%';
};

async function boot() {
  const canvas = document.getElementById('webgl');
  const experience = await initExperience({ canvas, manager });
  setupUI(experience);
  setupScroll();
  setupCardPreviews();
  bar.style.width = '100%';
  setTimeout(()=> {
    loadingEl.classList.add('done');
    loadingEl.style.opacity = '0';
    loadingEl.style.pointerEvents = 'none';
  }, 300);
  const previews = document.querySelectorAll('.card .preview');
  previews.forEach(btn => btn.addEventListener('click', async e => {
    const card = e.currentTarget.closest('.card');
    const id = card?.dataset?.id;
    const { openViewer } = await import('./modules/productViewer.js');
    openViewer(id);
  }));
  try { await loadWasm(); } catch {}
}

boot();
