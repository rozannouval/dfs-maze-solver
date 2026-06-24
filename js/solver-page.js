/**
 * js/solver-page.js
 * Logic for the interactive DFS Solver Page
 */

let _activeMaze = null;
let _isSolving   = false;

// Speed mappings for slider (min=1, max=3)
const SPEED_MAP = {
  1: 150, // Slow
  2: 50,  // Normal
  3: 5    // Fast
};

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Get Maze ID from URL
  const params = new URLSearchParams(window.location.search);
  const mazeId = params.get('id');

  if (!mazeId) {
    alert('No Maze ID provided.');
    window.location.href = 'difficulty.html';
    return;
  }

  // 2. Find Maze in MAZE_DATA
  _activeMaze = findMazeById(mazeId);
  if (!_activeMaze) {
    alert('Maze not found.');
    window.location.href = 'difficulty.html';
    return;
  }

  // 3. Initialize UI
  document.getElementById('maze-name').textContent = _activeMaze.name;
  
  const badge = document.getElementById('maze-badge');
  badge.textContent = _activeMaze.difficulty.toUpperCase();
  badge.className = `badge badge-${_activeMaze.difficulty}`;

  document.getElementById('back-link').href = `maze-list.html?level=${_activeMaze.difficulty}`;

  // Initialize DB
  try {
    await openDatabase();
  } catch (err) {
    console.error('Failed to init DB:', err);
  }

  // 4. Render Maze & Setup
  const container = document.getElementById('maze-grid');
  renderMaze(_activeMaze, container);
  
  setTotalNodes(_activeMaze.rows * _activeMaze.cols);
  resetStats();
  
  // Enable Manual Exploration initially
  enableManualMode(_activeMaze);
  setupKeyboardControls();

  // 5. Bind Buttons
  document.getElementById('btn-solve').addEventListener('click', startDFS);
  document.getElementById('btn-reset').addEventListener('click', resetEnvironment);
});

// ---------------------------------------------------------------------------
// Maze Lookup
// ---------------------------------------------------------------------------
function findMazeById(id) {
  for (const diff in MAZE_DATA) {
    const found = MAZE_DATA[diff].find(m => m.id === id);
    if (found) return found;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Manual Keyboard Controls
// ---------------------------------------------------------------------------
function setupKeyboardControls() {
  document.addEventListener('keydown', (e) => {
    if (_isSolving) return; // Disable manual during animation

    let dr = 0, dc = 0;
    switch (e.key) {
      case 'ArrowUp':    case 'w': dr = -1; break;
      case 'ArrowDown':  case 's': dr =  1; break;
      case 'ArrowLeft':  case 'a': dc = -1; break;
      case 'ArrowRight': case 'd': dc =  1; break;
      default: return; // Not a movement key
    }

    // Prevent default scrolling for arrow keys
    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) {
      e.preventDefault();
    }

    const result = movePlayer(dr, dc);
    if (result === 'finish') {
      setTimeout(() => alert('Manual Exploration: You reached the finish!'), 50);
    }
  });
}

// ---------------------------------------------------------------------------
// DFS Execution
// ---------------------------------------------------------------------------
async function startDFS() {
  if (_isSolving || !_activeMaze) return;

  // 1. Prepare UI
  _isSolving = true;
  document.getElementById('btn-solve').disabled = true;
  document.getElementById('btn-reset').disabled = true;
  document.getElementById('result-banner').classList.add('hide');
  document.getElementById('manual-hint').style.display = 'none';

  resetMaze(_activeMaze);
  resetStats();
  clearStackVisualization(document.getElementById('stack-list'));

  const speedVal = document.getElementById('speed-slider').value;
  const speedMs  = SPEED_MAP[speedVal] || 50;

  // 2. Run DFS with callbacks linked to renderer & statistics
  const stackContainer = document.getElementById('stack-list');

  const finalStats = await solveDFS(_activeMaze, speedMs, {
    onVisit: (r, c) => {
      setCellState(r, c, 'visited');
    },
    onBacktrack: (r, c) => {
      setCellState(r, c, 'backtrack');
    },
    onSolution: async (path) => {
      // Animate solution path drawing
      for (const [r, c] of path) {
        setCellState(r, c, 'solution');
        await sleep(Math.max(10, speedMs / 2));
      }
    },
    onNoSolution: () => {
      alert('No solution exists for this maze.');
    },
    onStackUpdate: (stack) => {
      updateStackVisualization(stack, stackContainer);
    },
    onStatsUpdate: (stats) => {
      updateStats(stats);
    }
  });

  // 3. Save to DB
  try {
    await saveResult({
      mazeId: _activeMaze.id,
      mazeName: _activeMaze.name,
      difficulty: _activeMaze.difficulty,
      rows: _activeMaze.rows,
      cols: _activeMaze.cols,
      ...finalStats
    });
  } catch (err) {
    console.error('Failed to save result:', err);
  }

  // 4. Finish UI
  document.getElementById('btn-solve').disabled = false;
  document.getElementById('btn-reset').disabled = false;
  document.getElementById('btn-solve').innerHTML = 'Run Again';
  _isSolving = false;

  // Show banner
  const banner = document.getElementById('result-banner');
  banner.classList.remove('hide');
  banner.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ---------------------------------------------------------------------------
// Reset
// ---------------------------------------------------------------------------
function resetEnvironment() {
  if (_isSolving) return;

  resetMaze(_activeMaze);
  resetStats();
  clearStackVisualization(document.getElementById('stack-list'));
  document.getElementById('result-banner').classList.add('hide');
  document.getElementById('manual-hint').style.display = 'flex';
  
  // Re-enable manual exploration
  enableManualMode(_activeMaze);
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}
