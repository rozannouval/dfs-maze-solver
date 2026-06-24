/**
 * js/statistics.js
 * Statistics Display Module
 *
 * Manages the real-time statistics panel in the solver page.
 * Reads DOM elements by ID and updates their text content.
 */

// ---------------------------------------------------------------------------
// Expected DOM element IDs (defined in solver.html):
//   stat-total-nodes     — Total node count of the maze
//   stat-visited         — Visited nodes so far
//   stat-backtrack       — Backtrack count
//   stat-path-length     — Solution path length (0 until solved)
//   stat-exec-time       — Execution time (ms, pure computation)
//   stat-stack-size      — Current DFS stack size
//   stat-max-stack       — Maximum stack depth reached
// ---------------------------------------------------------------------------

const STAT_IDS = {
  totalNodes : 'stat-total-nodes',
  visited    : 'stat-visited',
  backtrack  : 'stat-backtrack',
  pathLength : 'stat-path-length',
  execTime   : 'stat-exec-time',
  stackSize  : 'stat-stack-size',
  maxStack   : 'stat-max-stack',
};

/**
 * Sets the total node count (maze size × maze size).
 * Called once when a maze is loaded.
 * @param {number} total
 */
function setTotalNodes(total) {
  _setText(STAT_IDS.totalNodes, total);
}

/**
 * Updates all live statistics during DFS animation.
 * @param {Object} stats
 * @param {number} stats.visitedNodes
 * @param {number} stats.backtrackCount
 * @param {number} [stats.pathLength]
 * @param {number} [stats.executionTime]  — ms, shown only when algorithm completes
 * @param {number} stats.stackSize
 * @param {number} stats.maxStackDepth
 */
function updateStats(stats) {
  if (stats.visitedNodes   !== undefined) _setText(STAT_IDS.visited,    stats.visitedNodes);
  if (stats.backtrackCount !== undefined) _setText(STAT_IDS.backtrack,  stats.backtrackCount);
  if (stats.pathLength     !== undefined && stats.pathLength > 0) {
    _setText(STAT_IDS.pathLength, stats.pathLength);
  }
  if (stats.executionTime  !== undefined) {
    _setText(STAT_IDS.execTime, `${stats.executionTime} ms`);
  }
  if (stats.stackSize      !== undefined) _setText(STAT_IDS.stackSize,  stats.stackSize);
  if (stats.maxStackDepth  !== undefined) _setText(STAT_IDS.maxStack,   stats.maxStackDepth);
}

/**
 * Resets all statistics displays to their default "—" state.
 */
function resetStats() {
  Object.values(STAT_IDS).forEach((id) => _setText(id, '—'));
}

// ---------------------------------------------------------------------------
// Stack Visualization
// ---------------------------------------------------------------------------

/**
 * Updates the DFS stack visualization panel.
 * Renders each stack entry as a row: "Node (row, col)"
 * The TOP of the stack (current cell being explored) is at the top of the list.
 *
 * @param {Array<[number,number]>} stack - Array of [r, c] pairs, bottom-to-top
 * @param {HTMLElement} container - The stack list container element
 */
function updateStackVisualization(stack, container) {
  if (!container) return;

  const reversed = [...stack].reverse(); // Show top-of-stack at visual top
  const maxVisible = 20;
  const display = reversed.slice(0, maxVisible);

  container.innerHTML = '';

  if (display.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'stack-empty';
    empty.textContent = 'Stack is empty';
    container.appendChild(empty);
    return;
  }

  display.forEach(([r, c], idx) => {
    const item = document.createElement('div');
    item.className = 'stack-item';
    if (idx === 0) item.classList.add('stack-top'); // Highlight TOP

    const label = document.createElement('span');
    label.className = 'stack-label';
    label.textContent = idx === 0 ? '▶ TOP' : `  ${idx + 1}`;

    const coord = document.createElement('span');
    coord.className = 'stack-coord';
    coord.textContent = `Node (${r}, ${c})`;

    item.appendChild(label);
    item.appendChild(coord);
    container.appendChild(item);
  });

  // Show overflow indicator
  if (reversed.length > maxVisible) {
    const more = document.createElement('div');
    more.className = 'stack-more';
    more.textContent = `… ${reversed.length - maxVisible} more nodes`;
    container.appendChild(more);
  }
}

/**
 * Clears the stack visualization panel.
 * @param {HTMLElement} container
 */
function clearStackVisualization(container) {
  if (!container) return;
  container.innerHTML = '';
  const empty = document.createElement('div');
  empty.className = 'stack-empty';
  empty.textContent = 'Stack is empty';
  container.appendChild(empty);
}

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

function _setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = String(value);
}
