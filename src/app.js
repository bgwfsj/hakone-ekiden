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

var APP_VERSION = '1.0.6';
var APP_CHANGELOG = [
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
  $('statDist').innerHTML = dist.toFixed(2) + '<small>km</small>';
  $('statTime').textContent = fmtTotalDur(dur);
  var pace = dist > 0 ? dur/dist : null;
  $('avgPace').textContent = '平均配速 · ' + (pace != null ? fmtPace(pace) : '—');
  return { cnt:cnt, dist:dist, dur:dur };
}

function paceScoreOf(paceSec){
  if(paceSec <= GOAL_PACE) return 1;
  if(paceSec >= PACE_FLOOR) return 0;
  return (PACE_FLOOR - paceSec) / (PACE_FLOOR - GOAL_PACE);
}

// 单次含金量 = 距离达成 × 配速达成；综合进度取历史最佳
function bestProof(){
  var best = null;
  records.forEach(function(r){
    if(!r.distance || !r.dur) return;
    var distDone = Math.min(1, r.distance / GOAL_KM);
    var pace = r.dur / r.distance;
    var pct = distDone * paceScoreOf(pace);
    if(!best || pct > best.pct) best = { dist:r.distance, pace:pace, pct:pct, date:r.date };
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
    var lastPct = Math.min(1, last.distance/GOAL_KM) * paceScoreOf(last.dur/last.distance);
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
  $('goalBest').textContent = '最佳一次 · ' + b.dist.toFixed(2) + ' km · ' + fmtPace(b.pace) + ' · 达成 ' + Math.round(b.pct*100) + '%';
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
  $('calTitle').textContent = y + ' · ' + (m+1) + '月';
  var now = new Date();
  $('calToday').classList.toggle('show', y !== now.getFullYear() || m !== now.getMonth());

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
    cell.appendChild(num);
    cell.appendChild(mark);
    cell.addEventListener('click', (function(date){ return function(){ openDetail(date); }; })(date));
    grid.appendChild(cell);
  }
}

function refreshAll(){
  renderStats();
  renderGoal();
  renderCal();
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
  $('fDist').value = '';
  $('fMin').value = '';
  $('fSec').value = '';
  $('fNote').value = '';
  $('noteCount').textContent = '0/100';
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
    toast('已记录 · ' + rec.distance.toFixed(2) + ' km');
  }
  save();
  closeSheets();
  refreshAll();
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
    meta.textContent = r.distance.toFixed(2) + ' km · ' + fmtDuration(r.dur) + ' · ' + fmtPace(r.dur/r.distance);
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
bind('overlay', 'click', closeSheets);
bind('fNow', 'click', function(){ $('fTime').value = nowLocalValue(); });
bind('calPrev', 'click', function(){ calCursor.setMonth(calCursor.getMonth()-1); renderCal(); });
bind('calNext', 'click', function(){ calCursor.setMonth(calCursor.getMonth()+1); renderCal(); });
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
    return { json: JSON.stringify({ records: records, savedAt: new Date().toISOString(), app: 'hakone-ekiden' }) };
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

bind('menuBtn', 'click', function(){ openSheet($('menuSheet')); });
bind('menuClose', 'click', closeSheets);
bind('menuCheckUpdate', 'click', function(){ closeSheets(); callNative('checkUpdate'); });
bind('menuBackup', 'click', function(){ closeSheets(); callNative('backupNow'); });
bind('menuAbout', 'click', function(){ closeSheets(); renderAbout(); openSheet($('aboutSheet')); });
bind('aboutClose', 'click', closeSheets);
bind('aboutDone', 'click', closeSheets);

/* ---------- 启动 ---------- */
(function init(){
  var now = new Date();
  calCursor = new Date(now.getFullYear(), now.getMonth(), 1);
  $('menuVer').textContent = '版本 v' + APP_VERSION;
  renderQuote();
  refreshAll();
})();
})();