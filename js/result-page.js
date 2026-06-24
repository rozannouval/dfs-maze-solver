/**
 * js/result-page.js
 * Logic for Result Analysis Page
 */

document.addEventListener('DOMContentLoaded', async () => {
  await openDatabase();
  loadData();

  document.getElementById('btn-clear-history').addEventListener('click', clearHistory);
});

async function loadData() {
  const results = await getAllResults();

  if (results.length === 0) {
    document.getElementById('results-table').style.display = 'none';
    document.getElementById('overview-grid').style.display = 'none';
    document.getElementById('btn-clear-history').style.display = 'none';
    document.getElementById('empty-state').classList.remove('hide');
    return;
  }

  document.getElementById('results-table').style.display = 'table';
  document.getElementById('overview-grid').style.display = 'grid';
  document.getElementById('btn-clear-history').style.display = 'inline-flex';
  document.getElementById('empty-state').classList.add('hide');

  renderAggregates(results);
  renderTable(results);
}

function renderAggregates(results) {
  const total = results.length;
  document.getElementById('agg-total').textContent = total;

  let maxStack = 0;
  results.forEach(r => {
    if (r.maxStackDepth > maxStack) maxStack = r.maxStackDepth;
  });
  document.getElementById('agg-stack').textContent = maxStack;

  // Compute averages specifically for HARD mazes to show extreme load
  const hardResults = results.filter(r => r.difficulty === 'hard');
  
  if (hardResults.length > 0) {
    let sumTime = 0;
    let sumNodes = 0;
    hardResults.forEach(r => {
      sumTime += r.executionTime;
      sumNodes += r.visitedNodes;
    });

    const avgTime = (sumTime / hardResults.length).toFixed(2);
    const avgNodes = Math.round(sumNodes / hardResults.length);

    document.getElementById('agg-time').textContent = `${avgTime} ms`;
    document.getElementById('agg-nodes').textContent = avgNodes;
  } else {
    document.getElementById('agg-time').textContent = '—';
    document.getElementById('agg-nodes').textContent = '—';
  }
}

function renderTable(results) {
  const tbody = document.getElementById('table-body');
  tbody.innerHTML = '';

  results.forEach(res => {
    const tr = document.createElement('tr');
    
    // Format Date
    const d = new Date(res.timestamp);
    const dateStr = d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

    tr.innerHTML = `
      <td>${dateStr}</td>
      <td>
        <strong>${res.mazeName}</strong><br>
        <span class="col-diff diff-${res.difficulty}" style="margin-top:4px;">${res.difficulty}</span>
      </td>
      <td class="col-num">${res.rows} × ${res.cols}</td>
      <td class="col-num">${res.visitedNodes}</td>
      <td class="col-num">${res.backtrackCount}</td>
      <td class="col-num">${res.pathLength}</td>
      <td class="col-num">${res.maxStackDepth}</td>
      <td class="col-num" style="color:var(--blue-lt)">${res.executionTime} ms</td>
      <td>
        <a href="solver.html?id=${res.mazeId}" class="btn btn-ghost" style="padding:6px 12px; font-size:12px;">Replay</a>
      </td>
    `;
    
    tbody.appendChild(tr);
  });
}

async function clearHistory() {
  if (confirm('Are you sure you want to delete all execution history? This cannot be undone.')) {
    await clearAllResults();
    loadData();
  }
}
