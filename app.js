/* Offline dashboard. All amounts are in 100 million KRW (억 원). */
(() => {
  'use strict';
  const source = window.BUDGET_DATA;
  const all = source.records;
  const $ = id => document.getElementById(id);
  const palette = ['#8060e8','#22b9d1','#f3a15c','#ed70a3','#49b99c','#648ee8','#b680d5','#93bb56','#e7bf53','#64c9c2','#e47d77','#94a0d0'];
  const colors = {'전력운영':palette[0], '방위력개선':palette[1], '병무행정':palette[2]};
  const state = {sector:'',account:'',year:2027,adjustments:true,search:'',sort:'b',direction:-1};
  const fmt = n => Number(n).toLocaleString('ko-KR',{maximumFractionDigits:0});
  const percent = n => n == null || !Number.isFinite(n) ? '—' : `${n > 0 ? '+' : ''}${(n*100).toFixed(1)}%`;
  const money = n => `${n < 0 ? '−' : ''}${Math.abs(n)>=10000 ? `${fmt(Math.floor(Math.abs(n)/10000))}조 ${fmt(Math.abs(n)%10000)}` : fmt(Math.abs(n))}`;
  const sign = n => (n > 0 ? '+' : n < 0 ? '−' : '')+fmt(Math.abs(n));
  const sum = (rows,key) => rows.reduce((s,r)=>s+r[key],0);
  const key = () => state.year===2027?'b':'a';
  const unique = values => [...new Set(values)];
  const esc = s => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function aggregate(rows, field) { const map=new Map();rows.forEach(r=>{const v=map.get(r[field])||{name:r[field],a:0,b:0,delta:0}; v.a+=r.a;v.b+=r.b;v.delta+=r.delta;map.set(r[field],v);});return [...map.values()]; }
  function filtered(){return all.filter(r=>(!state.sector||r.sector===state.sector)&&(!state.account||r.account===state.account)&&(state.adjustments||!(r.a<0||r.b<0)));}
  function tip(text,extra=''){return `data-tip="${esc(text)}" tabindex="0" ${extra}`;}
  function svg(w,h,body,label){return `<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(label)}">${body}</svg>`;}
  const text=(x,y,value,cls='',anchor='start')=>`<text x="${x}" y="${y}" class="${cls}" text-anchor="${anchor}">${esc(value)}</text>`;
  const line=(x1,y1,x2,y2,cls='axis-grid')=>`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="${cls}"/>`;
  const empty = id => $(id).innerHTML='<div class="empty">선택한 조건에 해당하는 데이터가 없습니다.<br>필터를 변경해 주세요.</div>';
  function sectorChart(rows){
    const groups=aggregate(rows,'sector'),w=Math.max(300,$('sector-chart').clientWidth),h=255,l=55,b=37,t=18,r=18;
    if(!groups.length)return empty('sector-chart');
    const max=Math.max(1,...groups.flatMap(x=>[x.a,x.b])), min=Math.min(0,...groups.flatMap(x=>[x.a,x.b]));const scale=v=>t+(max-v)/(max-min)*(h-t-b);
    let body='';for(let i=0;i<=4;i++){const value=min+(max-min)*i/4,y=scale(value);body+=line(l,y,w-r,y)+text(l-9,y+4,fmt(value),'small-label','end');}
    const band=(w-l-r)/groups.length;
    groups.forEach((g,i)=>{const x=l+band*(i+.5),bw=Math.min(48,band*.22);['a','b'].forEach((k,j)=>{const xx=x+(j===0?-bw-3:3),zero=scale(0),yy=scale(g[k]);body+=`<rect x="${xx}" y="${Math.min(zero,yy)}" width="${bw}" height="${Math.max(2,Math.abs(zero-yy))}" rx="4" fill="${j?'#8060e8':'#cbbcf6'}" ${tip(`${g.name} · ${j?'2027':'2026'}년\n${money(g[k])}억 원`,'data-sector="'+esc(g.name)+'"')}/>`;});body+=text(x,h-13,g.name,'','middle');});
    $('sector-chart').innerHTML=svg(w,h,body,'부문별 2026년과 2027년 예산 비교');
  }
  function donut(rows){
    const groups=aggregate(rows.filter(r=>r[key()]>0),'sector'),total=sum(groups,key()),w=310,h=235,cx=155,cy=104,r=73,circ=2*Math.PI*r;
    if(!total)return empty('donut-chart');let offset=0;
    let body=`<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#f1eef8" stroke-width="27"/>`;
    groups.forEach(g=>{const length=g[key()]/total*circ;body+=`<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${colors[g.name]}" stroke-width="27" stroke-dasharray="${Math.max(0,length-2)} ${circ}" stroke-dashoffset="${-offset}" transform="rotate(-90 ${cx} ${cy})" ${tip(`${g.name}\n${money(g[key()])}억 원 · ${(g[key()]/total*100).toFixed(1)}%`,'data-sector="'+g.name+'"')}/>`;offset+=length;});
    body+=text(cx,99,'양수 예산 합계','small-label','middle')+`<text x="${cx}" y="123" text-anchor="middle" style="font-size:20px;font-weight:700;fill:#36445f">${(total/10000).toFixed(2)}조</text>`+text(cx,145,`${state.year}년`,'small-label','middle');
    $('donut-chart').innerHTML=svg(w,h,body,'양수 예산의 부문별 비중')+`<div class="donut-legend">${groups.map(g=>`<button data-sector="${g.name}" title="${g.name} 필터 적용"><i style="background:${colors[g.name]}"></i>${g.name}<b>${(g[key()]/total*100).toFixed(1)}%</b></button>`).join('')}</div>`;
  }
  function horizontal(id,items,{delta=false,account=false}={}){
    if(!items.length)return empty(id);
    const w=Math.max(300,$(id).clientWidth),h=255,l=account?112:(w<500?132:183),right=60,top=12,bottom=22;
    const max=Math.max(1,...items.map(x=>Math.max(0,x.value))),min=Math.min(0,...items.map(x=>x.value));
    const sx=v=>l+(v-min)/(max-min)*(w-l-right),zero=sx(0),band=(h-top-bottom)/items.length;
    let body=line(zero,top,zero,h-bottom,'axis-baseline');
    for(let i=0;i<=3;i++){const v=min+(max-min)*i/3,x=sx(v);body+=line(x,top,x,h-bottom)+text(x,h-4,Math.abs(v)>=10000?`${(v/10000).toFixed(1)}만`:fmt(v),'small-label','middle');}
    items.forEach((item,i)=>{const y=top+band*i+band*.24,height=band*.52,x=sx(item.value),color=delta?(item.value<0?palette[3]:'#32b99e'):(item.color||palette[i%palette.length]);
      const maxLabel=Math.max(8,Math.floor((l-18)/9));
      body+=text(l-12,y+height/2+4,item.name.length>maxLabel?item.name.slice(0,maxLabel-1)+'…':item.name,'small-label','end');
      body+=`<rect x="${Math.min(x,zero)}" y="${y}" width="${Math.max(2,Math.abs(x-zero))}" height="${Math.max(8,height)}" rx="4" fill="${color}" ${tip(`${item.name}\n${delta?'증감: ':state.year+'년: '}${delta?sign(item.value):money(item.value)}억 원${item.rate!=null?'\n증감률: '+percent(item.rate):''}`)}/>`;
      const negativeInside=item.value<0&&Math.abs(x-zero)>65;
      const labelX=item.value<0?(negativeInside?x+7:zero+6):x+6;
      body+=text(labelX,y+height/2+4,delta?sign(item.value):fmt(item.value),'value-label'+(negativeInside?' white-label':''),'start');
    });$(id).innerHTML=svg(w,h,body,delta?'프로그램별 증감액 비교':'예산 규모 비교');
  }
  function scatter(rows){
    const valid=rows.filter(r=>r.a>0&&r.b>0&&Number.isFinite(r.rate));if(!valid.length)return empty('scatter-chart');
    const w=360,h=260,l=49,right=26,top=24,bottom=47;
    let xmin=Math.floor(Math.log10(Math.min(...valid.map(r=>r[key()])))),xmax=Math.ceil(Math.log10(Math.max(...valid.map(r=>r[key()]))));if(xmin===xmax)xmax++;
    let ymin=Math.min(-.1,...valid.map(r=>r.rate)),ymax=Math.max(.1,...valid.map(r=>r.rate));const span=ymax-ymin;ymin-=span*.08;ymax+=span*.08;
    const x=v=>l+(Math.log10(v)-xmin)/(xmax-xmin)*(w-l-right),y=v=>top+(ymax-v)/(ymax-ymin)*(h-top-bottom);
    let body='';for(let i=xmin;i<=xmax;i++){body+=line(x(10**i),top,x(10**i),h-bottom)+text(x(10**i),h-bottom+19,fmt(10**i),'small-label','middle');}
    for(let i=0;i<4;i++){const v=ymin+(ymax-ymin)*i/3;body+=line(l,y(v),w-right,y(v))+text(l-7,y(v)+4,`${(v*100).toFixed(0)}%`,'small-label','end');}
    body+=line(l,y(0),w-right,y(0),'axis-baseline');
    valid.forEach(r=>{body+=`<circle cx="${x(r[key()])}" cy="${y(r.rate)}" r="${4+Math.sqrt(r[key()]/Math.max(...valid.map(r=>r[key()])))*11}" fill="${colors[r.sector]}" fill-opacity=".65" stroke="white" stroke-width="1.5" ${tip(`${r.program}\n${state.year}년: ${money(r[key()])}억 원\n증감률: ${percent(r.rate)}`)}/>`;});body+=text(w/2,h-5,'예산 규모 (억 원 · 로그 축)','small-label','middle');$('scatter-chart').innerHTML=svg(w,h,body,'프로그램의 예산 규모와 증감률 산점도');
  }
  function waterfall(rows){
    if(!rows.length)return empty('waterfall-chart');const start=sum(rows,'a'),end=sum(rows,'b'),groups=aggregate(rows,'sector');
    let running=start;const items=[{name:'2026년',low:Math.min(0,start),high:Math.max(0,start),value:start,total:true}];groups.forEach(g=>{items.push({name:g.name,low:Math.min(running,running+g.delta),high:Math.max(running,running+g.delta),value:g.delta,from:running});running+=g.delta;});items.push({name:'2027년',low:Math.min(0,end),high:Math.max(0,end),value:end,total:true});
    const w=Math.max(300,$('waterfall-chart').clientWidth),h=240,l=w<500?50:70,right=15,top=24,bottom=36,max=Math.max(1,...items.map(i=>i.high)),min=Math.min(0,...items.map(i=>i.low));const y=v=>top+(max-v)/(max-min)*(h-top-bottom),band=(w-l-right)/items.length,bw=Math.min(110,band*.62);let body='';
    for(let i=0;i<=4;i++){const v=min+(max-min)*i/4;body+=line(l,y(v),w-right,y(v))+text(l-10,y(v)+4,fmt(v),'small-label','end');}
    items.forEach((g,i)=>{const xx=l+band*(i+.5)-bw/2,color=g.total?(i===0?'#b7a6ed':'#7856e8'):(g.value<0?palette[3]:'#31b99e');body+=`<rect x="${xx}" y="${y(g.high)}" width="${bw}" height="${Math.max(2,y(g.low)-y(g.high))}" rx="4" fill="${color}" ${tip(`${g.name}${g.total?' 예산':' 증감'}\n${g.total?money(g.value):sign(g.value)}억 원`)}/>`;body+=text(xx+bw/2,y(g.high)-7,g.total?fmt(g.value):sign(g.value),'value-label','middle')+text(xx+bw/2,h-12,g.name,'','middle');if(i<items.length-1){const level=g.total?g.value:g.from+g.value;body+=line(xx+bw,y(level),xx+band,y(level),'axis-baseline');}});$('waterfall-chart').innerHTML=svg(w,h,body,'2026년 예산에서 부문별 증감을 더해 2027년 예산으로 연결하는 워터폴');
  }
  function treemap(rows){
    const positive=rows.filter(r=>r[key()]>0).sort((a,b)=>b[key()]-a[key()]);if(!positive.length)return empty('treemap-chart');
    const nodes=positive.slice(0,12).map((r,i)=>({name:r.program,value:r[key()],color:palette[i%palette.length]}));if(positive.length>12)nodes.push({name:'기타 '+(positive.length-12)+'개',value:sum(positive.slice(12),key()),color:'#9aa9c2'});
    const w=Math.max(300,$('treemap-chart').clientWidth),h=275;let body='';
    function layout(items,x,y,width,height){if(items.length===1){const g=items[0],gap=3;body+=`<g ${tip(`${g.name}\n${money(g.value)}억 원`)}><rect x="${x+gap}" y="${y+gap}" width="${Math.max(0,width-gap*2)}" height="${Math.max(0,height-gap*2)}" fill="${g.color}" rx="6"/>`;
        if(width>75&&height>32){const maxChars=Math.floor((width-18)/10),label=g.name.length>maxChars?g.name.slice(0,Math.max(2,maxChars-1))+'…':g.name;body+=text(x+12,y+Math.min(height/2,26),label,'white-label small-label');if(height>56)body+=text(x+12,y+Math.min(height/2,26)+21,fmt(g.value),'white-label');}body+='</g>';return;}
      const total=items.reduce((s,r)=>s+r.value,0);let sumA=0,split=0;while(split<items.length-1&&sumA<total/2){sumA+=items[split].value;split++;}const ratio=sumA/total;if(width>=height){layout(items.slice(0,split),x,y,width*ratio,height);layout(items.slice(split),x+width*ratio,y,width*(1-ratio),height);}else{layout(items.slice(0,split),x,y,width,height*ratio);layout(items.slice(split),x,y+height*ratio,width,height*(1-ratio));}}
    layout(nodes,0,0,w,h);$('treemap-chart').innerHTML=svg(w,h,body,'프로그램별 예산 트리맵');
  }
  function matrix(rows){
    if(!rows.length)return empty('matrix-chart');const sectors=unique(rows.map(r=>r.sector)),accounts=unique(rows.map(r=>r.account));
    const entries=sectors.flatMap(sector=>accounts.map(account=>{const r=rows.filter(x=>x.sector===sector&&x.account===account);const a=sum(r,'a'),b=sum(r,'b');return{sector,account,value:sum(r,key()),rate:a?(b-a)/a:null,exists:!!r.length};}));const max=Math.max(1,...entries.map(x=>Math.abs(x.value)));
    const label=a=>a.replace('내부거래·보전지출','내부거래·\n보전지출').replace('특별회계·기금','특별회계·\n기금');
    $('matrix-chart').innerHTML=`<div class="matrix-line header" style="--columns:${accounts.length}"><span></span>${accounts.map(a=>`<span class="matrix-label">${esc(label(a)).replaceAll('\n','<br>')}</span>`).join('')}</div>`+sectors.map(sector=>`<div class="matrix-line" style="--columns:${accounts.length}"><span class="matrix-label">${sector}</span>${entries.filter(x=>x.sector===sector).map(x=>{const intensity=.08+.75*Math.sqrt(Math.abs(x.value)/max),bg=x.exists?(x.value<0?`rgba(237,112,163,${intensity})`:`rgba(128,96,232,${intensity})`):'#f6f8fc';return `<div class="matrix-cell" style="background:${bg};color:${intensity>.48&&x.exists?'white':'#76819a'}" ${tip(`${sector} · ${x.account}\n${x.exists?money(x.value)+'억 원\n증감률: '+percent(x.rate):'해당 항목 없음'}`)}>${x.exists?fmt(x.value):'—'}<small>${x.exists?percent(x.rate):''}</small></div>`;}).join('')}</div>`).join('')+'<div class="matrix-note">보라: 양수 · 분홍: 음수 · —: 해당 항목 없음<br>각 칸 아래는 2026년 대비 증감률입니다.</div>';
  }
  function tableRows(){let rows=filtered();const query=state.search.trim().toLocaleLowerCase();if(query)rows=rows.filter(r=>[r.program,r.group,r.sector,r.account].some(v=>String(v).toLocaleLowerCase().includes(query)));return rows.sort((a,b)=>{const av=a[state.sort],bv=b[state.sort];return state.direction*(typeof av==='number'?av-bv:String(av).localeCompare(String(bv),'ko'));});}
  function table(){const rows=tableRows();$('table-count').textContent=rows.length;$('table-body').innerHTML=rows.length?rows.map(r=>`<tr><td><span class="sector-badge" style="background:${colors[r.sector]}14;color:${colors[r.sector]}">${esc(r.sector)}</span></td><td>${esc(r.account)}</td><td>${esc(r.group)}</td><td>${esc(r.program)}</td><td class="number">${fmt(r.a)}</td><td class="number">${fmt(r.b)}</td><td class="number ${r.delta<0?'negative':'positive'}">${sign(r.delta)}</td><td class="number ${r.rate<0?'negative':'positive'}">${percent(r.rate)}</td></tr>`).join(''):'<tr><td colspan="8" style="text-align:center;padding:40px">검색 결과가 없습니다.</td></tr>';document.querySelectorAll('th').forEach(th=>{const button=th.querySelector('button');th.removeAttribute('aria-sort');if(button.dataset.sort===state.sort)th.setAttribute('aria-sort',state.direction===1?'ascending':'descending');});}
  function updateAccounts(){const valid=unique(all.filter(r=>!state.sector||r.sector===state.sector).map(r=>r.account));if(!valid.includes(state.account))state.account='';$('account').innerHTML='<option value="">전체 회계구분</option>'+valid.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('');$('account').value=state.account;}
  function render(){
    const rows=filtered(),a=sum(rows,'a'),b=sum(rows,'b'),delta=b-a;
    $('total27').textContent=money(b)+'억';$('total26').textContent=money(a)+'억';$('total-change').textContent=sign(delta)+'억';$('total-rate').textContent=a?percent(delta/a):'—';
    $('total27-detail').textContent=`${fmt(b)}억 원 · 선택 조건 합산`;$('count-change').textContent=`증가 ${rows.filter(r=>r.delta>0).length}개 · 감소 ${rows.filter(r=>r.delta<0).length}개 프로그램`;
    $('record-count').textContent=`${rows.length} / ${all.length}개 프로그램`;$('selection').innerHTML=[state.sector||'전체 부문',state.account||'전체 회계구분',state.adjustments?'조정 항목 포함':'조정 항목 제외'].map(v=>`<span class="filter-chip">${esc(v)}</span>`).join('');
    document.querySelectorAll('.year-label').forEach(el=>el.textContent=state.year);
    const sparkMax=Math.max(Math.abs(a),Math.abs(b),1),sparkY=v=>27-v/sparkMax*24;
    $('delta-spark').innerHTML=svg(50,30,`<path d="M2 ${sparkY(a)} L48 ${sparkY(b)}" fill="none" stroke="currentColor" stroke-width="3"/>`,'2026년과 2027년의 합계 변화');
    sectorChart(rows);donut(rows);horizontal('account-chart',aggregate(rows,'account').map((r,i)=>({...r,value:r[key()],color:palette[i]})),{account:true});
    horizontal('ranking-chart',rows.filter(r=>r[key()]>0).sort((a,b)=>b[key()]-a[key()]).slice(0,8).map(r=>({...r,name:r.program,value:r[key()],color:colors[r.sector]})));
    horizontal('delta-chart',[...rows].sort((a,b)=>Math.abs(b.delta)-Math.abs(a.delta)).slice(0,8).map(r=>({...r,name:r.program,value:r.delta})),{delta:true});
    scatter(rows);waterfall(rows);treemap(rows);matrix(rows);table();
  }
  function exportCsv(){const records=tableRows(),headers=['부문','회계구분','구분','프로그램명','2026년(억 원)','2027년(억 원)','증감(억 원)','증감률(%)'];const quote=v=>'"'+String(v??'').replaceAll('"','""')+'"';const csv='\ufeff'+[headers,...records.map(r=>[r.sector,r.account,r.group,r.program,r.a,r.b,r.delta,r.rate==null?'':(r.rate*100).toFixed(4)])].map(row=>row.map(quote).join(',')).join('\r\n');const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'}));const a=document.createElement('a');a.href=url;a.download='국방예산_필터결과.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  $('sector').innerHTML+=unique(all.map(r=>r.sector)).map(v=>`<option value="${v}">${v}</option>`).join('');updateAccounts();
  $('sector').addEventListener('change',e=>{state.sector=e.target.value;updateAccounts();render();});$('account').addEventListener('change',e=>{state.account=e.target.value;render();});
  $('adjustments').addEventListener('change',e=>{state.adjustments=e.target.checked;render();});
  document.querySelectorAll('[data-year]').forEach(button=>button.addEventListener('click',()=>{state.year=Number(button.dataset.year);document.querySelectorAll('[data-year]').forEach(b=>{b.classList.toggle('active',b===button);b.setAttribute('aria-pressed',String(b===button));});render();}));
  $('reset').addEventListener('click',()=>{Object.assign(state,{sector:'',account:'',year:2027,adjustments:true,search:'',sort:'b',direction:-1});$('sector').value='';$('adjustments').checked=true;$('search').value='';document.querySelectorAll('[data-year]').forEach(b=>{b.classList.toggle('active',b.dataset.year==='2027');b.setAttribute('aria-pressed',String(b.dataset.year==='2027'));});updateAccounts();render();});
  $('search').addEventListener('input',e=>{state.search=e.target.value;table();});document.querySelectorAll('[data-sort]').forEach(b=>b.addEventListener('click',()=>{state.direction=state.sort===b.dataset.sort?-state.direction:(['a','b','delta','rate'].includes(b.dataset.sort)?-1:1);state.sort=b.dataset.sort;table();}));
  $('export').addEventListener('click',exportCsv);$('export-bottom').addEventListener('click',exportCsv);
  document.addEventListener('click',e=>{const el=e.target.closest('[data-sector]');if(el){state.sector=el.dataset.sector;$('sector').value=state.sector;updateAccounts();render();$('tooltip').hidden=true;}});
  document.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches('svg [data-sector]')){e.preventDefault();e.target.dispatchEvent(new MouseEvent('click',{bubbles:true}));}});
  const tooltip=$('tooltip');function showTip(target,x,y){tooltip.textContent=target.dataset.tip;tooltip.hidden=false;tooltip.style.left=Math.max(8,Math.min(x+15,innerWidth-tooltip.offsetWidth-12))+'px';tooltip.style.top=Math.max(8,Math.min(y+15,innerHeight-tooltip.offsetHeight-12))+'px';}
  document.addEventListener('pointermove',e=>{const el=e.target.closest('[data-tip]');if(el)showTip(el,e.clientX,e.clientY);else tooltip.hidden=true;});document.addEventListener('focusin',e=>{const el=e.target.closest('[data-tip]');if(el){const r=el.getBoundingClientRect();showTip(el,r.x,r.y);}else tooltip.hidden=true;});document.addEventListener('focusout',()=>tooltip.hidden=true);document.addEventListener('keydown',e=>{if(e.key==='Escape')tooltip.hidden=true;});
  $('source-name').textContent=`출처: ${source.source} · ${source.sheet}`;$('updated').textContent=`데이터 반영: ${source.updated} · 외부 전송 없이 브라우저에서 분석`;
  render();
  let resizeFrame;window.addEventListener('resize',()=>{cancelAnimationFrame(resizeFrame);resizeFrame=requestAnimationFrame(render);});
  window.dashboard={getState:()=>({...state}),getFiltered:()=>filtered().map(r=>({...r})),getTable:()=>tableRows().map(r=>({...r}))};
})();
