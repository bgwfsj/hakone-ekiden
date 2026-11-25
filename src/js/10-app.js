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

bind('menuBtn', 'click', function(){ renderPresetSettings(); renderSheetBgRow(localStorage.getItem(STORE.sheetBg) || 'default'); renderGoalSkinRow(loadGoalSkin()); renderSpinRow(loadSpinSpeed()); openSheet($('menuSheet')); });
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
  try{ savedBg = localStorage.getItem(STORE.bg) || 'default'; }catch(e){}
  if(savedBg !== 'default') document.body.setAttribute('data-bg', savedBg);
  renderBgRow(savedBg);
  CARD_IDS.forEach(function(info){
    var t = cardBg[info.id] || 'default';
    if(t !== 'default'){ var el = $(info.el); if(el) el.classList.add('tint-' + t); }
  });
  renderCardBgRows();
  try{ var savedSheetBg = localStorage.getItem(STORE.sheetBg) || "default"; if(savedSheetBg !== "default") document.body.setAttribute("data-sheetbg", savedSheetBg); }catch(e){}
  var savedSkin = loadGoalSkin();
  if(savedSkin !== 'rings') document.body.setAttribute('data-goalskin', savedSkin);
  renderGoalSkinRow(savedSkin);
    var spinSlider = $('spinSlider');
  if(spinSlider) spinSlider.addEventListener('input', function(){ var n = parseInt(this.value, 10); applySpinSpeed(isNaN(n) ? 2 : n); });
  applySpinSpeed(loadSpinSpeed());
  renderQuote();
  refreshAll();
  checkEggs();
})();
})();