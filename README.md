NeoModel 3D Assets Showcase
<img width="1921" height="993" alt="image" src="https://github.com/user-attachments/assets/0a09efea-9bd5-4697-879f-e8c05cbf957b" />
Link: https://piyushsh11.github.io/NeoModel-3D-Assets-Showcase/
Lightweight Three.js + WebGPU-ready landing page for anime-style 3D models, with live previews, cart, and checkout flows.

 Features
- Hero 3D scene (Three.js / optional WebGPU renderer fallback to WebGL).
- Product cards with modal GLTF viewer (OrbitControls).
- Cart and checkout mock pages in a unified light theme.
- Smooth scrolling / GSAP ScrollTrigger effects.
- Optional Rust → WASM hook (simple animation function).



Structure
- `index.html` – landing page + nav to cart/checkout.
- `cart.html`, `payment.html` – static cart and checkout mockups.
- `styles/main.css` – theme, layout, modal, forms.
- `src/main.js` – app bootstrap, loading UI, event wiring.
- `src/three/scene.js` – hero scene, renderer, lighting, GLTF classroom backdrop.
- `src/modules` – UI helpers (`ui.js`), scroll, card preview, product viewer.
- `src/wasm/loader.js` – lazy-load hook for optional WASM animation.
- `assets/` – GLTF models (gojo1/gojo2) and classroom scene.
- `rust/wasm-anim/` – minimal Rust crate for `step()` animation demo.


 Notes
- All JS dependencies are pulled from CDN via import maps (no npm install required).
- If you change ports, update the URL you open; static server is sufficient for all pages.
- Modal close supports button, backdrop click, and Escape.


Feel free to tweak the wording or add license info if you plan to publish.
