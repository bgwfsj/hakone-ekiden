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

