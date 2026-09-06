/* Edge-IQ Opportunity Intelligence: research-only adaptive ranking. */
(function(){
 const rows=()=>window.EdgeIQPredictionLab.read();
 const key=r=>(r.sport||'UNKNOWN')+'::'+(r.market||'UNKNOWN');
 function profile(){
  const map={};
  rows().forEach(r=>{const k=key(r);(map[k]??=[]).push(r)});
  return Object.entries(map).map(([k,x])=>{
   const closed=x.filter(r=>r.closingOdds>1),wins=closed.filter(r=>r.result==='WIN').length;
   const clv=closed.filter(r=>Number.isFinite(r.clv)).map(r=>r.clv);
   const roi=closed.length?closed.reduce((s,r)=>s+(r.profit||0),0)/closed.length:null;
   const avgClv=clv.length?clv.reduce((s,v)=>s+v,0)/clv.length:null;
   const confidence=Math.min(1,closed.length/100);
   const evidence=(avgClv??0)*.55+(roi??0)*.35+confidence*.10;
   return {key:k,sport:k.split('::')[0],market:k.split('::')[1],predictions:x.length,closed:closed.length,hitRate:closed.length?wins/closed.length:null,avgCLV:avgClv,roi,evidence};
  }).sort((a,b)=>b.evidence-a.evidence);
 }
 function adjustment(sport,market){const p=profile().find(x=>x.sport===sport&&x.market===market);if(!p||p.closed<20)return {multiplier:1,status:'INSUFFICIENT_DATA'};if(p.closed>=100&&p.avgCLV>0&&p.roi>0)return {multiplier:1.15,status:'BOOST'};if(p.closed>=50&&(p.avgCLV??0)<0&&(p.roi??0)<0)return {multiplier:.80,status:'DOWNGRADE'};return {multiplier:1,status:'NEUTRAL'}}
 function rerank(opps){return opps.map(o=>{const a=adjustment(o.sport||o.league,o.market_key||o.market);return {...o,adaptiveMultiplier:a.multiplier,adaptiveStatus:a.status,adaptiveScore:(Number(o.opportunityScore)||0)*a.multiplier}}).sort((a,b)=>b.adaptiveScore-a.adaptiveScore)}
 window.EdgeIQOpportunityIntelligence={profile,adjustment,rerank};
})();