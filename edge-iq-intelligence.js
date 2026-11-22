/* Edge-IQ local rules-based market intelligence. No external AI/API calls. */
(function(){
 const $=id=>document.getElementById(id);
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const pct=n=>Number.isFinite(Number(n))?(Number(n)*100).toFixed(1)+'%':'—';
 const odds=n=>Number.isFinite(Number(n))?Number(n).toFixed(2):'—';
 const num=n=>{const x=Number(n);return Number.isFinite(x)?x:null};
 const history=()=>{try{return JSON.parse(localStorage.getItem('edgeiq_market_snapshots_v1')||'[]')}catch(_){return[]}};
 function movement(o){
  const prior=history().filter(r=>String(r.eventId)===String(o.eventId)&&String(r.selection)===String(o.selection)&&Number(r.ts)<Date.now()-1500&&Number(r.odds)>1).sort((a,b)=>a.ts-b.ts);
  if(!prior.length)return {count:0,label:'No prior scan'};
  const first=prior[0],last=prior[prior.length-1],change=num(last.odds)&&num(o.odds)?o.odds/first.odds-1:null;
  return {count:prior.length,label:change==null?'Prior prices found':change<-.005?'Price shortening':change>.005?'Price drifting':'Price broadly stable',change,first:first.odds};
 }
 function analyse(){
  const scan=window.__edgeIqLastScan,root=$('edgeAnalysisOutput'),status=$('edgeAnalysisStatus');
  if(!scan||!Array.isArray(scan.opportunities)||!scan.opportunities.length){status.textContent='Run SCAN LIVE MARKET first.';return}
  const all=scan.opportunities,independent=all.filter(o=>o.modelSource==='MODEL'&&o.modelIndependent===true&&num(o.modelProb)!=null&&num(o.modelEv)!=null&&!o.priceAnomaly);
  const baseline=all.filter(o=>o.modelSource==='BASELINE');
  const anomalies=all.filter(o=>o.priceAnomaly);
  const strong=independent.filter(o=>o.modelEv>=.05&&Number(o.books)>=3&&Number(o.confidence)>=50).sort((a,b)=>b.modelEv-a.modelEv);
  const gaps=all.filter(o=>num(o.modelProb)!=null&&num(o.consensusProb)!=null).map(o=>({...o,gap:o.modelProb-o.consensusProb})).sort((a,b)=>Math.abs(b.gap)-Math.abs(a.gap)).slice(0,5);
  const movers=independent.map(o=>({...o,movement:movement(o)})).filter(o=>o.movement.count>0).sort((a,b)=>Math.abs(b.movement.change||0)-Math.abs(a.movement.change||0)).slice(0,5);
  const renderCard=(o,i)=>'<article class="edge-intel-item"><h3>'+(i+1)+'. '+esc(o.sport||o.league||'')+' · '+esc(o.event||'')+'</h3><p><b>'+esc(o.selection||'')+'</b> · '+esc(o.market||'')+' · '+esc(o.book||'')+' @ '+odds(o.odds)+'</p><div><span class="edge-intel-tag">Model '+pct(o.modelProb)+'</span><span class="edge-intel-tag">Fair '+odds(o.modelFair)+'</span><span class="edge-intel-tag">EV '+pct(o.modelEv)+'</span><span class="edge-intel-tag">'+(o.books||0)+' books</span></div><p>'+esc(o.modelVersion||o.modelSource||'Model')+' · confidence '+(o.modelConfidence??o.confidence??'—')+' · '+(o.modelIndependent?'independent probability':'not independently modelled')+(o.movement?' · '+esc(o.movement.label):'')+'</p></article>';
  const risks=[];
  if(!independent.length)risks.push('No usable independent model probabilities in this scan. Baseline screens are not independent betting edges.');
  if(baseline.length)risks.push(baseline.length+' baseline-only markets are screening signals, not model-backed EV.');
  if(anomalies.length)risks.push(anomalies.length+' price anomalies were excluded from the model-backed shortlist; recheck the feed and market.');
  if(independent.some(o=>Number(o.books)<3))risks.push('Some modelled selections have fewer than three bookmakers, limiting price confidence.');
  if(!movers.length)risks.push('No comparable earlier price snapshots were found for the model-backed selections; movement cannot yet be assessed.');
  const summary='<div class="edge-intel-grid"><div class="edge-intel-stat"><small>Markets reviewed</small><strong>'+all.length+'</strong></div><div class="edge-intel-stat"><small>Independent model rows</small><strong>'+independent.length+'</strong></div><div class="edge-intel-stat"><small>Strong watchlist</small><strong>'+strong.length+'</strong></div><div class="edge-intel-stat"><small>Price anomalies</small><strong>'+anomalies.length+'</strong></div></div>';
  const best=strong.length?'<h3>Higher-priority model watchlist</h3><div class="edge-intel-list">'+strong.slice(0,5).map(renderCard).join('')+'</div>':'<div class="empty">No selections currently meet the stronger research screen (independent model, at least 5% model EV, 3+ books and 50+ confidence). This is not a signal to force a bet.</div>';
  const gapHtml=gaps.length?'<h3 style="margin-top:18px">Largest model vs market disagreements</h3><div class="edge-intel-list">'+gaps.map((o,i)=>'<article class="edge-intel-item"><h3>'+esc(o.event||'')+' · '+esc(o.selection||'')+'</h3><p>Model '+pct(o.modelProb)+' vs consensus '+pct(o.consensusProb)+' · gap <b class="'+(Math.abs(o.gap)>=.05?'edge-intel-warn':'')+'">'+(o.gap>0?'+':'')+pct(o.gap)+'</b> · '+(o.modelIndependent?'independent model':'non-independent model input')+'</p></article>').join('')+'</div>':'';
  const moveHtml=movers.length?'<h3 style="margin-top:18px">Observed price movement</h3><div class="edge-intel-list">'+movers.map(o=>'<article class="edge-intel-item"><h3>'+esc(o.event||'')+' · '+esc(o.selection||'')+'</h3><p>'+esc(o.movement.label)+' · first stored price '+odds(o.movement.first)+' · current '+odds(o.odds)+' · '+(o.movement.change==null?'—':pct(o.movement.change))+' · '+o.movement.count+' earlier snapshots</p></article>').join('')+'</div>':'';
  root.innerHTML=summary+best+gapHtml+moveHtml+'<h3 style="margin-top:18px">Risk and data checks</h3><div class="edge-intel-list">'+risks.map(x=>'<article class="edge-intel-item"><p>'+esc(x)+'</p></article>').join('')+'</div><p class="tiny" style="margin-top:12px">Generated locally at '+esc(new Date().toLocaleString())+'. Ranking is a research filter, not a prediction guarantee or staking instruction. Model probabilities and EV remain subject to calibration and out-of-sample validation.</p>';
  status.textContent='Local analysis complete · '+independent.length+' independent model rows · '+baseline.length+' baseline screens · no AI/API request made.';
 }
 document.addEventListener('DOMContentLoaded',()=>{
  const btn=$('edgeAnalyseBtn');if(btn)btn.addEventListener('click',analyse);
  window.addEventListener('edgeiq:scan-complete',()=>{if(btn)btn.disabled=false;if($('edgeAnalysisStatus'))$('edgeAnalysisStatus').textContent='Latest scan ready. Press ANALYSE CURRENT SCAN to run local intelligence.'});
 });
 window.EdgeIQLocalIntelligence={analyse};
})();