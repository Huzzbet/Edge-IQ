/* Edge-IQ Research Lab diagnostics. */
(function(){
 const group=(rows,key)=>rows.reduce((m,r)=>{const k=r[key]||'UNKNOWN';(m[k]??=[]).push(r);return m},{});
 const calc=rows=>{const closed=rows.filter(r=>r.closingOdds>1),wins=closed.filter(r=>r.result==='WIN').length,clv=closed.filter(r=>Number.isFinite(r.clv)).map(r=>r.clv),profits=closed.map(r=>r.profit||0);return {n:rows.length,closed:closed.length,hit:closed.length?wins/closed.length:null,clv:clv.length?clv.reduce((a,b)=>a+b,0)/clv.length:null,roi:closed.length?profits.reduce((a,b)=>a+b,0)/closed.length:null}};
 function leaderboard(){
  const rows=window.EdgeIQPredictionLab.read();
  return Object.entries(group(rows,'sport')).map(([sport,x])=>({sport,...calc(x)})).sort((a,b)=>(b.clv??-Infinity)-(a.clv??-Infinity));
 }
 function marketLeaderboard(){
  const rows=window.EdgeIQPredictionLab.read();
  return Object.entries(group(rows,'market')).map(([market,x])=>({market,...calc(x)})).sort((a,b)=>(b.clv??-Infinity)-(a.clv??-Infinity));
 }
 function gate(s){return {sample:s.closed>=100,positiveClv:(s.clv??-1)>0,positiveRoi:(s.roi??-1)>0,eligible:s.closed>=100&&(s.clv??-1)>0&&(s.roi??-1)>0}}
 window.EdgeIQResearchLeaderboard={leaderboard,marketLeaderboard,gate};
})();