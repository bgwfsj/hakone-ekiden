import { spawn } from 'node:child_process';
import fs from 'node:fs';

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PAGE_URL = 'file:///F:/AI/codex/箱根驿传/index.html';
const PORT = 9223;
const PROFILE = 'F:\\AI\\codex\\箱根驿传\\_qa\\cdp_profile';
const SHOT_DIR = 'F:\\AI\\codex\\箱根驿传\\_qa';

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function main(){
  try { fs.rmSync(PROFILE, { recursive: true, force: true }); } catch(e){}

  const child = spawn(EDGE, [
    '--headless=new','--disable-gpu','--disable-software-rasterizer','--no-sandbox',
    '--remote-debugging-port=' + PORT, '--user-data-dir=' + PROFILE, PAGE_URL
  ], { stdio: 'ignore', windowsHide: true });
  child.unref();

  let targets = null;
  for (let i = 0; i < 60; i++){
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      targets = await res.json();
      if (targets && targets.length) break;
    } catch(e){}
    await sleep(400);
  }
  if (!targets){ console.error('CDP 不可用'); process.exit(1); }

  const page = targets.find(t => t.type === 'page' && t.url.includes('index.html')) || targets.find(t => t.type === 'page') || targets[0];
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

  let msgId = 0;
  const pending = new Map();
  ws.onmessage = ev => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)){ pending.get(m.id)(m); pending.delete(m.id); }
  };
  function send(method, params = {}){
    return new Promise(res => { const id = ++msgId; pending.set(id, res); ws.send(JSON.stringify({ id, method, params })); });
  }
  async function ev(expression){
    const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (r.result && r.result.exceptionDetails) throw new Error('JS异常: ' + JSON.stringify(r.result.exceptionDetails));
    return r.result && r.result.result && r.result.result.value;
  }
  async function shot(name){
    const r = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(SHOT_DIR + '\\' + name + '.png', Buffer.from(r.result.data, 'base64'));
    console.log('  截图: ' + name + '.png');
  }

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 3, mobile: true });
  await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await sleep(800);
  console.log('移动端视口: ' + await ev('window.innerWidth + "x" + window.innerHeight'));

  console.log('--- 初始空状态 ---');
  const q = await ev("document.querySelector('#quoteText').textContent");
  console.log('名言: ' + q);
  if (!q || !q.startsWith('“')) throw new Error('名言未渲染');
  const eggInit = await ev("!document.getElementById('egg').classList.contains('open')");
  console.log('空状态无彩蛋: ' + eggInit);
  if (!eggInit) throw new Error('空状态不应有彩蛋');
  const brandTxt = await ev("document.querySelector('.brand').textContent");
  console.log('左上角品牌: ' + brandTxt);
  if (brandTxt !== '你喜欢跑步吗？') throw new Error('左上角品牌应为「你喜欢跑步吗？」');
  const noRefresh = await ev("document.getElementById('quoteRefresh') === null");
  console.log('名言无刷新按钮: ' + noRefresh);
  if (!noRefresh) throw new Error('每日名言不应有刷新按钮');
  const goalPct0 = await ev("document.querySelector('#goalPct').textContent");
  const goalPoem0 = await ev("document.querySelector('#goalPoem').textContent");
  console.log('空状态含金量: ' + goalPct0 + ' 文案: ' + goalPoem0);
  if (goalPct0 !== '0%') throw new Error('空状态含金量应为 0%');
  const overflow = await ev("document.documentElement.scrollWidth <= window.innerWidth");
  console.log('无横向溢出: ' + overflow);

  console.log('--- 空状态日历跳转 ---');
  await ev("document.getElementById('calTitle').click()");
  const jumpOpen0 = await ev("document.getElementById('jumpSheet').classList.contains('open')");
  const jumpHint = await ev("document.querySelector('#jumpList').textContent");
  console.log('跳转弹层: ' + jumpOpen0 + ' 提示: ' + jumpHint.trim());
  if (!jumpOpen0) throw new Error('空状态点标题应打开跳转弹层');
  await ev("document.getElementById('jumpClose').click()");
  const jumpClosed0 = await ev("!document.getElementById('jumpSheet').classList.contains('open')");
  if (!jumpClosed0) throw new Error('跳转弹层应能关闭');

  console.log('--- 注入示例数据(今天x2 / 前天x1 / 上月x1) ---');
  await ev(`(function(){
    const now = new Date();
    const recs = [];
    const mk = (off,h,dist,m,s,note) => {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate()+off, h, m, s);
      return { id:'q'+recs.length, ts:d.getTime(),
        date: d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'),
        distance:dist, dur:m*60+s, note:note||'' };
    };
    recs.push(mk(0,7,5.02,30,15,'清晨的风'));
    recs.push(mk(0,19,3.50,21,45,''));
    recs.push(mk(-2,7,6.10,36,30,''));
    recs.push(mk(-30,7,4.20,25,0,'上月'));
    localStorage.setItem('hakone_records_v1', JSON.stringify(recs));
    location.reload();
  })()`);
  await sleep(1500);

  console.log('--- 刷新后统计/目标 ---');
  const cnt = await ev("document.querySelector('#statCount').textContent");
  const dist = await ev("document.querySelector('#statDist').textContent");
  const pace = await ev("document.querySelector('#statPace').textContent");
  const goalPct = await ev("document.querySelector('#goalPct').textContent");
  const goalBest = await ev("document.querySelector('#goalBest').textContent");
  const goalPred = await ev("document.querySelector('#goalPred').textContent");
  const goalPoem = await ev("document.querySelector('#goalPoem').textContent");
  console.log('次数=' + cnt + ' 距离=' + dist + ' 均速=' + pace);
  console.log('含金量=' + goalPct + ' | ' + goalBest + ' | ' + goalPred + ' | ' + goalPoem);
  const goalLast1 = await ev("document.querySelector('#goalLastVal').textContent");
  console.log('上一次含金量: ' + goalLast1);
  if (goalLast1 !== '33%') throw new Error('上一次应为 33%, 实际 ' + goalLast1);
  if (cnt !== '4') throw new Error('次数应为 4, 实际 ' + cnt);
  if (dist !== '19km') throw new Error('总距离应为 19km(整数), 实际 ' + dist);
  if (goalPct !== '61%') throw new Error('最佳含金量应为 61%, 实际 ' + goalPct);
  if (!goalBest.includes('6.10 km') || goalBest.includes('达成')) throw new Error('最佳一次描述错误: ' + goalBest);
  if (goalPred !== '按此配速，10 km 预计 59:50') throw new Error('预测错误: ' + goalPred);
  const has = await ev("document.querySelectorAll('.cal-grid .day.has').length");
  console.log('本月跑步标记数: ' + has);
  if (has !== 2) throw new Error('本月应有 2 个蓝点(今天+前天), 实际 ' + has);
  const mCnt = await ev("document.querySelector('#mCount').textContent");
  const mDist = await ev("document.querySelector('#mDist').textContent");
  const mTime = await ev("document.querySelector('#mTime').textContent");
  console.log('本月统计: ' + mCnt + ' 次 / ' + mDist + ' / ' + mTime);
  if (mCnt !== '3') throw new Error('本月次数应为 3, 实际 ' + mCnt);
  if (mDist !== '14.62km') throw new Error('本月距离应为 14.62km, 实际 ' + mDist);
  if (mTime !== '1:28') throw new Error('本月时长应为 1:28, 实际 ' + mTime);
  const bestD = await ev("document.querySelector('#bestDist').textContent");
  const bestP = await ev("document.querySelector('#bestPace').textContent");
  console.log('最长距离: ' + bestD + ' | 最快配速: ' + bestP);
  const Q = String.fromCharCode(34);
  const expD = ' 6.10 km ·  5\'59' + Q + ' · 11月16日';
  const expP = ' 4.20 km ·  5\'57' + Q + ' · 10月19日';
  if (bestD !== expD) throw new Error('最长距离错误: ' + bestD + '，应为 ' + expD);
  if (bestP !== expP) throw new Error('最快配速错误: ' + bestP + '，应为 ' + expP);
  await shot('1_home');

  console.log('--- 彩蛋：首次 5km / 配速进6 / 累计10km ---');
  const eggOpen = await ev("document.getElementById('egg').classList.contains('open')");
  const eggT1 = await ev("document.getElementById('eggTitle').textContent");
  console.log('彩蛋弹出: ' + eggOpen + ' 标题: ' + eggT1);
  if (!eggOpen) throw new Error('首次 5km 应弹出彩蛋');
  if (eggT1 !== '5 公里达成') throw new Error('第一个彩蛋应为「5 公里达成」, 实际 ' + eggT1);
  await ev("document.getElementById('eggOk').click()");
  const eggT2 = await ev("document.getElementById('eggTitle').textContent");
  if (eggT2 !== '配速进 6') throw new Error('第二个彩蛋应为「配速进 6」, 实际 ' + eggT2);
  await ev("document.getElementById('eggOk').click()");
  const eggT3 = await ev("document.getElementById('eggTitle').textContent");
  if (eggT3 !== '累计 10 公里') throw new Error('第三个彩蛋应为「累计 10 公里」, 实际 ' + eggT3);
  await ev("document.getElementById('eggOk').click()");
  const eggClosed = await ev("!document.getElementById('egg').classList.contains('open')");
  console.log('彩蛋已全部收下: ' + eggClosed);
  if (!eggClosed) throw new Error('彩蛋应全部关闭');

  console.log('--- 验证 1km@6分 含金量低(10%)，不改变最佳 ---');
  await ev(`(function(){
    const recs = JSON.parse(localStorage.getItem('hakone_records_v1'));
    const now = new Date();
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate()-1, 7, 0);
    recs.push({ id:'q1k', ts:d.getTime(),
      date: d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'),
      distance:1, dur:360, note:'' });
    localStorage.setItem('hakone_records_v1', JSON.stringify(recs));
    location.reload();
  })()`);
  await sleep(1200);
  const goalPct2 = await ev("document.querySelector('#goalPct').textContent");
  const cnt2 = await ev("document.querySelector('#statCount').textContent");
  console.log('加入 1km@6分 后: 含金量=' + goalPct2 + ' 次数=' + cnt2);
  if (goalPct2 !== '61%') throw new Error('1km@6分 含金量仅 10%，不应改变最佳(61%)');
  if (cnt2 !== '5') throw new Error('次数应为 5');

  console.log('--- 目标说明弹框 ---');
  await ev("document.getElementById('goalInfo').click()");
  const infoOpen = await ev("document.getElementById('infoSheet').classList.contains('open')");
  const infoTitle = await ev("document.querySelector('#infoSheet .sheet-title').textContent");
  console.log('说明弹框打开: ' + infoOpen + ' 标题: ' + infoTitle);
  if (!infoOpen) throw new Error('说明弹框未打开');
  await ev("document.getElementById('infoDone').click()");
  const infoClosed = await ev("!document.getElementById('infoSheet').classList.contains('open')");
  console.log('说明弹框已关: ' + infoClosed);
  if (!infoClosed) throw new Error('说明弹框未关闭');

  console.log('--- 菜单 / 关于 / 桥接降级 ---');
  await ev("document.getElementById('menuBtn').click()");
  const menuOpen = await ev("document.getElementById('menuSheet').classList.contains('open')");
  const menuVer = await ev("document.getElementById('menuVer').textContent");
  console.log('菜单打开: ' + menuOpen + ' 版本: ' + menuVer);
  if (!menuOpen) throw new Error('菜单未打开');
  if (menuVer !== '版本 v1.0.12') throw new Error('菜单版本号错误: ' + menuVer);
  const hasExport = await ev("document.getElementById('menuExport') !== null");
  const hasImport = await ev("document.getElementById('menuImport') !== null");
  const hasDiag = await ev("document.getElementById('menuDiag') !== null");
  console.log('菜单含导出/导入/诊断: ' + hasExport + '/' + hasImport + '/' + hasDiag);
  if (!hasExport || !hasImport || !hasDiag) throw new Error('菜单缺少导出/导入/诊断项');
  await ev("document.getElementById('menuAbout').click()");
  const aboutOpen = await ev("document.getElementById('aboutSheet').classList.contains('open')");
  const aboutVer = await ev("document.getElementById('aboutVer').textContent");
  const clCount = await ev("document.querySelectorAll('#changelog li').length");
  console.log('关于打开: ' + aboutOpen + ' 版本: ' + aboutVer + ' 更新记录: ' + clCount);
  if (!aboutOpen) throw new Error('关于未打开');
  if (aboutVer !== 'v1.0.12') throw new Error('关于版本号错误: ' + aboutVer);
  if (clCount !== 13) throw new Error('更新记录应为 13 条');
  await ev("document.getElementById('aboutDone').click()");
  await ev("document.getElementById('menuBtn').click()");
  await ev("document.getElementById('menuCheckUpdate').click()");
  const fallbackToast = await ev("document.getElementById('toast').textContent");
  console.log('浏览器降级提示: ' + fallbackToast);
  if (fallbackToast !== '打包成 App 后可用') throw new Error('降级提示错误: ' + fallbackToast);

  console.log('--- 记录按钮/表单 ---');
  await ev("document.getElementById('recordBtn').click()");
  const opened = await ev("document.getElementById('recordSheet').classList.contains('open')");
  const fTime = await ev("document.getElementById('fTime').value");
  console.log('弹层打开: ' + opened + ' 默认时间: ' + fTime);
  if (!opened) throw new Error('记录弹层未打开');
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(fTime)) throw new Error('默认时间格式不对');
  await ev(`(function(){
    const n=new Date();
    document.getElementById('fTime').value = n.getFullYear()+'-'+String(n.getMonth()+1).padStart(2,'0')+'-'+String(n.getDate()).padStart(2,'0')+'T20:00';
    const set=(el,v)=>{el.value=v; el.dispatchEvent(new Event('input',{bubbles:true}));};
    set(document.getElementById('fDist'),'5.2');
    set(document.getElementById('fMin'),'30');
    set(document.getElementById('fSec'),'15');
    return document.getElementById('paceVal').textContent;
  })()`);
  const paceVal = await ev("document.getElementById('paceVal').textContent");
  console.log('配速预览: ' + paceVal);
  if (paceVal !== "5'49\"") throw new Error('配速预览错误: ' + paceVal);
  await shot('2_record_sheet');

  console.log('--- 保存 ---');
  await ev("document.getElementById('sheetSave').click()");
  const toast = await ev("document.getElementById('toast').textContent");
  const closed = await ev("!document.getElementById('recordSheet').classList.contains('open')");
  const cnt3 = await ev("document.querySelector('#statCount').textContent");
  console.log('toast=' + toast + ' 弹层已关=' + closed + ' 次数=' + cnt3);
  if (cnt3 !== '6') throw new Error('保存后次数应为 6');
  const goalLast2 = await ev("document.querySelector('#goalLastVal').textContent");
  const goalPctAfter = await ev("document.querySelector('#goalPct').textContent");
  console.log('保存后: 上一次=' + goalLast2 + ' 综合=' + goalPctAfter);
  if (goalLast2 !== '52%') throw new Error('保存后上一次应为 52%, 实际 ' + goalLast2);
  if (goalPctAfter !== '61%') throw new Error('保存后综合应仍为 61%');

  console.log('--- 点今天看详情 ---');
  await ev(`(function(){
    const cell = document.querySelector('.cal-grid .day.today');
    if(!cell) return false;
    cell.click();
    return true;
  })()`);
  const dOpen = await ev("document.getElementById('detailSheet').classList.contains('open')");
  const dTitle = await ev("document.getElementById('detailTitle').textContent");
  const rows = await ev("document.querySelectorAll('#detailList .run-row').length");
  console.log('详情打开: ' + dOpen + ' 标题: ' + dTitle + ' 记录数: ' + rows);
  if (!dOpen) throw new Error('详情弹层未打开');
  if (rows !== 3) throw new Error('今天应有 3 条记录(2原+1新), 实际 ' + rows);
  const metaHas = await ev("document.querySelector('#detailList .run-meta').textContent.includes('达成')");
  console.log('详情行含达成进度: ' + metaHas);
  if (!metaHas) throw new Error('详情行应显示达成进度');
  await shot('3_detail');

  console.log('--- 删除一条 ---');
  await ev("document.querySelector('#detailList .run-del').click()");
  const cOpen = await ev("document.getElementById('confirmSheet').classList.contains('open')");
  console.log('确认弹层打开: ' + cOpen);
  if (!cOpen) throw new Error('确认弹层未打开');
  await ev("document.getElementById('confirmOk').click()");
  const remain = await ev("JSON.parse(localStorage.getItem('hakone_records_v1')).length");
  const dClosed = await ev("!document.getElementById('detailSheet').classList.contains('open')");
  const cnt4 = await ev("document.querySelector('#statCount').textContent");
  console.log('删除后剩余: ' + remain + ' 弹层已关: ' + dClosed + ' 次数=' + cnt4);
  if (remain !== 5) throw new Error('删除后应剩 5 条');
  if (cnt4 !== '5') throw new Error('删除后次数应为 5');

  console.log('--- 编辑一条 ---');
  await ev(`(function(){
    const cell = document.querySelector('.cal-grid .day.today');
    cell.click();
    return true;
  })()`);
  await sleep(300);
  await ev("document.querySelector('#detailList .run-row').click()");
  const editTitle = await ev("document.getElementById('sheetTitle').textContent");
  const editDist = await ev("document.getElementById('fDist').value");
  console.log('编辑标题: ' + editTitle + ' 距离预填: ' + editDist);
  if (editTitle !== '修改记录') throw new Error('应进入修改模式');
  await ev("document.getElementById('sheetClose').click()");
  await ev("document.getElementById('detailDone').click()");

  console.log('--- 上月导航 ---');
  await ev("document.getElementById('calPrev').click()");
  const calTitle = await ev("document.getElementById('calTitle').textContent");
  console.log('上一月标题: ' + calTitle);
  const pCnt = await ev("document.querySelector('#mCount').textContent");
  const pDist = await ev("document.querySelector('#mDist').textContent");
  const pTime = await ev("document.querySelector('#mTime').textContent");
  console.log('上月统计: ' + pCnt + ' 次 / ' + pDist + ' / ' + pTime);
  if (pCnt !== '1' || pDist !== '4.20km' || pTime !== '25:00') throw new Error('上月统计应为 1/4.20km/25:00, 实际 ' + pCnt + '/' + pDist + '/' + pTime);
  const todayNav = await ev("document.getElementById('calToday').classList.contains('show')");
  console.log('“今”按钮出现: ' + todayNav);
  await ev("document.getElementById('calToday').click()");
  const backTitle = await ev("document.getElementById('calTitle').textContent");
  const now = new Date();
  const expect = now.getFullYear() + ' · ' + (now.getMonth()+1) + '月';
  console.log('回到本月: ' + backTitle);
  if (backTitle !== expect) throw new Error('“今”按钮应回到本月');

  console.log('--- 日历跳转（有数据月份） ---');
  await ev("document.getElementById('calTitle').click()");
  const jumpOpen = await ev("document.getElementById('jumpSheet').classList.contains('open')");
  const jumpRows = await ev("document.querySelectorAll('#jumpList .menu-item').length");
  const jumpFirst = await ev("document.querySelector('#jumpList .menu-item').textContent");
  console.log('跳转弹层: ' + jumpOpen + ' 月份数: ' + jumpRows + ' 第一条: ' + jumpFirst.trim());
  if (!jumpOpen) throw new Error('跳转弹层未打开');
  if (jumpRows !== 2) throw new Error('应有 2 个有数据的月份, 实际 ' + jumpRows);
  if (!jumpFirst.includes('2026 · 11月')) throw new Error('第一条应为 2026 · 11月');
  await ev(`(function(){
    const items = document.querySelectorAll('#jumpList .menu-item');
    for(let i=0;i<items.length;i++){ if(items[i].textContent.includes('10月')){ items[i].click(); return true; } }
    return false;
  })()`);
  const jumpTitle = await ev("document.getElementById('calTitle').textContent");
  const jumpClosed = await ev("!document.getElementById('jumpSheet').classList.contains('open')");
  console.log('跳转到: ' + jumpTitle + ' 弹层已关: ' + jumpClosed);
  if (jumpTitle !== '2026 · 10月') throw new Error('应跳到 2026 · 10月, 实际 ' + jumpTitle);
  if (!jumpClosed) throw new Error('跳转后应关闭弹层');
  await ev("document.getElementById('calToday').click()");

  console.log('--- 数据导入导出 ---');
  const exp = await ev(`(function(){
    const r = window.Hakone.exportJson();
    const o = JSON.parse(r.json);
    return JSON.stringify({ app: o.app, n: o.records.length, ids: o.records.map(x=>x.id).sort().join(',') });
  })()`);
  console.log('导出内容: ' + exp);
  const eo = JSON.parse(exp);
  if (eo.app !== 'hakone-ekiden') throw new Error('导出缺少 app 标识');
  if (eo.n !== 5) throw new Error('导出应含 5 条记录, 实际 ' + eo.n);

  const imp1 = await ev(`(function(){
    const now = new Date();
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate()-3, 7, 30, 0);
    const payload = { app:'hakone-ekiden', records:[
      { id:'imp-new', ts:d.getTime(), date: d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'), distance:8.8, dur:52*60+48, note:'导入测试' },
      { id:'q1', ts:0, distance:9.9, dur:3600 }
    ]};
    window.Hakone.importData(JSON.stringify(payload));
    const recs = JSON.parse(localStorage.getItem('hakone_records_v1'));
    return JSON.stringify({ n: recs.length, hasNew: recs.some(x=>x.id==='imp-new'), dupCount: recs.filter(x=>x.id==='q1').length, note: recs.find(x=>x.id==='imp-new').note });
  })()`);
  console.log('导入结果: ' + imp1);
  const io = JSON.parse(imp1);
  if (io.n !== 6) throw new Error('导入后应 6 条, 实际 ' + io.n);
  if (!io.hasNew) throw new Error('新记录未导入');
  if (io.dupCount !== 1) throw new Error('重复 id 应去重');
  if (io.note !== '导入测试') throw new Error('note 未保留');
  const toastImp = await ev("document.getElementById('toast').textContent");
  console.log('导入 toast: ' + toastImp);
  if (!toastImp.includes('已导入 1')) throw new Error('导入 toast 应为「已导入 1 条记录」');

  await ev("window.Hakone.importData('not-json')");
  const toastBad = await ev("document.getElementById('toast').textContent");
  console.log('坏文件 toast: ' + toastBad);
  if (!toastBad.includes('导入失败')) throw new Error('坏 JSON 应提示导入失败');

  await ev("window.Hakone.importData('[]')");
  const toastEmpty = await ev("document.getElementById('toast').textContent");
  console.log('空导入 toast: ' + toastEmpty);
  if (!toastEmpty.includes('没有新记录')) throw new Error('空数组应提示无新记录');

  console.log('--- 慢跑不归零：3km@30分 → 15% ---');
  await ev(`(function(){
    const recs = JSON.parse(localStorage.getItem('hakone_records_v1'));
    const now = new Date();
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 22, 30, 0);
    recs.push({ id:'qslow', ts:d.getTime(),
      date: d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'),
      distance:3, dur:1800, note:'' });
    localStorage.setItem('hakone_records_v1', JSON.stringify(recs));
    location.reload();
  })()`);
  await sleep(1200);
  const lastSlow = await ev("document.querySelector('#goalLastVal').textContent");
  console.log('慢跑后上一次: ' + lastSlow);
  if (lastSlow !== '15%') throw new Error('3km@30分 应 15%(不归零), 实际 ' + lastSlow);

  console.log('--- 彩蛋：首次 10km 与达成目标 ---');
  await ev(`(function(){
    const recs = JSON.parse(localStorage.getItem('hakone_records_v1'));
    const now = new Date();
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate()-1, 6, 0, 0);
    recs.push({ id:'qgoal', ts:d.getTime(),
      date: d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'),
      distance:10, dur:59*60, note:'' });
    localStorage.setItem('hakone_records_v1', JSON.stringify(recs));
    location.reload();
  })()`);
  await sleep(1200);
  const eggO2 = await ev("document.getElementById('egg').classList.contains('open')");
  const eg1 = await ev("document.getElementById('eggTitle').textContent");
  console.log('10km 彩蛋: ' + eggO2 + ' ' + eg1);
  if (!eggO2 || eg1 !== '10 公里达成') throw new Error('应弹出「10 公里达成」');
  await ev("document.getElementById('eggOk').click()");
  const eg2 = await ev("document.getElementById('eggTitle').textContent");
  console.log('第二个: ' + eg2);
  if (eg2 !== '一小时十公里') throw new Error('第二个应为「一小时十公里」');
  await ev("document.getElementById('eggOk').click()");
  await ev("location.reload()");
  await sleep(1200);
  const eggAgain = await ev("!document.getElementById('egg').classList.contains('open')");
  console.log('彩蛋不重复触发: ' + eggAgain);
  if (!eggAgain) throw new Error('彩蛋不应重复触发');

  console.log('--- 连点左上角 7 次重置彩蛋 ---');
  await ev(`(function(){
    const brand = document.querySelector('.brand');
    for(let i=0;i<7;i++){ brand.click(); }
    return true;
  })()`);
  const resetToast = await ev("document.getElementById('toast').textContent");
  console.log('重置提示: ' + resetToast);
  if (!resetToast.includes('已重置')) throw new Error('应提示彩蛋已重置');
  await ev("location.reload()");
  await sleep(1200);
  const eggRe = await ev("document.getElementById('egg').classList.contains('open')");
  const eggReTitle = await ev("document.getElementById('eggTitle').textContent");
  console.log('重新触发: ' + eggRe + ' ' + eggReTitle);
  if (!eggRe || eggReTitle !== '一小时十公里') throw new Error('重置后应重新触发「一小时十公里」');
  await ev("document.getElementById('eggOk').click()");

  console.log('--- 无横向溢出复检 ---');
  const overflow2 = await ev("document.documentElement.scrollWidth <= window.innerWidth");
  console.log('无横向溢出: ' + overflow2);

  console.log('✅ 全部断言通过');
  ws.close();
  child.kill();
  process.exit(0);
}

main().catch(e => { console.error('❌ ' + e.message); process.exit(1); });