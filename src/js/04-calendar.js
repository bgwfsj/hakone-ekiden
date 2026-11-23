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
  var sameMonth = grid.getAttribute('data-ym') === (y + '-' + m);
  grid.setAttribute('data-ym', y + '-' + m);
  if(!sameMonth){
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
      cell.setAttribute('data-date', date);
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
  } else {
    var cells = grid.children;
    for(var k = 0; k < cells.length; k++){
      var c = cells[k];
      var dt = c.getAttribute('data-date');
      if(!dt) continue;
      c.classList.toggle('today', dt === todayStr);
      c.classList.toggle('has', !!byDate[dt]);
      var mk = c.querySelector('.mark');
      if(mk) mk.textContent = byDate[dt] ? '强' : '';
    }
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
  renderTrend();
  renderCal();
}

