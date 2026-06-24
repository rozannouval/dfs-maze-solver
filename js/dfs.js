/**
 * js/dfs.js
 * Depth First Search (DFS) Algorithm Module
 *
 * This module implements DFS for maze solving as described in the research paper:
 * "PENERAPAN ALGORITMA DEPTH FIRST SEARCH (DFS) DALAM PENYELESAIAN LABIRIN BERBASIS WEB"
 *
 * Architecture:
 *   1. Graph Representation  — The 2D grid maze is conceptualized as an undirected,
 *                              unweighted graph. Each path cell (value=0) is a node;
 *                              adjacent path cells share an edge.
 *
 *   2. DFS Algorithm         — Iterative implementation using an explicit LIFO Stack
 *                              (avoids call-stack overflow on large mazes).
 *
 *   3. Separation of Concerns — computeDFS() runs the full algorithm and measures
 *                              PURE execution time (no animation delays included).
 *                              solveDFS() then replays the recorded steps visually.
 *
 * Node Exploration Order: Up → Right → Down → Left (standard academic convention)
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** DFS exploration direction order: [dr, dc] — Up, Right, Down, Left */
const DFS_DIRECTIONS = [[-1, 0], [0, 1], [1, 0], [0, -1]];

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

/** Delay utility for animation pacing */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Returns all walkable (path=0) neighbors of cell (r, c).
 * @param {number} r
 * @param {number} c
 * @param {Object} maze - {rows, cols, grid}
 * @returns {Array<[number,number]>}
 */
function getNeighbors(r, c, maze) {
  const neighbors = [];
  for (const [dr, dc] of DFS_DIRECTIONS) {
    const nr = r + dr;
    const nc = c + dc;
    if (nr >= 0 && nc >= 0 && nr < maze.rows && nc < maze.cols && maze.grid[nr][nc] === 0) {
      neighbors.push([nr, nc]);
    }
  }
  return neighbors;
}

// ---------------------------------------------------------------------------
// Phase 1: Pure Computation  (execution time measured HERE, no setTimeout)
// ---------------------------------------------------------------------------

/**
 * Runs the complete DFS algorithm and records every step.
 * Execution time is measured PURELY for the computation phase,
 * excluding any animation or I/O delays.
 *
 * @param {Object} maze - {rows, cols, grid, start:[r,c], finish:[r,c]}
 * @returns {{
 *   steps: Array<StepObject>,
 *   finalStats: {
 *     visitedNodes: number,
 *     backtrackCount: number,
 *     pathLength: number,
 *     executionTime: number,  // ms — pure computation
 *     maxStackDepth: number,
 *     success: boolean
 *   }
 * }}
 */
function computeDFS(maze) {
  const steps = [];

  const [sr, sc] = maze.start;
  const [fr, fc] = maze.finish;

  const visited = new Set();     // Tracks visited cell keys "r,c"
  const parent  = new Map();     // Maps "r,c" → parent "r,c" (for path reconstruction)
  const stack   = [];            // Explicit LIFO stack  [[r, c], ...]

  let visitedNodes  = 0;
  let backtrackCount = 0;
  let maxStackDepth  = 0;
  let pathLength     = 0;

  // ---- Start timing BEFORE algorithm begins ----
  const t0 = performance.now();

  // ---- Initialize: push start node ----
  const startKey = `${sr},${sc}`;
  stack.push([sr, sc]);
  visited.add(startKey);
  parent.set(startKey, null);
  visitedNodes = 1;

  steps.push({
    type: 'visit',
    r: sr,
    c: sc,
    stack: [[sr, sc]],
    stats: { visitedNodes: 1, backtrackCount: 0, pathLength: 0, stackSize: 1, maxStackDepth: 1 },
  });

  // ---- Main DFS Loop ----
  while (stack.length > 0) {
    maxStackDepth = Math.max(maxStackDepth, stack.length);

    const [r, c] = stack[stack.length - 1]; // Peek top (do NOT pop yet)
    const cellKey = `${r},${c}`;

    // ---- Check if this is the finish cell ----
    if (r === fr && c === fc) {
      // Reconstruct solution path via parent chain
      const path = [];
      let curr = cellKey;
      while (curr !== null) {
        const [pr, pc] = curr.split(',').map(Number);
        path.unshift([pr, pc]);
        curr = parent.get(curr);
      }
      pathLength = path.length;

      steps.push({
        type: 'solution',
        path,
        stack: [...stack],
        stats: {
          visitedNodes,
          backtrackCount,
          pathLength,
          stackSize: stack.length,
          maxStackDepth,
        },
      });
      break;
    }

    // ---- Find first unvisited neighbor ----
    const neighbors = getNeighbors(r, c, maze);
    const unvisited = neighbors.filter(([nr, nc]) => !visited.has(`${nr},${nc}`));

    if (unvisited.length === 0) {
      // ---- Dead end: backtrack ----
      stack.pop();
      backtrackCount++;

      steps.push({
        type: 'backtrack',
        r, c,
        stack: [...stack],
        stats: {
          visitedNodes,
          backtrackCount,
          pathLength: 0,
          stackSize: stack.length,
          maxStackDepth,
        },
      });
    } else {
      // ---- Advance: visit first unvisited neighbor ----
      const [nr, nc] = unvisited[0];
      const neighborKey = `${nr},${nc}`;

      visited.add(neighborKey);
      parent.set(neighborKey, cellKey);
      visitedNodes++;
      stack.push([nr, nc]);

      steps.push({
        type: 'visit',
        r: nr,
        c: nc,
        stack: [...stack],
        stats: {
          visitedNodes,
          backtrackCount,
          pathLength: 0,
          stackSize: stack.length,
          maxStackDepth,
        },
      });
    }
  }

  // ---- End timing AFTER algorithm completes ----
  const executionTime = performance.now() - t0;

  // ---- Handle no-solution case ----
  const lastStep = steps[steps.length - 1];
  const success = lastStep && lastStep.type === 'solution';

  if (!success && (lastStep.type !== 'no_solution')) {
    steps.push({
      type: 'no_solution',
      stack: [],
      stats: {
        visitedNodes,
        backtrackCount,
        pathLength: 0,
        stackSize: 0,
        maxStackDepth,
      },
    });
  }

  // Attach execution time to all stat snapshots
  const finalStats = {
    visitedNodes,
    backtrackCount,
    pathLength,
    executionTime: parseFloat(executionTime.toFixed(4)),
    maxStackDepth,
    success,
  };

  return { steps, finalStats };
}

// ---------------------------------------------------------------------------
// Phase 2: Animated Replay  (visual only — no timing measured here)
// ---------------------------------------------------------------------------

/**
 * Animates the DFS solution step by step.
 * Calls renderer and statistics callbacks at each step.
 *
 * @param {Object} maze          - Maze object
 * @param {number} speedMs       - Delay per step in ms (e.g. 30–300)
 * @param {Object} callbacks     - {
 *   onVisit(r, c)           — called when a cell is first visited
 *   onBacktrack(r, c)       — called when a cell is backtracked
 *   onSolution(path)        — called with solution path array
 *   onNoSolution()          — called if maze has no solution
 *   onStackUpdate(stack)    — called with current stack array at each step
 *   onStatsUpdate(stats)    — called with current stats at each step
 * }
 * @returns {Promise<Object>} finalStats
 */
async function solveDFS(maze, speedMs, callbacks) {
  const { onVisit, onBacktrack, onSolution, onNoSolution, onStackUpdate, onStatsUpdate } = callbacks;

  // Run pure computation (measures execution time accurately)
  const { steps, finalStats } = computeDFS(maze);

  // Replay steps with animation delays
  for (const step of steps) {
    switch (step.type) {
      case 'visit':
        if (onVisit) onVisit(step.r, step.c);
        break;

      case 'backtrack':
        if (onBacktrack) onBacktrack(step.r, step.c);
        break;

      case 'solution':
        if (onSolution) await onSolution(step.path);
        break;

      case 'no_solution':
        if (onNoSolution) onNoSolution();
        break;
    }

    // Update stack visualization and statistics after each step
    if (onStackUpdate && step.stack !== undefined) onStackUpdate(step.stack);
    if (onStatsUpdate && step.stats) {
      onStatsUpdate({ ...step.stats, executionTime: finalStats.executionTime });
    }

    await sleep(speedMs);
  }

  return finalStats;
}
