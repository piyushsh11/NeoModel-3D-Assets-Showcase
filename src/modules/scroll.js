import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';
gsap.registerPlugin(ScrollTrigger);

export function setupScroll() {
  const reveal = gsap.utils.toArray('.section h2, .card, .tier').map(el=>{
    return gsap.from(el, { y: 24, opacity: 0, duration: 0.6, ease: 'power2.out', scrollTrigger: { trigger: el, start: 'top 80%' } });
  });
  gsap.to('.nav', { backdropFilter: 'saturate(160%) blur(12px)', scrollTrigger: { start: 10 } });
}
