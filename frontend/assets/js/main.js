import { initRouter } from '../../router/router.js';
import { renderFooter } from '../../components/footer.js';

document.addEventListener('DOMContentLoaded', () => {
  renderFooter(document.getElementById('footer-root'));
  initRouter();
  initCursorPlane();
});

function initCursorPlane() {
  if (window.matchMedia('(hover: none)').matches) return;
  if (window.matchMedia('(pointer: coarse)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const plane = document.createElement('div');
  plane.className = 'cursor-plane';
  plane.setAttribute('aria-hidden', 'true');
  // Filled top-down commercial airplane — clear and recognizable at 24px
  plane.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M21 16v-2l-8-5V3.5C13 2.67 12.33 2 11.5 2S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/></svg>`;
  document.body.appendChild(plane);

  let mx = 0, my = 0, cx = -100, cy = -100;
  let angle = -45; // initial: pointing top-right

  function lerpAngle(cur, target, t) {
    const diff = ((target - cur + 540) % 360) - 180;
    return cur + diff * t;
  }

  document.addEventListener('mousemove', (e) => {
    // Cursor plane is suppressed on admin, driver, and booking-tracking routes — keep portal UI clean.
    if (location.pathname.startsWith('/admin') || location.pathname.startsWith('/driver') || location.pathname.startsWith('/booking-tracking')) {
      plane.classList.remove('visible');
      return;
    }
    const dx = e.clientX - mx;
    const dy = e.clientY - my;
    const speed = Math.sqrt(dx * dx + dy * dy);
    mx = e.clientX;
    my = e.clientY;
    plane.classList.add('visible');
    if (speed > 1.5) {
      const target = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
      angle = lerpAngle(angle, target, 0.3);
    }
  });

  document.addEventListener('mouseleave', () => plane.classList.remove('visible'));

  (function loop() {
    if (location.pathname.startsWith('/admin') || location.pathname.startsWith('/driver') || location.pathname.startsWith('/booking-tracking')) {
      plane.classList.remove('visible');
      requestAnimationFrame(loop);
      return;
    }
    cx += (mx - cx) * 0.13;
    cy += (my - cy) * 0.13;
    plane.style.transform = `translate(${cx - 12}px, ${cy - 12}px) rotate(${angle}deg)`;
    requestAnimationFrame(loop);
  })();
}
