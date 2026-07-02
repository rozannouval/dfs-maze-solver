/**
 * scripts/generate-mazes.js
 * 
 * Generates 30 deterministic maze datasets using Mulberry32 seeded PRNG
 * and Iterative Recursive Backtracker algorithm.
 * 
 * Run: node scripts/generate-mazes.js
 */

'use strict';
const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Mulberry32 — fast, high-quality seeded PRNG (always same output for same seed)
// ---------------------------------------------------------------------------
function createRNG(seed) {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(arr, rand) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---------------------------------------------------------------------------
// Maze Generator — Iterative Recursive Backtracker
// ---------------------------------------------------------------------------
function generateMaze(rows, cols, seed) {
  const rand = createRNG(seed);

  // All cells start as walls (1)
  const grid = Array.from({ length: rows }, () => Array(cols).fill(1));

  // Visited tracks which interior "room" cells have been carved
  const visited = Array.from({ length: rows }, () => Array(cols).fill(false));

  // Iterative DFS carving from interior cell (1,1)
  const stack = [[1, 1]];
  grid[1][1] = 0;
  visited[1][1] = true;

  while (stack.length > 0) {
    const [r, c] = stack[stack.length - 1];

    // Candidate directions (step=2 to jump over wall cells)
    const dirs = shuffle([[0, 2], [0, -2], [2, 0], [-2, 0]], rand);

    let carved = false;
    for (const [dr, dc] of dirs) {
      const nr = r + dr;
      const nc = c + dc;
      // Must stay within interior bounds (can reach odd indices up to size-1 or size-2)
      if (nr > 0 && nr < rows && nc > 0 && nc < cols && !visited[nr][nc]) {
        grid[r + dr / 2][c + dc / 2] = 0; // Remove wall between cells
        grid[nr][nc] = 0;                  // Open destination cell
        visited[nr][nc] = true;
        stack.push([nr, nc]);
        carved = true;
        break;
      }
    }

    if (!carved) stack.pop(); // Backtrack when no unvisited neighbors
  }

  // ---- Connect START (0,0) to interior ----
  grid[0][0] = 0;
  if (rows > 1 && cols > 1) {
    grid[1][0] = 0; // path to (1,1)
  }

  // ---- Connect FINISH (rows-1, cols-1) to interior ----
  const fr = rows - 1;
  const fc = cols - 1;
  grid[fr][fc] = 0;

  // We need to ensure the finish cell is connected to the path network.
  // We'll search backwards from finish to the nearest 0.
  // Simple heuristic for block grids: connect up or left.
  if (grid[fr - 1] && grid[fr - 1][fc] !== undefined) {
    grid[fr - 1][fc] = 0;
  }
  if (grid[fr] && grid[fr][fc - 1] !== undefined) {
    grid[fr][fc - 1] = 0;
  }
  // If fr or fc are even, the adjacent cells might just be walls leading nowhere.
  // Let's force an L-shape into the nearest odd interior coordinate to guarantee connection.
  const nearestOddR = fr % 2 === 0 ? fr - 1 : fr;
  const nearestOddC = fc % 2 === 0 ? fc - 1 : fc;
  
  if (nearestOddR > 0 && nearestOddC > 0) {
    for (let r = nearestOddR; r <= fr; r++) grid[r][fc] = 0;
    for (let c = nearestOddC; c <= fc; c++) grid[nearestOddR][c] = 0;
  }

  return grid;
}

// ---------------------------------------------------------------------------
// Seeds (prime numbers for better RNG distribution) — fixed for all 30 mazes
// ---------------------------------------------------------------------------
const SEEDS = {
  easy:   [1009, 2017, 3023, 4049, 5051, 6067, 7079, 8081, 9091, 9973],
  medium: [10007, 11003, 12007, 13001, 14009, 15013, 16007, 17011, 18013, 19001],
  hard:   [20011, 21001, 22003, 23003, 24007, 25013, 26003, 27011, 28001, 29017],
};

const SIZE_MAP = { easy: 10, medium: 15, hard: 20 };
const ID_PREFIX = { easy: 'E', medium: 'M', hard: 'H' };

// ---------------------------------------------------------------------------
// Generate all 30 mazes
// ---------------------------------------------------------------------------
const result = {};

for (const difficulty of ['easy', 'medium', 'hard']) {
  const size = SIZE_MAP[difficulty];
  const prefix = ID_PREFIX[difficulty];
  result[difficulty] = [];

  for (let i = 0; i < 10; i++) {
    const seed = SEEDS[difficulty][i];
    const grid = generateMaze(size, size, seed);
    const num = String(i + 1).padStart(2, '0');

    result[difficulty].push({
      id: `${prefix}-${num}`,
      name: `Maze ${num}`,
      difficulty,
      rows: size,
      cols: size,
      start: [0, 0],
      finish: [size - 1, size - 1],
      grid,
    });
  }
}

// ---------------------------------------------------------------------------
// Format output as clean JS module
// ---------------------------------------------------------------------------
function formatGrid(grid) {
  return '[\n' + grid.map(row => `        [${row.join(',')}]`).join(',\n') + '\n      ]';
}

function formatMaze(maze) {
  return `    {
      id: '${maze.id}',
      name: '${maze.name}',
      difficulty: '${maze.difficulty}',
      rows: ${maze.rows},
      cols: ${maze.cols},
      start: [0, 0],
      finish: [${maze.finish[0]}, ${maze.finish[1]}],
      grid: ${formatGrid(maze.grid)}
    }`;
}

function formatDifficulty(difficulty, mazes) {
  return `  // ${difficulty.toUpperCase()} — ${mazes[0].rows}×${mazes[0].cols} Grid, ${mazes.length} Mazes
  ${difficulty}: [\n${mazes.map(formatMaze).join(',\n')}\n  ]`;
}

const output = `/**
 * data/mazes.js
 * 30 Fixed Maze Datasets — DFS Maze Visualization Research
 *
 * Generated by: scripts/generate-mazes.js
 * Algorithm:    Iterative Recursive Backtracker (Perfect Maze, LIFO Stack)
 * RNG:          Mulberry32 Seeded PRNG
 *
 * Grid Convention:
 *   0 = Path (walkable cell)
 *   1 = Wall (blocked cell)
 *
 * Maze Sizes:
 *   Easy   — 10×10 grid  (10 mazes)
 *   Medium — 15×15 grid  (10 mazes)
 *   Hard   — 20×20 grid  (10 mazes)
 *
 * All mazes are deterministic — same seed always produces same maze.
 * DO NOT MODIFY this file. Regenerate using: node scripts/generate-mazes.js
 */

/* global MAZE_DATA */

const MAZE_DATA = {
${Object.entries(result).map(([d, m]) => formatDifficulty(d, m)).join(',\n\n')}
};
`;

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir);
}

fs.writeFileSync(path.join(dataDir, 'mazes.js'), output, 'utf8');
console.log('Successfully generated data/mazes.js with proper UTF-8 encoding.');
