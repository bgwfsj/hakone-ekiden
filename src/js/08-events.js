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
