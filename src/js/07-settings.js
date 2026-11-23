/* ---------- 背景选择 ---------- */
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
  try{ localStorage.setItem(STORE.bg, id); }catch(e){}
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
var CARD_IDS = [
  { id:'goal', label:'目标', el:'goalCard' },
  { id:'stat', label:'统计', el:'statCard' },
  { id:'cal', label:'日历', el:'calCard' },
  { id:'trend', label:'趋势', el:'trendCard' }
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
  try{ var o = JSON.parse(localStorage.getItem(STORE.cardBg) || ''); if(o && typeof o === 'object') return o; }catch(e){}
  return {};
}
function saveCardBg(){ try{ localStorage.setItem(STORE.cardBg, JSON.stringify(cardBg)); }catch(e){} }
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
var PRESET_DEFAULTS = {
  dist: ['3','5','10'],
  dur: ['30','45','60'],
  feel: ['😊 爽','😮‍💨 累','🥱 疲惫','☀️ 太轻松了','🔥 燃起来了']
};
var presets = loadPresets();
function loadPresets(){
  var o = null;
  try{ o = JSON.parse(localStorage.getItem(STORE.presets) || ''); }catch(e){}
  if(!o || typeof o !== 'object'){
    return JSON.parse(JSON.stringify(PRESET_DEFAULTS));
  }
  ['dist','dur','feel'].forEach(function(k){
    if(!Array.isArray(o[k]) || !o[k].length) o[k] = PRESET_DEFAULTS[k].slice();
  });
  return o;
}
function savePresets(){ try{ localStorage.setItem(STORE.presets, JSON.stringify(presets)); }catch(e){} }
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
  try{ localStorage.setItem(STORE.sheetBg, id); }catch(e){}
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
