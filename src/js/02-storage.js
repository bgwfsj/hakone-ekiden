
/* ---------- 存储 ---------- */
function load(){
  try{
    var raw = localStorage.getItem(STORE.records);
    if(!raw) return [];
    var parsed = JSON.parse(raw);
    if(Array.isArray(parsed)) return parsed; // v1：纯数组
    if(parsed && typeof parsed === 'object' && Array.isArray(parsed.records)) return parsed.records; // v2
    return [];
  }catch(e){ return []; }
}
function save(){
  try{ localStorage.setItem(STORE.records, JSON.stringify({ schema: SCHEMA_VERSION, records: records })); }catch(e){}
}

/* ---------- 数据导入导出 ---------- */
function exportPayload(){
  return JSON.stringify({
    app: 'hakone-ekiden',
    version: APP_VERSION,
    schema: SCHEMA_VERSION,
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
