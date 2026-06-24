/**
 * js/index.js
 * Landing page script — animated demo maze and number counter
 */

document.addEventListener('DOMContentLoaded', () => {
  buildDemoMaze();
  animateCounters();
});

// ---------------------------------------------------------------------------
// Animated mini-maze demo (5x5 hardcoded for landing page)
// ---------------------------------------------------------------------------
const DEMO_GRID = [
  [0,1,1,1,1],
  [0,0,1,0,1],
  [1,0,1,0,1],
  [1,0,0,0,0],
  [1,1,1,1,0],
];
const DEMO_SOLUTION = [[0,0],[1,0],[1,1],[2,1],[3,1],[3,2],[3,3],[3,4],[4,4]];
const DEMO_VISITED  = [[0,0],[1,0],[1,1],[2,1],[3,1],[3,2],[3,3],[2,3],[1,3],[3,4],[4,4]];
const DEMO_BACKTRACK= [[1,3],[2,3]];

function buildDemoMaze() {
  const container = document.getElementById('demo-maze');
  if (!container) return;

  container.style.gridTemplateColumns = `repeat(5, 18px)`;
  container.style.gridTemplateRows    = `repeat(5, 18px)`;

  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      const cell = document.createElement('div');
      cell.className = 'demo-cell';
      cell.id = `demo-${r}-${c}`;

      if      (r === 0 && c === 0) cell.classList.add('demo-start');
      else if (r === 4 && c === 4) cell.classList.add('demo-finish');
      else if (DEMO_GRID[r][c] === 1) cell.classList.add('wall');
      else    cell.classList.add('path');

      container.appendChild(cell);
    }
  }

  // Animate demo loop
  runDemoAnimation();
}

async function runDemoAnimation() {
  await sleep(1200);

  while (true) {
    // Phase 1: Visit cells
    for (const [r, c] of DEMO_VISITED) {
      const el = document.getElementById(`demo-${r}-${c}`);
      if (!el) continue;
      if (!el.classList.contains('demo-start') && !el.classList.contains('demo-finish')) {
        el.classList.remove('path');
        el.classList.add('demo-visit');
      }
      await sleep(120);
    }

    await sleep(300);

    // Phase 2: Mark backtracks
    for (const [r, c] of DEMO_BACKTRACK) {
      const el = document.getElementById(`demo-${r}-${c}`);
      if (!el) continue;
      el.classList.remove('demo-visit');
      el.classList.add('demo-back');
    }

    await sleep(400);

    // Phase 3: Show solution
    for (const [r, c] of DEMO_SOLUTION) {
      const el = document.getElementById(`demo-${r}-${c}`);
      if (!el) continue;
      if (!el.classList.contains('demo-start') && !el.classList.contains('demo-finish')) {
        el.classList.remove('demo-visit');
        el.classList.add('demo-sol');
      }
      await sleep(80);
    }

    await sleep(1800);

    // Phase 4: Reset
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        const el = document.getElementById(`demo-${r}-${c}`);
        if (!el) continue;
        if (r === 0 && c === 0) { el.className = 'demo-cell demo-start'; continue; }
        if (r === 4 && c === 4) { el.className = 'demo-cell demo-finish'; continue; }
        if (DEMO_GRID[r][c] === 1) { el.className = 'demo-cell wall'; continue; }
        el.className = 'demo-cell path';
      }
    }

    await sleep(800);
  }
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// ---------------------------------------------------------------------------
// Number counter animation
// ---------------------------------------------------------------------------
function animateCounters() {
  const targets = document.querySelectorAll('.stat-num[data-target]');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const target = parseInt(el.dataset.target, 10);
      countUp(el, target, 1200);
      observer.unobserve(el);
    });
  }, { threshold: 0.5 });

  targets.forEach(el => observer.observe(el));
}

function countUp(el, target, duration) {
  const start = Date.now();
  const tick = () => {
    const elapsed = Date.now() - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
    el.textContent = Math.round(eased * target);
    if (progress < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
