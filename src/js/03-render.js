/* ---------- 渲染 ---------- */
/* 每日一句：按本地日期固定，跨天自动切换 */
function renderQuote(){
  var d = new Date();
  var dayNum = d.getFullYear()*10000 + (d.getMonth()+1)*100 + d.getDate();
  var idx = dayNum % quotes.length;
  var el = $('quoteText');
  el.style.animation = 'none';
  void el.offsetWidth;
  el.style.animation = '';
  el.textContent = '“' + quotes[idx].t + '”';
  $('quoteAuthor').textContent = '—— ' + quotes[idx].a;
}

function renderStats(){
  var cnt = 0, dist = 0, dur = 0;
  records.forEach(function(r){ cnt++; dist += r.distance; dur += r.dur; });
  $('statCount').textContent = cnt;
  $('statDist').innerHTML = Math.round(dist) + '<small>km</small>';
  $('statTime').textContent = fmtTotalDur(dur);
  var pace = dist > 0 ? dur/dist : null;
  $('statPace').textContent = pace != null ? fmtPace(pace) : '—';

  // 最长距离 / 最快配速（带上那次日期和配速/距离）
  var bestD = null, bestP = null;
  records.forEach(function(r){
    if(!r.distance || !r.dur) return;
    if(!bestD || r.distance > bestD.distance) bestD = r;
    var p = r.dur / r.distance;
    if(!bestP || p < bestP.pace) bestP = { pace:p, rec:r };
  });
  function dateCN(s){
    var p = String(s).split('-');
    return parseInt(p[1],10) + '月' + parseInt(p[2],10) + '日';
  }
  // 一位整数补一个空格，让一位/两位数字上下对齐
  function pad2Num(s){
    var sp = s.split(' ');
    if(sp[0].indexOf('.') === 1) sp[0] = ' ' + sp[0];
    return sp.join(' ');
  }
  function pad2Pace(s){
    if(s.indexOf("'") === 1) s = " " + s;
    return s;
  }
  function bestCells(dist, pace, date){
    return '<span class="bv bv-d">' + dist + ' · </span><span class="bv bv-p">' + pace + ' · </span><span class="bv bv-date">' + date + '</span>';
  }
  $('bestDist').innerHTML = bestD
    ? bestCells(pad2Num(bestD.distance.toFixed(2) + ' km'), pad2Pace(fmtPace(bestD.dur/bestD.distance)), dateCN(bestD.date))
    : '—';
  $('bestPace').innerHTML = bestP
    ? bestCells(pad2Num(bestP.rec.distance.toFixed(2) + ' km'), pad2Pace(fmtPace(bestP.pace)), dateCN(bestP.rec.date))
    : '—';
  return { cnt:cnt, dist:dist, dur:dur };
}

function paceScoreOf(paceSec){
  if(paceSec <= GOAL_PACE) return 1;
  if(paceSec >= PACE_FLOOR) return 0;
  return (PACE_FLOOR - paceSec) / (PACE_FLOOR - GOAL_PACE);
}

// 单次含金量 = 距离达成 × (50% + 50%×配速达成)；乘法不归零，慢跑也有积累
function proofOf(r){
  if(!r || !r.distance || !r.dur) return 0;
  var distDone = Math.min(1, r.distance / GOAL_KM);
  var pace = r.dur / r.distance;
  return distDone * (0.5 + 0.5 * paceScoreOf(pace));
}

// 综合进度取历史最佳单次
function bestProof(){
  var best = null;
  records.forEach(function(r){
    if(!r.distance || !r.dur) return;
    var pct = proofOf(r);
    if(!best || pct > best.pct) best = { dist:r.distance, pace:r.dur/r.distance, pct:pct, date:r.date };
  });
  return best;
}

// 配速环：距离达 8km 视为配速检验达标；配速权重 75% 主导，达成比整体简单
// 配速达成带超额加成：6'00"=100%，每快 15 秒 +5%（如 5'45" → 105%），不封顶
function paceRingScore(paceSec){
  if(paceSec >= PACE_FLOOR) return 0;
  if(paceSec >= GOAL_PACE) return (PACE_FLOOR - paceSec) / (PACE_FLOOR - GOAL_PACE);
  return 1 + (GOAL_PACE - paceSec) / 15 * 0.05;
}
function paceRingOf(r){
  if(!r || !r.distance || !r.dur) return 0;
  var distW8 = Math.min(1, r.distance / GOAL_PACE_KM);
  return distW8 * (0.25 + 0.75 * paceRingScore(r.dur / r.distance));
}
function bestPaceRing(){
  var best = null;
  records.forEach(function(r){
    if(!r.distance || !r.dur) return;
    var pct = paceRingOf(r);
    if(!best || pct > best.pct) best = { dist:r.distance, pace:r.dur/r.distance, pct:pct, date:r.date };
  });
  return best;
}

// 目标样式：圆环 / 山峰 双皮肤，共用同一套指标计算
var RING_C = { dist: 2 * Math.PI * 44, pace: 2 * Math.PI * 36, goal: 2 * Math.PI * 28 };
function setRing(arcId, pctId, pct, C){
  var clamped = Math.max(0, Math.min(1, pct));
  $(arcId).style.strokeDasharray = (clamped * C) + ' ' + C;
  $(pctId).textContent = Math.round(pct * 100) + '%';
  $(arcId).classList.toggle('done', pct >= 1);
}
function renderRings(distPct, pacePct, goalPct){
  setRing('ringDistArc', 'ringDistPct', distPct, RING_C.dist);
  setRing('ringPaceArc', 'ringPacePct', pacePct, RING_C.pace);
  setRing('ringGoalArc', 'ringGoalPct', goalPct, RING_C.goal);
  $('ringGoalPctSub').textContent = Math.round(goalPct * 100) + '%';
  $('ringGoalPct').classList.toggle('done', goalPct >= 1);
}

// 山峰：山影轮廓=距离（描边进度）、山体=配速（自山脚向上染色）、峰顶旗=整体（旗大小+百分比）
var MT = { baseY: 88, cache: null };
function mtMetrics(){
  if(MT.cache) return MT.cache;
  var L = $('mtPath').getTotalLength();
  var minY = 1e9, peakFrac = 0;
  for(var i = 0; i <= 120; i++){
    var p = $('mtPath').getPointAtLength(L * i / 120);
    if(p.y < minY){ minY = p.y; peakFrac = i / 120; }
  }
  MT.cache = { L: L, h: MT.baseY - minY, peakFrac: peakFrac };
  return MT.cache;
}
function paintMountain(distPct, pacePct, goalPct){
  var m = mtMetrics();

  // 山影轮廓=距离：自山脚向上浮现（0 最低，100 填满）
  var dDist = Math.max(0, Math.min(1, distPct));
  var cutD = MT.baseY - dDist * m.h;
  $('mtRiseRect').setAttribute('y', cutD.toFixed(1));
  $('mtRiseRect').setAttribute('height', (dDist * m.h).toFixed(1));

  // 山体=配速：自山脚向上染色（0 最低，100 填满）
  var pPace = Math.max(0, Math.min(1, pacePct));
  var cutP = MT.baseY - pPace * m.h;
  $('mtBody').setAttribute('y', cutP.toFixed(1));
  $('mtBody').setAttribute('height', (pPace * m.h).toFixed(1));
  $('mtBodyGlow').setAttribute('y', cutP.toFixed(1));
  $('mtBodyGlow').setAttribute('height', (pPace * m.h).toFixed(1));

  // 峰顶旗=整体：旗子沿山坡攀升，位置代表进度（0 山脚，100 峰顶）
  var gPct = Math.max(0, Math.min(1, goalPct));
  var pt = $('mtPath').getPointAtLength(m.L * m.peakFrac * gPct);
  var fx = Math.max(14, pt.x);
  var fy = pt.y;
  $('mtPole').setAttribute('x1', fx.toFixed(1));
  $('mtPole').setAttribute('y1', fy.toFixed(1));
  $('mtPole').setAttribute('x2', fx.toFixed(1));
  $('mtPole').setAttribute('y2', (fy - 9).toFixed(1));
  var d = 'M ' + fx.toFixed(1) + ' ' + (fy - 9).toFixed(1)
        + ' L ' + (fx + 8).toFixed(1) + ' ' + (fy - 6).toFixed(1)
        + ' L ' + fx.toFixed(1) + ' ' + (fy - 3).toFixed(1) + ' Z';
  $('mtFlag').setAttribute('d', d);
  $('mtFlagGlow').setAttribute('d', d);
  $('mtPillBg').setAttribute('x', (fx - 8).toFixed(1));
  $('mtPillBg').setAttribute('y', (fy - 18.3).toFixed(1));
  $('mtPill').setAttribute('x', fx.toFixed(1));
  $('mtPill').setAttribute('y', (fy - 13.3).toFixed(1));
  $('mtPill').textContent = Math.round(goalPct * 100) + '%';
}

function renderGoal(){
  // 距离：最长单次 / 10km，不封顶
  var maxD = 0, maxDrec = null;
  records.forEach(function(r){ if(r.distance && r.distance > maxD){ maxD = r.distance; maxDrec = r; } });
  var distPct = maxD / GOAL_KM;

  // 配速：历史最佳单次的配速含金量（考虑距离）
  var bp = bestPaceRing();
  var pacePct = bp ? bp.pct : 0;

  // 整体：历史最佳单次含金量
  var b = bestProof();
  var goalPct = b ? b.pct : 0;

  renderRings(distPct, pacePct, goalPct);
  paintMountain(distPct, pacePct, goalPct);

  // 说明：最长距离 + 最佳配速那次
  $('ringNote').textContent =
    (maxDrec ? '最长 ' + maxDrec.distance.toFixed(2) + ' km' : '—') +
    (bp ? ' · 最佳配速 ' + fmtPace(bp.pace) + ' @ ' + bp.dist.toFixed(2) + ' km' : '');

  // 上一次：最近一次跑步的整体含金量
  var last = null;
  records.forEach(function(r){ if(!last || r.ts > last.ts) last = r; });
  if(last && last.distance && last.dur){
    var lastPct = proofOf(last);
    $('goalLastBar').style.width = (lastPct * 100) + '%';
    $('goalLastVal').textContent = Math.round(lastPct * 100) + '%';
  } else {
    $('goalLastBar').style.width = '0%';
    $('goalLastVal').textContent = '—';
  }

  if(!b){
    $('goalPred').textContent = '';
    $('goalPoem').textContent = '千里之行，始于足下。';
    return;
  }
  var achieved = b.dist >= GOAL_KM - 0.005 && b.pace <= GOAL_PACE + 0.01;
  $('goalPred').textContent = '按此配速，10 km 预计 ' + fmtDuration(Math.round(b.pace * GOAL_KM));
  var poem;
  if(achieved) poem = '一小时十公里，抵达了。风替你欢呼。';
  else if(b.pct < 0.25) poem = '路还长，先跑起来。';
  else if(b.pct < 0.7) poem = '每一步，都在靠近那一小时。';
  else poem = '快到了，再远一点，再快一点。';
  $('goalPoem').textContent = poem;
}
