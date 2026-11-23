/* ---------- 彩蛋 ---------- */
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
  { id:'count_100',   emoji:'🏅', title:'第 100 次跑步',    msg:'一百次，你已经是一个跑者了。',              cond:function(){ return records.length >= 100; } },
  // —— 单次里程 ——
  { id:'first_3k',    emoji:'🐾', title:'首次 3 公里',       msg:'三公里，热身结束，故事才刚刚开始。',          cond:function(){ return records.some(function(r){ return r.distance >= 3; }); } },
  { id:'first_7k',    emoji:'🏔️', title:'首次 7 公里',       msg:'七公里，越过山丘，还剩三公里。',              cond:function(){ return records.some(function(r){ return r.distance >= 7; }); } },
  { id:'first_8k',    emoji:'🛤️', title:'首次 8 公里',       msg:'八公里，终点已经看得见轮廓了。',              cond:function(){ return records.some(function(r){ return r.distance >= 8; }); } },
  // —— 单次配速 ——
  { id:'first_pace7', emoji:'🌬️', title:'配速进 7',          msg:'七分配，不快，但你已经跑起来了。',            cond:function(){ return records.some(function(r){ return r.distance > 0 && r.dur > 0 && r.dur/r.distance <= 420; }); } },
  { id:'first_pace5', emoji:'⚡', title:'配速进 5',           msg:'五分配，风会给你让路。',                      cond:function(){ return records.some(function(r){ return r.distance > 0 && r.dur > 0 && r.dur/r.distance <= 300; }); } },
  // —— 单次时长 ——
  { id:'first_dur30', emoji:'⏳', title:'连续跑 30 分钟',     msg:'三十分钟，心跳和呼吸找到了同一拍。',          cond:function(){ return records.some(function(r){ return r.dur >= 1800; }); } },
  { id:'first_dur45', emoji:'🔋', title:'连续跑 45 分钟',     msg:'四十五分钟，一小时没那么远了。',              cond:function(){ return records.some(function(r){ return r.dur >= 2700; }); } },
  // —— 5km 目标 ——
  { id:'fivek_sub30', emoji:'🎯', title:'5 公里跑进 30 分钟', msg:'五公里半小时，你和目标打了个平手。',         cond:function(){ return records.some(function(r){ return r.distance >= 4.995 && r.dur > 0 && r.dur/r.distance <= GOAL_PACE; }); } },
  // —— 累计距离 ——
  { id:'total_30k',   emoji:'🌿', title:'累计 30 公里',       msg:'三十公里，习惯开始发芽。',                    cond:function(){ return totalDist() >= 30; } },
  { id:'total_50k',   emoji:'🌳', title:'累计 50 公里',       msg:'五十公里，从 0 到半百，每一步都算数。',       cond:function(){ return totalDist() >= 50; } },
  { id:'total_200k',  emoji:'🌌', title:'累计 200 公里',      msg:'两百公里，你已经是另一个自己了。',            cond:function(){ return totalDist() >= 200; } },
  // —— 累计时长 ——
  { id:'total_10h',   emoji:'⏰', title:'累计 10 小时',       msg:'十小时，时间在你脚下悄悄缩短。',              cond:function(){ return totalDur() >= 36000; } },
  // —— 次数 ——
  { id:'count_30',    emoji:'🎖️', title:'第 30 次跑步',      msg:'三十次，跑步变成了日子的一部分。',            cond:function(){ return records.length >= 30; } },
  { id:'count_50',    emoji:'🔥', title:'第 50 次跑步',      msg:'五十次，风雨无阻，你已经上瘾了。',            cond:function(){ return records.length >= 50; } },
  // —— 习惯 ——
  { id:'streak_3',    emoji:'🌤️', title:'连续 3 天',         msg:'三天，一个好习惯正在成形。',                  cond:function(){ return maxStreak() >= 3; } },
  { id:'streak_7',    emoji:'☀️', title:'连续 7 天',         msg:'连续七天，你已经停不下来了。',                cond:function(){ return maxStreak() >= 7; } },
  { id:'week_15k',    emoji:'📅', title:'一周 15 公里',      msg:'一周十五公里，周末可以奖励自己了。',          cond:function(){ return maxWeekDist() >= 15; } },
  // —— 时段 ——
  { id:'morning_run', emoji:'🌅', title:'首次晨跑',          msg:'清晨的路，只有你和风。',                      cond:function(){ return records.some(function(r){ var h = new Date(r.ts).getHours(); return h >= 6 && h < 9; }); } },
  { id:'night_run',   emoji:'🌙', title:'首次夜跑',          msg:'路灯亮起时，你还在跑。',                      cond:function(){ return records.some(function(r){ return new Date(r.ts).getHours() >= 20; }); } },
  // —— 目标 ——
  { id:'progress_50', emoji:'🌓', title:'进度过半',          msg:'过半了，终点在向你招手。',                    cond:function(){ var b = bestProof(); return !!b && b.pct >= 0.5; } }
];
function loadEggs(){
  try{ var a = JSON.parse(localStorage.getItem(STORE.eggs)); return Array.isArray(a) ? a : []; }catch(e){ return []; }
}
function saveEggs(){
  try{ localStorage.setItem(STORE.eggs, JSON.stringify(eggTriggered)); }catch(e){}
}
function totalDist(){
  var s = 0;
  records.forEach(function(r){ s += r.distance; });
  return s;
}
function totalDur(){
  var s = 0;
  records.forEach(function(r){ s += (r.dur || 0); });
  return s;
}
function maxStreak(){
  var set = {};
  records.forEach(function(r){ if(r.date) set[r.date] = true; });
  var dates = Object.keys(set).sort();
  if(!dates.length) return 0;
  var best = 1, cur = 1;
  for(var i = 1; i < dates.length; i++){
    var prev = new Date(dates[i-1]);
    prev.setDate(prev.getDate() + 1);
    var expect = prev.getFullYear() + '-' + pad(prev.getMonth()+1) + '-' + pad(prev.getDate());
    if(dates[i] === expect) cur++; else cur = 1;
    if(cur > best) best = cur;
  }
  return best;
}
function maxWeekDist(){
  var map = {};
  records.forEach(function(r){ if(!r.date || !r.distance) return; map[r.date] = (map[r.date] || 0) + r.distance; });
  var days = Object.keys(map).sort();
  var best = 0;
  for(var i = 0; i < days.length; i++){
    var sum = 0;
    for(var j = i; j < days.length; j++){
      var span = Math.round((new Date(days[j]) - new Date(days[i])) / 86400000);
      if(span > 6) break;
      sum += map[days[j]];
    }
    if(sum > best) best = sum;
  }
  return best;
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
