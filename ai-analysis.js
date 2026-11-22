/* Edge-IQ on-demand AI analysis. Uses only the latest manually triggered scan. */
(function(){
 const WORKER='https://edge-iq.seanhurren.workers.dev';
 const $=id=>document.getElementById(id);
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function setStatus(message,isError=false){const el=$('aiAnalysisStatus');if(el){el.textContent=message;el.className='status '+(isError?'error':'')}}
 function renderReport(text,meta){
  const root=$('aiAnalysisOutput');if(!root)return;
  root.innerHTML='<div class="ai-report">'+esc(text).replace(/\n/g,'<br>')+'</div><div class="tiny" style="margin-top:12px">Analysis generated '+esc(new Date(meta.createdAt||Date.now()).toLocaleString())+' · '+esc(meta.model||'OpenAI model')+' · Research only; verify current prices before acting.</div>';
 }
 async function analyse(){
  const btn=$('aiAnalyseBtn'),last=window.__edgeIqLastScan;
  if(!last||!Array.isArray(last.opportunities)||!last.opportunities.length){setStatus('Run SCAN LIVE MARKET first.',true);return}
  btn.disabled=true;btn.textContent='ANALYSING MARKETS…';
  $('aiAnalysisOutput').innerHTML='<div class="empty">ChatGPT is reviewing the latest snapshot, checking relevant event context and ranking the strongest opportunities…</div>';
  setStatus('Sending the current scan for on-demand AI analysis…');
  const opportunities=last.opportunities.slice(0,35).map(o=>({
   sport:o.sport||o.league,event:o.event,start:o.start,market:o.market,period:o.period,line:o.line,
   selection:o.selection,book:o.book,odds:o.odds,books:o.books,consensusProb:o.consensusProb,
   modelProb:o.modelProb,modelFair:o.modelFair,modelEv:o.modelEv,screeningEv:o.screeningEv,
   modelSource:o.modelSource,modelIndependent:o.modelIndependent,modelVersion:o.modelVersion,
   modelConfidence:o.modelConfidence,confidence:o.confidence,modelExpected:o.modelExpected,
   priceAnomaly:o.priceAnomaly,prices:(o.prices||[]).slice(0,5).map(p=>({book:p.book,odds:p.odds,selection:p.selection}))
  }));
  const payload={scope:$('league')?.value||'ALL',generatedAt:new Date().toISOString(),marketMeta:last.modelMeta||null,
   summary:{events:new Set(last.rows.map(r=>r.eventId||r.event)).size,selections:last.rows.length,opportunities:opportunities.length,
    independentModelOpportunities:opportunities.filter(o=>o.modelSource==='MODEL'&&o.modelIndependent===true).length,
    baselineScreens:opportunities.filter(o=>o.modelSource==='BASELINE').length},
   opportunities};
  try{
   const response=await fetch(WORKER+'/ai/analyse',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
   const data=await response.json();
   if(!response.ok)throw new Error(data.error||'AI analysis failed ('+response.status+').');
   renderReport(data.analysis,data);
   setStatus('AI analysis complete. No bets have been placed.');
  }catch(error){
   $('aiAnalysisOutput').innerHTML='<div class="empty">'+esc(error.message||String(error))+'</div>';
   setStatus(error.message||'Unable to complete AI analysis.',true);
  }finally{btn.disabled=false;btn.textContent='ANALYSE CURRENT SCAN WITH CHATGPT'}
 }
 document.addEventListener('DOMContentLoaded',()=>{
  const btn=$('aiAnalyseBtn');if(btn)btn.addEventListener('click',analyse);
  window.addEventListener('edgeiq:scan-complete',()=>{
   if(btn){btn.disabled=false;btn.textContent='ANALYSE CURRENT SCAN WITH CHATGPT'}
   setStatus('Latest market scan ready. Press the button when you want ChatGPT to analyse it.');
  });
 });
})();
