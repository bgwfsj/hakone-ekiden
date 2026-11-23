/* ---------- 趋势图表 ---------- */
function recentRuns(n){
  var arr = records.filter(function(r){ return r.distance > 0 && r.dur > 0; });
  arr.sort(function(a,b){ return a.ts - b.ts; });
  return arr.slice(-n);
}
function monthDist(k){
  var now = new Date();
  var buckets = [];
  for(var i = k-1; i >= 0; i--){
    var d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({ y:d.getFullYear(), m:d.getMonth() });
  }
  return buckets.map(function(b){
    var dist = 0;
    records.forEach(function(r){
      var dt = new Date(r.ts);
      if(dt.getFullYear() === b.y && dt.getMonth() === b.m) dist += r.distance;
    });
    return { y:b.y, m:b.m, dist:dist };
  });
}
function renderPaceChart(){
  var box = $('paceChart');
  var runs = recentRuns(7);
  if(!runs.length){
    box.innerHTML = '<div class="chart-empty">跑起来后，这里会出现你的配速曲线。</div>';
    return;
  }
  var W = 340, H = 150, L = 46, R = 8, T = 18, B = 30;
  var innerW = W - L - R, innerH = H - T - B;
  var paceMin = 240, paceMax = 600;
  var goalY = T + (GOAL_PACE - paceMin) / (paceMax - paceMin) * innerH;
  var pts = runs.map(function(r, i){
    var pace = r.dur / r.distance;
    var t = Math.max(0, Math.min(1, (pace - paceMin) / (paceMax - paceMin)));
    return {
      x: L + innerW * (runs.length === 1 ? 0.5 : i / (runs.length - 1)),
      y: T + t * innerH,
      pace: pace,
      date: r.date
    };
  });
  var s = '<line x1="' + L + '" y1="' + goalY.toFixed(1) + '" x2="' + (W - R) + '" y2="' + goalY.toFixed(1) + '" stroke="#94a3b8" stroke-dasharray="4 4" stroke-width="1" opacity=".6"/>';
  s += '<text x="' + (L - 6) + '" y="' + (goalY + 3).toFixed(1) + '" text-anchor="end" font-size="9" fill="#94a3b8">6&#39;00&quot;</text>';
  var line = pts.map(function(p){ return p.x.toFixed(1) + ',' + p.y.toFixed(1); }).join(' ');
  s += '<polyline points="' + line + '" fill="none" stroke="#8aa0b0" stroke-width="1.4" stroke-linejoin="round" stroke-linecap="round" opacity=".75"/>';
  pts.forEach(function(p){
    var ok = p.pace <= GOAL_PACE + 0.01;
    var col = ok ? '#10a77a' : '#3b82f6';
    s += '<circle cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" r="4" fill="' + col + '" stroke="#fff" stroke-width="1.5"/>';
    s += '<text x="' + p.x.toFixed(1) + '" y="' + (p.y - 8).toFixed(1) + '" text-anchor="middle" font-size="9" fill="' + col + '" font-weight="600">' + fmtPace(p.pace) + '</text>';
  });
  pts.forEach(function(p){
    var md = p.date ? p.date.slice(5).replace('-', '/') : '';
    s += '<text x="' + p.x.toFixed(1) + '" y="' + (H - B + 15) + '" text-anchor="middle" font-size="8.5" fill="#8aa0b0">' + md + '</text>';
  });
  box.innerHTML = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="配速趋势">' + s + '</svg>';
}
function renderMonthChart(){
  var box = $('monthChart');
  var months = monthDist(6);
  var has = months.some(function(b){ return b.dist > 0; });
  if(!has){
    box.innerHTML = '<div class="chart-empty">跑起来后，这里会出现月度距离。</div>';
    return;
  }
  var W = 340, H = 150, L = 20, R = 12, T = 20, B = 26;
  var innerW = W - L - R, innerH = H - T - B;
  var max = 1;
  months.forEach(function(b){ if(b.dist > max) max = b.dist; });
  var bw = innerW / 6;
  var now = new Date();
  var s = '';
  months.forEach(function(b, i){
    var x = L + bw * i + bw * 0.5;
    var bh = b.dist > 0 ? Math.max(3, b.dist / max * innerH) : 0;
    var y = T + innerH - bh;
    var cur = b.y === now.getFullYear() && b.m === now.getMonth();
    var col = cur ? '#10a77a' : '#5aa9e6';
    s += '<rect x="' + (x - bw*0.32).toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + (bw*0.64).toFixed(1) + '" height="' + bh.toFixed(1) + '" rx="4" fill="' + col + '" opacity="' + (b.dist > 0 ? .9 : .15) + '"/>';
    if(b.dist > 0){
      s += '<text x="' + x.toFixed(1) + '" y="' + (y - 6).toFixed(1) + '" text-anchor="middle" font-size="9" fill="#3d5566" font-weight="600">' + (b.dist >= 10 ? Math.round(b.dist) : b.dist.toFixed(1)) + '</text>';
    }
    var lbl = cur ? '本月' : ((b.m + 1) + '月');
    s += '<text x="' + x.toFixed(1) + '" y="' + (H - B + 15) + '" text-anchor="middle" font-size="9" fill="' + (cur ? '#10a77a' : '#8aa0b0') + '">' + lbl + '</text>';
  });
  box.innerHTML = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="月度距离">' + s + '</svg>';
}
function renderTrend(){
  renderPaceChart();
  renderMonthChart();
}
