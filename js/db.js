/**
 * js/db.js
 * IndexedDB Storage Module — Stores DFS result records only.
 * Maze data is hardcoded in data/mazes.js (no maze store needed).
 *
 * Schema: DFSMazeDB v2 → Object Store "results"
 */

const DB_NAME = 'DFSMazeDB';
const DB_VERSION = 2;
let _db = null;

/**
 * Opens (or creates/upgrades) the IndexedDB database.
 * Must be called before any other db function.
 * @returns {Promise<IDBDatabase>}
 */
function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(new Error('Failed to open database'));

    request.onsuccess = (event) => {
      _db = event.target.result;
      resolve(_db);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // Remove legacy stores from v1
      if (db.objectStoreNames.contains('mazes')) {
        db.deleteObjectStore('mazes');
      }

      // Create results store (auto-increment primary key)
      if (!db.objectStoreNames.contains('results')) {
        const store = db.createObjectStore('results', {
          keyPath: 'id',
          autoIncrement: true,
        });
        store.createIndex('mazeId',    'mazeId',    { unique: false });
        store.createIndex('difficulty','difficulty', { unique: false });
        store.createIndex('timestamp', 'timestamp',  { unique: false });
      }
    };
  });
}

/**
 * Saves a DFS result record to IndexedDB.
 * @param {Object} result
 * @param {string} result.mazeId         - e.g. 'E-01'
 * @param {string} result.mazeName       - e.g. 'Maze 01'
 * @param {string} result.difficulty     - 'easy' | 'medium' | 'hard'
 * @param {number} result.rows
 * @param {number} result.cols
 * @param {number} result.visitedNodes
 * @param {number} result.backtrackCount
 * @param {number} result.pathLength
 * @param {number} result.executionTime  - pure computation time (ms)
 * @param {number} result.maxStackDepth
 * @param {boolean} result.success
 * @returns {Promise<number>} Generated ID
 */
function saveResult(result) {
  return new Promise((resolve, reject) => {
    const transaction = _db.transaction(['results'], 'readwrite');
    const store = transaction.objectStore('results');
    const request = store.put({ ...result, timestamp: Date.now() });
    request.onsuccess = () => resolve(request.result);
    request.onerror  = () => reject(new Error('Failed to save result'));
  });
}

/**
 * Retrieves all DFS result records, sorted by timestamp descending.
 * @returns {Promise<Array>}
 */
function getAllResults() {
  return new Promise((resolve, reject) => {
    const transaction = _db.transaction(['results'], 'readonly');
    const store = transaction.objectStore('results');
    const request = store.getAll();
    request.onsuccess = () => resolve(
      (request.result || []).sort((a, b) => b.timestamp - a.timestamp)
    );
    request.onerror = () => reject(new Error('Failed to get results'));
  });
}

/**
 * Retrieves all results for a given difficulty level.
 * @param {string} difficulty
 * @returns {Promise<Array>}
 */
function getResultsByDifficulty(difficulty) {
  return new Promise((resolve, reject) => {
    const transaction = _db.transaction(['results'], 'readonly');
    const store = transaction.objectStore('results');
    const index = store.index('difficulty');
    const request = index.getAll(difficulty);
    request.onsuccess = () => resolve(request.result || []);
    request.onerror  = () => reject(new Error('Failed to get results by difficulty'));
  });
}

/**
 * Retrieves the most recent result for a given maze ID.
 * @param {string} mazeId
 * @returns {Promise<Object|undefined>}
 */
function getResultByMazeId(mazeId) {
  return new Promise((resolve, reject) => {
    const transaction = _db.transaction(['results'], 'readonly');
    const store = transaction.objectStore('results');
    const index = store.index('mazeId');
    const request = index.getAll(mazeId);
    request.onsuccess = () => {
      const results = (request.result || []).sort((a, b) => b.timestamp - a.timestamp);
      resolve(results[0]);
    };
    request.onerror = () => reject(new Error('Failed to get result by mazeId'));
  });
}

/**
 * Clears all result records from the database.
 * @returns {Promise<void>}
 */
function clearAllResults() {
  return new Promise((resolve, reject) => {
    const transaction = _db.transaction(['results'], 'readwrite');
    const store = transaction.objectStore('results');
    const request = store.clear();
    request.onsuccess = () => resolve();
    request.onerror  = () => reject(new Error('Failed to clear results'));
  });
}