/**
 * js/renderer.js
 * Maze Grid Renderer Module
 *
 * Responsible for building and updating the maze's DOM representation.
 * Each cell is a <div> with an ID of "cell-{r}-{c}" and one or more
 * CSS class names that control its visual appearance.
 *
 * Cell States (CSS classes defined in css/solver.css):
 *   wall        — impassable wall cell
 *   path        — walkable path cell (default)
 *   start       — starting position (green)
 *   finish      — ending position   (red)
 *   visited     — explored by DFS   (blue)
 *   backtrack   — dead-end cell     (orange)
 *   solution    — part of solution path (bright green)
 *   player      — current manual player position (purple)
 */

// State tracking for the current maze
let _currentMaze   = null;
let _playerPos     = { r: 0, c: 0 };
let _isManualMode  = false;

// ---------------------------------------------------------------------------
// Core Rendering
// ---------------------------------------------------------------------------

/**
 * Renders the maze grid into the given container element.
 * Clears any existing content first.
 *
 * @param {Object} maze      - {rows, cols, grid, start, finish}
 * @param {HTMLElement} container - The div to render into
 */
function renderMaze(maze, container) {
  _currentMaze = maze;
  container.innerHTML = '';

  // Compute responsive cell size
  const cellSize = computeCellSize(maze.rows, maze.cols);

  // Set up CSS grid layout
  container.style.gridTemplateColumns = `repeat(${maze.cols}, ${cellSize}px)`;
  container.style.gridTemplateRows    = `repeat(${maze.rows}, ${cellSize}px)`;

  const fragment = document.createDocumentFragment();

  for (let r = 0; r < maze.rows; r++) {
    for (let c = 0; c < maze.cols; c++) {
      const cell = document.createElement('div');
      cell.className = 'maze-cell';
      cell.id = `cell-${r}-${c}`;
      cell.style.width  = `${cellSize}px`;
      cell.style.height = `${cellSize}px`;

      // Determine initial state
      const isWall = maze.grid[r][c] === 1;
      const isStart  = r === maze.start[0]  && c === maze.start[1];
      const isFinish = r === maze.finish[0] && c === maze.finish[1];

      if (isStart)       cell.classList.add('start');
      else if (isFinish) cell.classList.add('finish');
      else if (isWall)   cell.classList.add('wall');
      else               cell.classList.add('path');

      fragment.appendChild(cell);
    }
  }

  container.appendChild(fragment);

  // Reset player position to start
  _playerPos    = { r: maze.start[0], c: maze.start[1] };
  _isManualMode = false;
}

/**
 * Resets all cells to their initial (unvisited) state,
 * preserving wall/path/start/finish structure.
 *
 * @param {Object} maze
 */
function resetMaze(maze) {
  if (!maze) return;
  _currentMaze = maze;

  for (let r = 0; r < maze.rows; r++) {
    for (let c = 0; c < maze.cols; c++) {
      const el = getCellEl(r, c);
      if (!el) continue;

      const isWall   = maze.grid[r][c] === 1;
      const isStart  = r === maze.start[0]  && c === maze.start[1];
      const isFinish = r === maze.finish[0] && c === maze.finish[1];

      // Clear all state classes
      el.className = 'maze-cell';

      if (isStart)       el.classList.add('start');
      else if (isFinish) el.classList.add('finish');
      else if (isWall)   el.classList.add('wall');
      else               el.classList.add('path');
    }
  }

  _playerPos    = { r: maze.start[0], c: maze.start[1] };
  _isManualMode = false;
}

// ---------------------------------------------------------------------------
// Cell State API
// ---------------------------------------------------------------------------

/**
 * Returns the DOM element for cell (r, c).
 * @param {number} r
 * @param {number} c
 * @returns {HTMLElement|null}
 */
function getCellEl(r, c) {
  return document.getElementById(`cell-${r}-${c}`);
}

/**
 * Sets the visual state of a cell.
 * Preserves 'start' and 'finish' classes to prevent overriding landmark styles.
 *
 * @param {number} r
 * @param {number} c
 * @param {string} state - 'visited' | 'backtrack' | 'solution' | 'player' | 'path'
 */
function setCellState(r, c, state) {
  const el = getCellEl(r, c);
  if (!el) return;

  const isStart  = el.classList.contains('start');
  const isFinish = el.classList.contains('finish');

  // Preserve landmark classes — only apply non-destructive overlays
  if (state === 'solution') {
    // Solution overrides even start/finish visually (they are already colored)
    if (!isStart && !isFinish) {
      el.className = `maze-cell solution`;
    }
    return;
  }

  if (isStart || isFinish) return; // Do not override landmarks with traversal states

  // Remove all traversal state classes, keep base
  el.className = `maze-cell ${state}`;
}

// ---------------------------------------------------------------------------
// Manual Player Movement
// ---------------------------------------------------------------------------

/**
 * Enables manual player mode and places the player at start.
 * @param {Object} maze
 */
function enableManualMode(maze) {
  _isManualMode = true;
  _currentMaze  = maze;
  _playerPos    = { r: maze.start[0], c: maze.start[1] };

  const startEl = getCellEl(_playerPos.r, _playerPos.c);
  if (startEl) startEl.classList.add('player');
}

/**
 * Moves the player by (dr, dc). Returns 'finish' if player reached goal, else null.
 * @param {number} dr
 * @param {number} dc
 * @returns {string|null}
 */
function movePlayer(dr, dc) {
  if (!_currentMaze || !_isManualMode) return null;

  const nr = _playerPos.r + dr;
  const nc = _playerPos.c + dc;

  // Bounds check
  if (nr < 0 || nc < 0 || nr >= _currentMaze.rows || nc >= _currentMaze.cols) return null;
  // Wall check
  if (_currentMaze.grid[nr][nc] === 1) return null;

  // Remove player from old cell (preserve start class if leaving start)
  const oldEl = getCellEl(_playerPos.r, _playerPos.c);
  if (oldEl) oldEl.classList.remove('player');

  _playerPos = { r: nr, c: nc };

  // Add player to new cell
  const newEl = getCellEl(nr, nc);
  if (newEl) newEl.classList.add('player');

  // Check if reached finish
  if (nr === _currentMaze.finish[0] && nc === _currentMaze.finish[1]) {
    return 'finish';
  }

  return null;
}

/**
 * Returns the current player position.
 * @returns {{r: number, c: number}}
 */
function getPlayerPosition() {
  return { ..._playerPos };
}

// ---------------------------------------------------------------------------
// Canvas Preview (for maze-list cards)
// ---------------------------------------------------------------------------

/**
 * Draws a tiny preview of the maze onto a canvas element.
 *
 * @param {Object}        maze      - Maze data object
 * @param {HTMLCanvasElement} canvas - Target canvas
 * @param {number}        size      - Canvas size in px (square)
 */
function drawMazePreview(maze, canvas, size) {
  const ctx = canvas.getContext('2d');
  canvas.width  = size;
  canvas.height = size;

  const cellW = size / maze.cols;
  const cellH = size / maze.rows;

  for (let r = 0; r < maze.rows; r++) {
    for (let c = 0; c < maze.cols; c++) {
      const isStart  = r === maze.start[0]  && c === maze.start[1];
      const isFinish = r === maze.finish[0] && c === maze.finish[1];

      if (isStart)            ctx.fillStyle = '#22c55e';
      else if (isFinish)      ctx.fillStyle = '#ef4444';
      else if (maze.grid[r][c] === 1) ctx.fillStyle = '#111827';
      else                    ctx.fillStyle = '#1e3a5f';

      ctx.fillRect(c * cellW, r * cellH, cellW, cellH);
    }
  }
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

/**
 * Computes a responsive cell size based on container availability and grid dimensions.
 * @param {number} rows
 * @param {number} cols
 * @returns {number} Cell size in px
 */
function computeCellSize(rows, cols) {
  // Target area: respect both width and height constraints
  const maxW = Math.min(window.innerWidth  * 0.55, 700);
  const maxH = Math.min(window.innerHeight * 0.65, 650);

  const byWidth  = Math.floor(maxW / cols);
  const byHeight = Math.floor(maxH / rows);

  const size = Math.min(byWidth, byHeight);

  // Clamp to sensible range
  return Math.max(4, Math.min(size, 52));
}
