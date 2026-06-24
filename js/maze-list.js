/**
 * js/maze-list.js
 * Logika untuk Halaman Dataset Labirin
 */

document.addEventListener("DOMContentLoaded", async () => {
  // 1. Ambil tingkat kesulitan (level) dari URL
  const params = new URLSearchParams(window.location.search);
  const level = params.get("level");

  // 2. Validasi level
  if (!level || !MAZE_DATA[level]) {
    document.getElementById("empty-state").classList.remove("hide");
    return;
  }

  const mazes = MAZE_DATA[level];

  // Terjemahan level untuk UI
  const levelIndo = { easy: "Mudah", medium: "Sedang", hard: "Sulit" };
  const displayLevel = levelIndo[level] || capitalize(level);

  // 3. Perbarui Header
  document.getElementById("page-title").textContent = `Dataset ${displayLevel}`;
  const badge = document.getElementById("level-badge");
  badge.textContent = displayLevel;
  badge.className = `badge badge-${level}`;

  // 4. Muat hasil sebelumnya untuk mengecek status penyelesaian (dibungkus dalam try-catch agar UI tidak rusak jika IndexedDB gagal)
  const solvedMap = {};
  try {
    await openDatabase();
    const results = await getResultsByDifficulty(level);

    // Buat map pencarian cepat: mazeId -> true (jika berhasil diselesaikan)
    results.forEach((res) => {
      if (res.success) solvedMap[res.mazeId] = true;
    });
  } catch (err) {
    console.error("Gagal memuat hasil dari DB:", err);
  }

  // 5. Render Kartu Labirin
  const container = document.getElementById("maze-container");
  container.innerHTML = "";

  mazes.forEach((maze) => {
    const isSolved = !!solvedMap[maze.id];
    const card = createMazeCard(maze, isSolved);
    container.appendChild(card);
  });
});

/**
 * Membuat elemen DOM untuk satu kartu labirin.
 */
function createMazeCard(maze, isSolved) {
  const a = document.createElement("a");
  a.className = "maze-card glass-card";
  a.href = `solver.html?id=${maze.id}`;

  const nodeCount = maze.rows * maze.cols;

  a.innerHTML = `
    <div class="mc-preview">
      <div class="mc-status ${isSolved ? "solved" : ""}">
        ${isSolved ? "✓ Selesai" : "Belum Selesai"}
      </div>
      <canvas id="preview-${maze.id}"></canvas>
    </div>
    
    <div class="mc-content">
      <div class="mc-title">${maze.name}</div>
      <div class="mc-meta">
        <span>Grid ${maze.rows} × ${maze.cols}</span>
        <span class="mc-meta-nodes">${nodeCount} Node</span>
      </div>
    </div>
    
    <button class="btn btn-ghost mc-btn" tabindex="-1">
      Buka Solver →
    </button>
  `;

  // Gambar pratinjau ke dalam canvas SETELAH elemen dimasukkan ke DOM
  // (menggunakan microtask agar canvas sudah ada di dalam dokumen untuk kalkulasi lebar, meskipun ukuran eksplisit telah diberikan)
  setTimeout(() => {
    const canvas = a.querySelector("canvas");
    if (canvas && typeof drawMazePreview === "function") {
      drawMazePreview(maze, canvas, 160);
    }
  }, 0);

  return a;
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
