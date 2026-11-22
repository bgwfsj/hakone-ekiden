(function(){
'use strict';

var KEY = 'hakone_records_v1';
var GOAL_KM = 10;
var GOAL_PACE = 360; // 6'00"/km，单位秒
var PACE_FLOOR = 480; // 8'00''/km：配速达成 0% 的锚点

function $(id){ return document.getElementById(id); }

var quotes = [
  { t:'今天不想跑，所以才去跑，这才是长距离跑者的思维方式。', a:'村上春树 · 当我谈跑步时我谈些什么' },
  { t:'痛楚难以避免，而磨难可以选择。', a:'村上春树 · 当我谈跑步时我谈些什么' },
  { t:'无论何等微不足道的举动，只要日日坚持，总会生出某种东西来。', a:'村上春树 · 当我谈跑步时我谈些什么' },
  { t:'人类没有极限。', a:'基普乔格' },
  { t:'赢得比赛最好的方式，是跑自己的节奏。', a:'基普乔格' },
  { t:'当努力变得痛苦时，还能再推自己一把的人，才会赢。', a:'罗杰·班尼斯特' },
  { t:'不尽全力，便是辜负天赋。', a:'史蒂夫·普雷方丹' },
  { t:'跑得用力，变得强大，想得远大。', a:'莫·法拉' },
  { t:'奇迹不是跑完全程，而是有勇气迈出第一步。', a:'约翰·宾厄姆' },
  { t:'如果你对人性的信念动摇了，去看一场马拉松吧。', a:'凯瑟琳·斯威策' },
  { t:'长跑的对手，永远是过去的自己。', a:'三浦紫苑 · 强风吹拂' },
  { t:'千里之行，始于足下。', a:'老子' },
  { t:'人生就像一场马拉松，重要的不是跑多快，而是坚持到终点。', a:'跑步俗语' },
  { t:'跑步，是你与自己的对话，不需要观众。', a:'跑步随想' },
  { t:'慢一点也没关系，一直在跑就好。', a:'跑步随想' },
  { t:'风知道你的每一步。', a:'跑步随想' },
  { t:'跑过的路，不会说谎。', a:'跑步随想' },
  { t:'一步，又一步，十公里就在那里。', a:'跑步随想' }
];

var APP_VERSION = '1.0.22';
var APP_CHANGELOG = [
  'v1.0.22 · 菜单新增弹框配色，可统一设置所有弹框背景颜色',
  'v1.0.21 · 记录完成弹出击掌庆祝（屏幕晃动＋礼花）；记录表单新增距离/时长/感受预选值，可在菜单修改；距离时长默认显示 0',
  'v1.0.20 · 背景与卡片配色新增 6 种舒适绿色（浅草绿/抹茶绿/鼠尾草绿/苔绿/海沫绿/青瓷绿）',
  'v1.0.19 · 记录完成弹出「强！」鼓励；日历跑步日改为「强」字；菜单新增背景选择与卡片配色',
  'v1.0.18 · 下载完成提示带上新版本号',
  'v1.0.17 · 修复在线更新下载完成后闪退：进度通知缺少小图标导致系统崩溃，已补上并加固',
  'v1.0.16 · 在线更新防重复触发：下载/安装进行中再点检查更新不会重复下载',
  'v1.0.15 · 在线更新安装改回 FileProvider 优先（1.0.6 验证过的路径），系统会话兜底；安装成功有通知提醒',
  'v1.0.14 · 在线更新微调：诊断日志记录实际下载通道，失败提示更明确',
  'v1.0.13 · 检查更新更稳：新增 jsDelivr / raw 国内友好通道与备用下载通道，多通道自动轮询',
  'v1.0.12 · 修复在线更新安装：安装移到后台线程、安装结果明确提示，避免下载完成卡住闪退；新增「导出诊断日志」',
  'v1.0.11 · 统计重排：次数与平均配速一行、距离与时长一行，手机上更清爽',
  'v1.0.10 · 修复在线更新安装：改用系统安装会话，异常不再闪退并提示手动安装',
  'v1.0.9 · 目标框重排：含金量在进度条之上、最佳一次在下方且去掉达成%；总距离显示整数；最长距离/最快配速统一「距离·配速·日期」并补位对齐；平均配速并入总统计',
  'v1.0.8 · 优化在线更新：直连 GitHub 不畅时自动切换镜像通道，检查与下载更稳',
  'v1.0.7 · 新增数据导入导出（JSON）；左上角改名「你喜欢跑步吗？」；目标进度不再归零，慢跑也有积累；日历详情显示每次达成；日历新增本月次数/距离/时长；翻月只跳有数据的月份',
  'v1.0.6 · 应用名改为「强风吹拂2」',
  'v1.0.5 · 桌面图标加柔和粉色底色，深色桌面下更清晰',
  'v1.0.4 · 桌面图标改为透明底跑者剪影（完整保留两条腿）',
  'v1.0.3 · 修复应用图标：改为整图展示（白底+跑者剪影）',
  'v1.0.2 · 修复应用图标：小人放入圆形安全区、去掉灰色残留',
  'v1.0.1 · 名言改为每日一句：按日期固定、不可刷新、去掉卡片',
  'v1.0.0 · 首版：跑步记录、统计、目标含金量、日历、在线更新与自动备份'
];

var records = load();
var calCursor = new Date();
var editingId = null;
var deletingId = null;

/* ---------- 存储 ---------- */
function load(){
  try{
    var raw = localStorage.getItem(KEY);
    var arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  }catch(e){ return []; }
}
function save(){
  try{ localStorage.setItem(KEY, JSON.stringify(records)); }catch(e){}
}

/* ---------- 数据导入导出 ---------- */
function exportPayload(){
  return JSON.stringify({
    app: 'hakone-ekiden',
    version: APP_VERSION,
    exportedAt: new Date().toISOString(),
    records: records
  });
}
function exportFileName(){
  var d = new Date();
  return '强风吹拂2-存档-' + d.getFullYear() + pad(d.getMonth()+1) + pad(d.getDate()) + '-' + pad(d.getHours()) + pad(d.getMinutes()) + '.json';
}
function normalizeRec(r, seen){
  if(!r || typeof r !== 'object') return null;
  var dist = Number(r.distance);
  var dur = Number(r.dur);
  if(!isFinite(dist) || dist <= 0 || !isFinite(dur) || dur <= 0) return null;
  var ts = Number(r.ts);
  if(!isFinite(ts) || ts <= 0) ts = Date.now();
  var id = (typeof r.id === 'string' && r.id) ? r.id : uid();
  if(seen[id]) return null; // 已有相同 id，跳过
  seen[id] = true;
  var d = new Date(ts);
  return {
    id: id,
    ts: ts,
    date: (typeof r.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(r.date)) ? r.date : fmtDate(d),
    distance: Math.round(dist*100)/100,
    dur: Math.round(dur),
    note: (typeof r.note === 'string') ? r.note.slice(0, 100) : ''
  };
}
function parseImport(jsonStr){
  var obj;
  try{ obj = JSON.parse(jsonStr); }catch(e){ return null; }
  var arr = (obj && Array.isArray(obj.records)) ? obj.records : (Array.isArray(obj) ? obj : null);
  if(!arr) return null;
  var seen = {};
  records.forEach(function(r){ if(r && r.id) seen[r.id] = true; });
  var out = [];
  arr.forEach(function(r){
    var n = normalizeRec(r, seen);
    if(n) out.push(n);
  });
  return out;
}
function doImportJson(jsonStr){
  if(typeof jsonStr !== 'string'){ toast('导入失败：内容无效'); return; }
  var added = parseImport(jsonStr);
  if(!added){ toast('导入失败：不是有效的存档 JSON'); return; }
  if(!added.length){ toast('没有新记录可导入'); return; }
  records = records.concat(added);
  save();
  refreshAll();
  toast('已导入 ' + added.length + ' 条记录');
  checkEggs();
}
function exportInBrowser(){
  var blob = new Blob([exportPayload()], {type:'application/json'});
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = exportFileName();
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(function(){ URL.revokeObjectURL(url); }, 1500);
  toast('已导出 JSON');
}
function uid(){
  return Date.now().toString(36) + Math.random().toString(36).slice(2,6);
}

/* ---------- 格式化 ---------- */
function pad(n){ return String(n).padStart(2,'0'); }
function fmtDate(d){
  return d.getFullYear() + '-' + pad(d.getMonth()+1) + '-' + pad(d.getDate());
}
function nowLocalValue(){
  var d = new Date();
  return fmtDate(d) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes());
}
function fmtDuration(sec){
  if(sec == null || sec < 0 || !isFinite(sec)) return '—';
  var h = Math.floor(sec/3600), m = Math.floor(sec%3600/60), s = Math.floor(sec%60);
  if(h > 0) return h + ':' + pad(m) + ':' + pad(s);
  return m + ':' + pad(s);
}
function fmtPace(secPerKm){
  if(secPerKm == null || !isFinite(secPerKm)) return '—';
  var m = Math.floor(secPerKm/60), s = Math.round(secPerKm%60);
  if(s === 60){ m++; s = 0; }
  return m + "'" + pad(s) + '"';
}
function fmtTotalDur(sec){
  if(!sec) return '0:00';
  var h = Math.floor(sec/3600), m = Math.floor(sec%3600/60);
  if(h > 0) return h + ':' + pad(m);
  var s = Math.floor(sec%60);
  return m + ':' + pad(s);
}
function weekDayCN(d){ return '日一二三四五六'[d.getDay()]; }
function hhmm(ts){
  var d = new Date(ts);
  return pad(d.getHours()) + ':' + pad(d.getMinutes());
}

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

function renderGoal(){
  var b = bestProof();
  var pct = b ? b.pct : 0;
  $('goalBar').style.width = (pct*100) + '%';
  $('goalPct').textContent = Math.round(pct*100) + '%';

  // 上一次：最近一次跑步的含金量
  var last = null;
  records.forEach(function(r){ if(!last || r.ts > last.ts) last = r; });
  if(last && last.distance && last.dur){
    var lastPct = proofOf(last);
    $('goalLastBar').style.width = (lastPct*100) + '%';
    $('goalLastVal').textContent = Math.round(lastPct*100) + '%';
  }else{
    $('goalLastBar').style.width = '0%';
    $('goalLastVal').textContent = '—';
  }

  if(!b){
    $('goalBest').textContent = '';
    $('goalPred').textContent = '';
    $('goalPoem').textContent = '千里之行，始于足下。';
    return;
  }
  var achieved = b.dist >= GOAL_KM - 0.005 && b.pace <= GOAL_PACE + 0.01;
  $('goalBest').textContent = '最佳一次 · ' + b.dist.toFixed(2) + ' km · ' + fmtPace(b.pace);
  $('goalPred').textContent = '按此配速，10 km 预计 ' + fmtDuration(Math.round(b.pace * GOAL_KM));
  var poem;
  if(achieved) poem = '一小时十公里，抵达了。风替你欢呼。';
  else if(pct < 0.25) poem = '路还长，先跑起来。';
  else if(pct < 0.7) poem = '每一步，都在靠近那一小时。';
  else poem = '快到了，再远一点，再快一点。';
  $('goalPoem').textContent = poem;
}

function renderCal(){
  var y = calCursor.getFullYear(), m = calCursor.getMonth();
  collectDataMonths();
  $('calTitle').textContent = y + ' · ' + (m+1) + '月';
  $('calPrev').classList.toggle('disabled', !prevDataMonth(y,m));
  $('calNext').classList.toggle('disabled', !nextDataMonth(y,m));
  var now = new Date();
  $('calToday').classList.toggle('show', y !== now.getFullYear() || m !== now.getMonth());

  var mCnt = 0, mDist = 0, mDur = 0;
  records.forEach(function(r){
    var d = new Date(r.ts);
    if(d.getFullYear() === y && d.getMonth() === m){
      mCnt++; mDist += r.distance; mDur += r.dur;
    }
  });
  $('mCount').textContent = mCnt;
  $('mDist').innerHTML = mDist.toFixed(2) + '<small>km</small>';
  $('mTime').textContent = fmtTotalDur(mDur);

  var first = new Date(y, m, 1);
  var dim = new Date(y, m+1, 0).getDate();
  var offset = first.getDay(); // 0=周日
  var todayStr = fmtDate(new Date());
  var byDate = {};
  records.forEach(function(r){ (byDate[r.date] = byDate[r.date] || []).push(r); });

  var grid = $('calGrid');
  grid.innerHTML = '';
  for(var i = 0; i < offset; i++){
    var b = document.createElement('div');
    b.className = 'day blank';
    grid.appendChild(b);
  }
  for(var d = 1; d <= dim; d++){
    var date = y + '-' + pad(m+1) + '-' + pad(d);
    var cell = document.createElement('div');
    cell.className = 'day';
    if(date === todayStr) cell.classList.add('today');
    if(byDate[date]) cell.classList.add('has');
    var num = document.createElement('span');
    num.textContent = d;
    var mark = document.createElement('span');
    mark.className = 'mark';
    if(byDate[date]) mark.textContent = '强';
    cell.appendChild(num);
    cell.appendChild(mark);
    cell.addEventListener('click', (function(date){ return function(){ openDetail(date); }; })(date));
    grid.appendChild(cell);
  }
}

var dataMonths = [];
function collectDataMonths(){
  var set = {};
  records.forEach(function(r){
    var d = new Date(r.ts);
    set[d.getFullYear() + '-' + d.getMonth()] = true;
  });
  dataMonths = Object.keys(set).map(function(k){
    var p = k.split('-');
    return { y: parseInt(p[0],10), m: parseInt(p[1],10) };
  }).sort(function(a,b){ return (a.y-b.y) || (a.m-b.m); });
}
function prevDataMonth(y,m){
  var best = null;
  dataMonths.forEach(function(mm){
    if(mm.y < y || (mm.y === y && mm.m < m)){
      if(!best || mm.y > best.y || (mm.y === best.y && mm.m > best.m)) best = mm;
    }
  });
  return best;
}
function nextDataMonth(y,m){
  var best = null;
  dataMonths.forEach(function(mm){
    if(mm.y > y || (mm.y === y && mm.m > m)){
      if(!best || mm.y < best.y || (mm.y === best.y && mm.m < best.m)) best = mm;
    }
  });
  return best;
}

function refreshAll(){
  renderStats();
  renderGoal();
  renderCal();
}

/* ---------- 日历跳转 ---------- */
function openJump(){
  var box = $('jumpList');
  box.innerHTML = '';
  if(!dataMonths.length){
    var p = document.createElement('p');
    p.className = 'jump-empty';
    p.textContent = '还没有跑步记录，先跑起来吧。';
    box.appendChild(p);
  } else {
    var curY = calCursor.getFullYear(), curM = calCursor.getMonth();
    var list = dataMonths.slice().reverse(); // 新的在前
    list.forEach(function(mm){
      var btn = document.createElement('button');
      btn.className = 'menu-item jump-item';
      if(mm.y === curY && mm.m === curM) btn.classList.add('current');
      var label = document.createElement('span');
      label.textContent = mm.y + ' · ' + (mm.m+1) + '月';
      var arrow = document.createElement('span');
      arrow.className = 'arrow';
      arrow.textContent = '›';
      btn.appendChild(label);
      btn.appendChild(arrow);
      btn.addEventListener('click', function(){
        calCursor = new Date(mm.y, mm.m, 1);
        closeSheets();
        renderCal();
      });
      box.appendChild(btn);
    });
  }
  openSheet($('jumpSheet'));
}

/* ---------- 弹层 ---------- */
function openSheet(el){
  $('overlay').classList.add('open');
  el.classList.add('open');
}
function closeSheets(){
  $('overlay').classList.remove('open');
  var sheets = document.querySelectorAll('.sheet');
  for(var i = 0; i < sheets.length; i++) sheets[i].classList.remove('open');
}

/* ---------- 记录 ---------- */
function updatePace(){
  var dist = parseFloat($('fDist').value);
  var m = parseInt($('fMin').value || '0', 10);
  var s = parseInt($('fSec').value || '0', 10);
  var dur = (isNaN(m) ? 0 : m)*60 + (isNaN(s) ? 0 : s);
  var chip = $('paceChip');
  if(!isFinite(dist) || dist <= 0 || dur <= 0){
    $('paceVal').textContent = '—';
    chip.classList.remove('slow');
    return;
  }
  var pace = dur/dist;
  $('paceVal').textContent = fmtPace(pace);
  chip.classList.toggle('slow', pace > GOAL_PACE);
}

function openRecord(){
  editingId = null;
  $('sheetTitle').textContent = '记录一次';
  $('fTime').value = nowLocalValue();
  $('fDist').value = '0';
  $('fMin').value = '0';
  $('fSec').value = '0';
  $('fNote').value = '';
  $('noteCount').textContent = '0/100';
  renderPresetChips();
  updatePace();
  openSheet($('recordSheet'));
}

function openEdit(r){
  editingId = r.id;
  $('sheetTitle').textContent = '修改记录';
  var d = new Date(r.ts);
  $('fTime').value = fmtDate(d) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  $('fDist').value = r.distance;
  var m = Math.floor(r.dur/60), s = Math.round(r.dur%60);
  if(s === 60){ m++; s = 0; }
  $('fMin').value = m;
  $('fSec').value = s;
  $('fNote').value = r.note || '';
  $('noteCount').textContent = (r.note || '').length + '/100';
  renderPresetChips();
  updatePace();
  openSheet($('recordSheet'));
}

function saveRecord(){
  var dist = parseFloat($('fDist').value);
  var m = parseInt($('fMin').value || '0', 10);
  var s = parseInt($('fSec').value || '0', 10);
  var dur = (isFinite(m) ? m : 0)*60 + (isFinite(s) ? s : 0);
  var tVal = $('fTime').value;
  var note = $('fNote').value.trim();

  if(!isFinite(dist) || dist <= 0){ toast('距离要大于 0 哦'); return; }
  if(dur <= 0){ toast('时长要大于 0 哦'); return; }
  if(!tVal){ toast('选一个时间吧'); return; }

  var ts = new Date(tVal).getTime();
  var rec = {
    id: editingId || uid(),
    ts: ts,
    date: fmtDate(new Date(tVal)),
    distance: Math.round(dist*100)/100,
    dur: dur,
    note: note
  };
  if(editingId){
    var i = records.findIndex(function(x){ return x.id === editingId; });
    if(i >= 0) records[i] = rec; else records.push(rec);
    toast('已更新');
  }else{
    records.push(rec);
    praise();
    toast('已记录 · ' + rec.distance.toFixed(2) + ' km');
  }
  save();
  closeSheets();
  refreshAll();
  checkEggs();
  var rd = new Date(ts);
  if(rd.getFullYear() !== calCursor.getFullYear() || rd.getMonth() !== calCursor.getMonth()){
    calCursor = new Date(rd.getFullYear(), rd.getMonth(), 1);
    renderCal();
  }
}

/* ---------- 详情 ---------- */
function openDetail(date){
  var list = records.filter(function(r){ return r.date === date; })
                    .sort(function(a,b){ return a.ts - b.ts; });
  if(!list.length) return;
  var d = new Date(date + 'T00:00:00');
  $('detailTitle').textContent = (d.getMonth()+1) + '月' + d.getDate() + '日 · 周' + weekDayCN(d);
  var dist = list.reduce(function(a,r){ return a + r.distance; }, 0);
  $('detailSub').textContent = list.length + ' 次 · 共 ' + dist.toFixed(2) + ' km';
  var box = $('detailList');
  box.innerHTML = '';
  list.forEach(function(r){
    var row = document.createElement('div');
    row.className = 'run-row';

    var t = document.createElement('div');
    t.className = 'run-time';
    t.textContent = hhmm(r.ts);

    var main = document.createElement('div');
    main.className = 'run-main';
    var meta = document.createElement('div');
    meta.className = 'run-meta';
    meta.textContent = r.distance.toFixed(2) + ' km · ' + fmtDuration(r.dur) + ' · ' + fmtPace(r.dur/r.distance) + ' · 达成 ' + Math.round(proofOf(r)*100) + '%';
    main.appendChild(meta);
    if(r.note){
      var n = document.createElement('div');
      n.className = 'run-note';
      n.textContent = r.note;
      main.appendChild(n);
    }

    var del = document.createElement('button');
    del.className = 'run-del';
    del.textContent = '×';
    del.setAttribute('aria-label', '删除');

    row.appendChild(t);
    row.appendChild(main);
    row.appendChild(del);
    row.addEventListener('click', function(){ openEdit(r); });
    del.addEventListener('click', function(e){
      e.stopPropagation();
      openConfirm(r.id);
    });
    box.appendChild(row);
  });
  openSheet($('detailSheet'));
}

/* ---------- 删除 ---------- */
function openConfirm(id){
  deletingId = id;
  openSheet($('confirmSheet'));
}
function doDelete(){
  if(!deletingId) return;
  records = records.filter(function(r){ return r.id !== deletingId; });
  deletingId = null;
  save();
  closeSheets();
  refreshAll();
  toast('已删除');
}

/* ---------- toast ---------- */
var toastTimer = null;
function toast(msg){
  var el = $('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function(){ el.classList.remove('show'); }, 1800);
}

/* ---------- 记录鼓励 ---------- */
function praise(){
  var el = $("praise");
  el.classList.add("open");
}
function celebrate(){
  document.body.classList.add('shake');
  setTimeout(function(){ document.body.classList.remove('shake'); }, 750);
  confettiBurst();
  var el = $('praise');
  el.classList.remove('open');
}
function confettiBurst(){
  var colors = ['#ffb3c8','#ffd166','#7bd7b9','#8ecae6','#c8b6ff','#f4a9c8','#a8e6ce','#ffe08a','#f9a8d4'];
  var host = document.body;
  for(var i = 0; i < 90; i++){
    var p = document.createElement('div');
    p.className = 'confetti-piece';
    p.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    p.style.left = (Math.random() * 100) + 'vw';
    p.style.width = (6 + Math.random() * 7) + 'px';
    p.style.height = (10 + Math.random() * 9) + 'px';
    p.style.animationDelay = (Math.random() * 0.5) + 's';
    p.style.animationDuration = (1.7 + Math.random() * 1.3) + 's';
    p.style.setProperty('--drift', (Math.random() * 160 - 80) + 'px');
    host.appendChild(p);
    (function(el){
      setTimeout(function(){
        if(el.parentNode) el.parentNode.removeChild(el);
      }, 3600);
    })(p);
  }
}


/* ---------- 背景选择 ---------- */
var BG_KEY = 'hakone_bg_v1';
var BGS = [
  { id:'default', name:'默认', color:'#f6f8fa', image:'radial-gradient(70% 40% at 50% 0%, rgba(10,168,122,.10), transparent 62%), radial-gradient(65% 45% at 50% 100%, rgba(11,142,214,.10), transparent 62%), repeating-linear-gradient(0deg, transparent 0 43px, rgba(13,32,45,.035) 44px), repeating-linear-gradient(90deg, transparent 0 43px, rgba(13,32,45,.035) 44px)', size:'auto' },
  { id:'snow', name:'晴空白', color:'#ffffff', image:'none', size:'auto' },
  { id:'mist', name:'雾灰', color:'#eef1f4', image:'none', size:'auto' },
  { id:'sakura', name:'樱花粉', color:'#fdf1f5', image:'none', size:'auto' },
  { id:'mint', name:'薄荷绿', color:'#eefaf4', image:'none', size:'auto' },
  { id:'sky', name:'晴空蓝', color:'#eef6fd', image:'none', size:'auto' },
  { id:'cream', name:'暖米', color:'#faf5ec', image:'none', size:'auto' },
  { id:'lav', name:'淡紫', color:'#f4f1fb', image:'none', size:'auto' },
  { id:'grass', name:'浅草绿', color:'#e8f5e9', image:'none', size:'auto' },
  { id:'matcha', name:'抹茶绿', color:'#d8e8d3', image:'none', size:'auto' },
  { id:'sage', name:'鼠尾草绿', color:'#c5d0b4', image:'none', size:'auto' },
  { id:'moss', name:'苔绿', color:'#c8e6c9', image:'none', size:'auto' },
  { id:'seafoam', name:'海沫绿', color:'#b2dfdb', image:'none', size:'auto' },
  { id:'celadon', name:'青瓷绿', color:'#a8e6ce', image:'none', size:'auto' },
  { id:'lines-h', name:'横线', color:'#f7f8fa', image:'repeating-linear-gradient(0deg, transparent 0 13px, rgba(13,32,45,.05) 14px)', size:'auto' },
  { id:'lines-v', name:'竖线', color:'#f7f8fa', image:'repeating-linear-gradient(90deg, transparent 0 13px, rgba(13,32,45,.05) 14px)', size:'auto' },
  { id:'diag', name:'斜纹', color:'#f7f8fa', image:'repeating-linear-gradient(45deg, rgba(13,32,45,.05) 0 1px, transparent 1px 11px)', size:'auto' },
  { id:'grid', name:'网格', color:'#f7f8fa', image:'repeating-linear-gradient(0deg, transparent 0 19px, rgba(13,32,45,.05) 20px), repeating-linear-gradient(90deg, transparent 0 19px, rgba(13,32,45,.05) 20px)', size:'auto' },
  { id:'dots', name:'圆点', color:'#f7f8fa', image:'radial-gradient(rgba(13,32,45,.09) 1.2px, transparent 1.3px)', size:'16px 16px' },
  { id:'waves', name:'波浪', color:'#f7f8fa', image:'radial-gradient(circle at 0 0, rgba(13,32,45,.055) 2px, transparent 2.5px), radial-gradient(circle at 16px 16px, rgba(13,32,45,.055) 2px, transparent 2.5px)', size:'32px 32px' },
  { id:'cross', name:'格纹', color:'#f7f8fa', image:'repeating-linear-gradient(45deg, rgba(13,32,45,.045) 0 1px, transparent 1px 12px), repeating-linear-gradient(-45deg, rgba(13,32,45,.045) 0 1px, transparent 1px 12px)', size:'auto' }
];
function applyBg(id){
  if(id === 'default') document.body.removeAttribute('data-bg');
  else document.body.setAttribute('data-bg', id);
  try{ localStorage.setItem(BG_KEY, id); }catch(e){}
  renderBgRow(id);
}
function renderBgRow(active){
  var row = $('bgRow');
  if(!row) return;
  row.innerHTML = '';
  BGS.forEach(function(b){
    var s = document.createElement('button');
    s.type = 'button';
    s.className = 'bg-swatch' + (b.id === active ? ' on' : '');
    s.title = b.name;
    s.setAttribute('aria-label', '背景：' + b.name);
    s.style.backgroundColor = b.color;
    s.style.backgroundImage = b.image;
    s.style.backgroundSize = b.size;
    s.addEventListener('click', function(){ applyBg(b.id); });
    row.appendChild(s);
  });
}



/* ---------- 卡片配色 ---------- */
var CARD_BG_KEY = 'hakone_cardbg_v1';
var CARD_IDS = [
  { id:'goal', label:'目标', el:'goalCard' },
  { id:'stat', label:'统计', el:'statCard' },
  { id:'cal', label:'日历', el:'calCard' }
];
var CARD_TINTS = [
  { id:'default', name:'默认', css:'rgba(255,255,255,.95)' },
  { id:'mist', name:'雾灰', css:'rgba(238,241,244,.95)' },
  { id:'sakura', name:'樱花粉', css:'rgba(253,241,245,.95)' },
  { id:'mint', name:'薄荷绿', css:'rgba(238,250,244,.95)' },
  { id:'sky', name:'晴空蓝', css:'rgba(238,246,253,.95)' },
  { id:'cream', name:'暖米', css:'rgba(250,245,236,.95)' },
  { id:'lav', name:'淡紫', css:'rgba(244,241,251,.95)' },
  { id:'grass', name:'浅草绿', css:'rgba(232,245,233,.95)' },
  { id:'matcha', name:'抹茶绿', css:'rgba(216,232,211,.95)' },
  { id:'sage', name:'鼠尾草绿', css:'rgba(197,208,180,.95)' },
  { id:'moss', name:'苔绿', css:'rgba(200,230,201,.95)' },
  { id:'seafoam', name:'海沫绿', css:'rgba(178,223,219,.95)' },
  { id:'celadon', name:'青瓷绿', css:'rgba(168,230,206,.95)' }
];
var cardBg = loadCardBg();
function loadCardBg(){
  try{ var o = JSON.parse(localStorage.getItem(CARD_BG_KEY) || ''); if(o && typeof o === 'object') return o; }catch(e){}
  return {};
}
function saveCardBg(){ try{ localStorage.setItem(CARD_BG_KEY, JSON.stringify(cardBg)); }catch(e){} }
function applyCardTint(cardId, tintId){
  var info = null;
  CARD_IDS.forEach(function(x){ if(x.id === cardId) info = x; });
  if(!info) return;
  var el = $(info.el);
  if(!el) return;
  CARD_TINTS.forEach(function(t){ el.classList.remove('tint-' + t.id); });
  if(tintId !== 'default') el.classList.add('tint-' + tintId);
  cardBg[cardId] = tintId;
  saveCardBg();
  renderCardBgRows();
  renderPresetChips();
}
function renderCardBgRows(){
  var wrap = $('cardBgRows');
  if(!wrap) return;
  wrap.innerHTML = '';
  CARD_IDS.forEach(function(info){
    var row = document.createElement('div');
    row.className = 'cbg-row';
    var lab = document.createElement('span');
    lab.className = 'cbg-label';
    lab.textContent = info.label;
    var sw = document.createElement('div');
    sw.className = 'cbg-swatches';
    var active = cardBg[info.id] || 'default';
    CARD_TINTS.forEach(function(t){
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'cbg-swatch' + (t.id === active ? ' on' : '');
      b.title = t.name;
      b.style.backgroundColor = t.css;
      b.addEventListener('click', function(){ applyCardTint(info.id, t.id); });
      sw.appendChild(b);
    });
    row.appendChild(lab);
    row.appendChild(sw);
    wrap.appendChild(row);
  });
}

/* ---------- 记录预选 ---------- */
var PRESETS_KEY = 'hakone_presets_v1';
var PRESET_DEFAULTS = {
  dist: ['3','5','10'],
  dur: ['30','45','60'],
  feel: ['😊 爽','😮‍💨 累','🥱 疲惫','☀️ 太轻松了','🔥 燃起来了']
};
var presets = loadPresets();
function loadPresets(){
  var o = null;
  try{ o = JSON.parse(localStorage.getItem(PRESETS_KEY) || ''); }catch(e){}
  if(!o || typeof o !== 'object'){
    return JSON.parse(JSON.stringify(PRESET_DEFAULTS));
  }
  ['dist','dur','feel'].forEach(function(k){
    if(!Array.isArray(o[k]) || !o[k].length) o[k] = PRESET_DEFAULTS[k].slice();
  });
  return o;
}
function savePresets(){ try{ localStorage.setItem(PRESETS_KEY, JSON.stringify(presets)); }catch(e){} }
function presetChipHtml(kind, val, idx){
  var unit = kind === 'dist' ? ' km' : (kind === 'dur' ? ' min' : '');
  return '<button type="button" class="chip preset-chip" data-kind="'+kind+'" data-idx="'+idx+'">'+val+unit+'</button>';
}
function renderPresetChips(){
  var d = $('presetDist'), t = $('presetDur'), f = $('presetFeel');
  if(d) d.innerHTML = presets.dist.map(function(v,i){ return presetChipHtml('dist', v, i); }).join('');
  if(t) t.innerHTML = presets.dur.map(function(v,i){ return presetChipHtml('dur', v, i); }).join('');
  if(f) f.innerHTML = presets.feel.map(function(v,i){ return presetChipHtml('feel', v, i); }).join('');
}
function renderPresetSettings(){
  var wrap = $('presetSettings');
  if(!wrap) return;
  var groups = [
    { key:'dist', label:'距离（km）' },
    { key:'dur', label:'时长（分钟）' },
    { key:'feel', label:'感受' }
  ];
  var html = '';
  groups.forEach(function(g){
    html += '<div class="preset-set-row"><div class="bg-lbl">' + g.label + '</div><div class="preset-set-inputs">';
    presets[g.key].forEach(function(v, i){
      html += '<input type="text" class="preset-in" data-key="' + g.key + '" data-idx="' + i + '" value="' + v.replace(/"/g,'&quot;') + '">';
    });
    html += '</div></div>';
  });
  html += '<button type="button" class="btn primary" id="presetSave">保存预选</button>';
  wrap.innerHTML = html;
}
function applyPresetChip(kind, val){
  if(kind === 'dist'){
    var n = parseFloat(val);
    $('fDist').value = isFinite(n) ? n : '';
  } else if(kind === 'dur'){
    var m = parseInt(val, 10);
    $('fMin').value = isFinite(m) && m >= 0 ? m : '';
    $('fSec').value = '0';
  } else if(kind === 'feel'){
    $('fNote').value = val;
    $('noteCount').textContent = val.length + '/100';
  }
  updatePace();
}
function savePresetSettings(){
  var inputs = document.querySelectorAll('#presetSettings .preset-in');
  var bad = null;
  inputs.forEach(function(inp){
    var key = inp.getAttribute('data-key');
    var idx = parseInt(inp.getAttribute('data-idx'), 10);
    var v = inp.value.trim();
    if(key === 'dist' || key === 'dur'){
      var n = parseFloat(v);
      if(!isFinite(n) || n <= 0){ bad = key; return; }
      presets[key][idx] = String(n);
    } else {
      if(!v){ bad = key; return; }
      presets[key][idx] = v;
    }
  });
  if(bad){ toast('预选值要填有效的正数哦'); return; }
  savePresets();
  renderPresetSettings();
  renderPresetChips();
  toast('预选值已保存');
}
document.addEventListener('click', function(e){
  var chip = e.target && e.target.closest ? e.target.closest('.preset-chip') : null;
  if(!chip) return;
  var kind = chip.getAttribute('data-kind');
  var idx = parseInt(chip.getAttribute('data-idx'), 10);
  if(!kind || isNaN(idx) || !presets[kind] || idx >= presets[kind].length) return;
  applyPresetChip(kind, presets[kind][idx]);
});
document.addEventListener('click', function(e){
  if(e.target && e.target.id === 'presetSave') savePresetSettings();
});

/* ---------- 弹框配色 ---------- */
var SHEET_BG_KEY = 'hakone_sheetbg_v1';
var SHEET_TINTS = [
  { id:'default', name:'默认', color:'#ffffff' },
  { id:'mist', name:'雾灰', color:'#eef1f4' },
  { id:'sakura', name:'樱花粉', color:'#fdf1f5' },
  { id:'mint', name:'薄荷绿', color:'#eefaf4' },
  { id:'sky', name:'晴空蓝', color:'#eef6fd' },
  { id:'cream', name:'暖米', color:'#faf5ec' },
  { id:'lav', name:'淡紫', color:'#f4f1fb' },
  { id:'grass', name:'浅草绿', color:'#e8f5e9' },
  { id:'matcha', name:'抹茶绿', color:'#d8e8d3' },
  { id:'sage', name:'鼠尾草绿', color:'#c5d0b4' },
  { id:'moss', name:'苔绿', color:'#c8e6c9' },
  { id:'seafoam', name:'海沫绿', color:'#b2dfdb' },
  { id:'celadon', name:'青瓷绿', color:'#a8e6ce' }
];
function applySheetTint(id){
  var body = document.body;
  if(id === 'default') body.removeAttribute('data-sheetbg');
  else body.setAttribute('data-sheetbg', id);
  try{ localStorage.setItem(SHEET_BG_KEY, id); }catch(e){}
  renderSheetBgRow(id);
}
function renderSheetBgRow(active){
  var row = $('sheetBgRow');
  if(!row) return;
  row.innerHTML = '';
  SHEET_TINTS.forEach(function(t){
    var s = document.createElement('button');
    s.type = 'button';
    s.className = 'bg-swatch' + (t.id === active ? ' on' : '');
    s.title = t.name;
    s.setAttribute('aria-label', '弹框配色：' + t.name);
    s.style.backgroundColor = t.color;
    s.addEventListener('click', function(){ applySheetTint(t.id); });
    row.appendChild(s);
  });
}

/* ---------- 事件 ---------- */


function bind(id, evt, fn){ $(id).addEventListener(evt, fn); }

bind('recordBtn', 'click', openRecord);
bind('sheetClose', 'click', closeSheets);
bind('sheetCancel', 'click', closeSheets);
bind('sheetSave', 'click', saveRecord);
bind('detailClose', 'click', closeSheets);
bind('detailDone', 'click', closeSheets);
bind('confirmCancel', 'click', closeSheets);
bind('confirmOk', 'click', doDelete);
bind('praiseBtn', 'click', function(e){ e.stopPropagation(); celebrate(); });
bind('overlay', 'click', closeSheets);
bind('fNow', 'click', function(){ $('fTime').value = nowLocalValue(); });
bind('calTitle', 'click', openJump);
bind('jumpClose', 'click', closeSheets);
bind('calPrev', 'click', function(){
  var t = prevDataMonth(calCursor.getFullYear(), calCursor.getMonth());
  if(t){ calCursor = new Date(t.y, t.m, 1); renderCal(); }
});
bind('calNext', 'click', function(){
  var t = nextDataMonth(calCursor.getFullYear(), calCursor.getMonth());
  if(t){ calCursor = new Date(t.y, t.m, 1); renderCal(); }
});
bind('calToday', 'click', function(){
  var now = new Date();
  calCursor = new Date(now.getFullYear(), now.getMonth(), 1);
  renderCal();
});

bind('goalInfo', 'click', function(){ openSheet($('infoSheet')); });
bind('infoClose', 'click', closeSheets);
bind('infoDone', 'click', closeSheets);

$('fDist').addEventListener('input', updatePace);
$('fMin').addEventListener('input', updatePace);
$('fSec').addEventListener('input', updatePace);
$('fNote').addEventListener('input', function(){
  $('noteCount').textContent = $('fNote').value.length + '/100';
});

/* ---------- 彩蛋 ---------- */
var EGG_KEY = 'hakone_eggs_v1';
var eggTriggered = loadEggs();
var eggQueue = [];
var eggDefs = [
  { id:'first_5k',    emoji:'🌸', title:'5 公里达成',      msg:'第一次跑进 5 公里，风记住了你的脚步。',    cond:function(){ return records.some(function(r){ return r.distance >= 5; }); } },
  { id:'first_10k',   emoji:'🌊', title:'10 公里达成',     msg:'十公里！你跑过了自己设下的那扇门。',        cond:function(){ return records.some(function(r){ return r.distance >= GOAL_KM; }); } },
  { id:'first_sub6',  emoji:'🌀', title:'配速进 6',        msg:'配速跑进 6 分，连风都追不上你。',           cond:function(){ return records.some(function(r){ return r.distance > 0 && r.dur/r.distance <= GOAL_PACE; }); } },
  { id:'first_goal',  emoji:'🏁', title:'一小时十公里',     msg:'你做到了。',    cond:function(){ return records.some(function(r){ return r.distance >= GOAL_KM - 0.005 && r.dur/r.distance <= GOAL_PACE + 0.01; }); } },
  { id:'total_10k',   emoji:'🌱', title:'累计 10 公里',     msg:'从 0 到 10 公里，每一步都算数。',           cond:function(){ return totalDist() >= 10; } },
  { id:'total_100k',  emoji:'🌟', title:'累计 100 公里',    msg:'100 公里，这是十次十公里的坚持。',         cond:function(){ return totalDist() >= 100; } },
  { id:'count_10',    emoji:'🎽', title:'第 10 次跑步',     msg:'十次了，习惯正在长成。',                    cond:function(){ return records.length >= 10; } },
  { id:'count_100',   emoji:'🏅', title:'第 100 次跑步',    msg:'一百次，你已经是一个跑者了。',              cond:function(){ return records.length >= 100; } }
];
function loadEggs(){
  try{ var a = JSON.parse(localStorage.getItem(EGG_KEY)); return Array.isArray(a) ? a : []; }catch(e){ return []; }
}
function saveEggs(){
  try{ localStorage.setItem(EGG_KEY, JSON.stringify(eggTriggered)); }catch(e){}
}
function totalDist(){
  var s = 0;
  records.forEach(function(r){ s += r.distance; });
  return s;
}
function checkEggs(){
  eggDefs.forEach(function(def){
    if(eggTriggered.indexOf(def.id) >= 0) return;
    if(def.cond()){
      eggTriggered.push(def.id);
      saveEggs();
      eggQueue.push(def);
    }
  });
  if(eggQueue.length) showNextEgg();
}
function showNextEgg(){
  var def = eggQueue.shift();
  if(!def) return;
  $('eggEmoji').textContent = def.emoji;
  $('eggTitle').textContent = def.title;
  $('eggMsg').textContent = def.msg;
  $('egg').classList.add('open');
}
function closeEgg(){
  $('egg').classList.remove('open');
  if(eggQueue.length) showNextEgg();
}
bind('eggOk', 'click', closeEgg);

// 隐藏彩蛋：连点左上角 7 次，重置「一小时十公里」
var brandTaps = 0, brandTapTimer = null;
function onBrandTap(){
  brandTaps++;
  clearTimeout(brandTapTimer);
  brandTapTimer = setTimeout(function(){ brandTaps = 0; }, 2500);
  if(brandTaps >= 7){
    brandTaps = 0;
    var i = eggTriggered.indexOf('first_goal');
    if(i >= 0){
      eggTriggered.splice(i, 1);
      saveEggs();
      toast('彩蛋已重置：🏁 一小时十公里');
    } else {
      toast('「一小时十公里」还没触发过哦');
    }
  }
}
document.querySelector('.brand').addEventListener('click', onBrandTap);

/* ---------- 原生桥接（打包后可用；浏览器预览降级为提示） ---------- */
function callNative(name, arg){
  if(window.AppNative && typeof window.AppNative[name] === 'function'){
    if(arg !== undefined) window.AppNative[name](arg);
    else window.AppNative[name]();
  } else {
    toast('打包成 App 后可用');
  }
}

window.Hakone = {
  getData: function(){
    return { json: exportPayload() };
  },
  exportJson: function(){
    return { json: exportPayload() };
  },
  importData: function(json){
    doImportJson(json);
  },
  notify: function(msg){ toast(msg); },
  onNativeReady: function(){
    // 打开软件自动检查更新
    setTimeout(function(){ if(window.AppNative) window.AppNative.checkUpdate(); }, 1500);
  },
  onBack: function(){
    var open = document.querySelector('.sheet.open');
    if(open){ closeSheets(); return true; }
    return false;
  }
};

function renderAbout(){
  $('aboutVer').textContent = 'v' + APP_VERSION;
  var ul = $('changelog');
  ul.innerHTML = '';
  APP_CHANGELOG.forEach(function(line){
    var li = document.createElement('li');
    li.textContent = line;
    ul.appendChild(li);
  });
}

bind('menuBtn', 'click', function(){ renderPresetSettings(); renderSheetBgRow(localStorage.getItem(SHEET_BG_KEY) || 'default'); openSheet($('menuSheet')); });
bind('menuClose', 'click', closeSheets);
bind('menuCheckUpdate', 'click', function(){ closeSheets(); callNative('checkUpdate'); });
bind('menuBackup', 'click', function(){ closeSheets(); callNative('backupNow'); });
bind('menuExport', 'click', function(){
  closeSheets();
  if(window.AppNative && typeof window.AppNative.exportData === 'function') window.AppNative.exportData();
  else exportInBrowser();
});
bind('menuImport', 'click', function(){
  closeSheets();
  if(window.AppNative && typeof window.AppNative.importData === 'function') window.AppNative.importData();
  else $('importFile').click();
});
bind('importFile', 'change', function(){
  var f = this.files && this.files[0];
  if(!f) return;
  var reader = new FileReader();
  reader.onload = function(){ doImportJson(String(reader.result)); };
  reader.onerror = function(){ toast('读取文件失败'); };
  reader.readAsText(f);
  this.value = '';
});
bind('menuDiag', 'click', function(){
  closeSheets();
  callNative('exportDiagnostics');
});
bind('menuAbout', 'click', function(){ closeSheets(); renderAbout(); openSheet($('aboutSheet')); });
bind('aboutClose', 'click', closeSheets);
bind('aboutDone', 'click', closeSheets);

/* ---------- 启动 ---------- */
(function init(){
  var now = new Date();
  calCursor = new Date(now.getFullYear(), now.getMonth(), 1);
  $('menuVer').textContent = '版本 v' + APP_VERSION;
  var savedBg = 'default';
  try{ savedBg = localStorage.getItem(BG_KEY) || 'default'; }catch(e){}
  if(savedBg !== 'default') document.body.setAttribute('data-bg', savedBg);
  renderBgRow(savedBg);
  CARD_IDS.forEach(function(info){
    var t = cardBg[info.id] || 'default';
    if(t !== 'default'){ var el = $(info.el); if(el) el.classList.add('tint-' + t); }
  });
  renderCardBgRows();
  try{ var savedSheetBg = localStorage.getItem(SHEET_BG_KEY) || "default"; if(savedSheetBg !== "default") document.body.setAttribute("data-sheetbg", savedSheetBg); }catch(e){}
  renderQuote();
  refreshAll();
  checkEggs();
})();
})();