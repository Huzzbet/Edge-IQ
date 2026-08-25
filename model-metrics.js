/* Edge-IQ model monitoring helpers. */
(function(){
 const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
 function brier(rows){return rows.length?rows.reduce((s,r)=>s+(r.p-r.y)**2,0)/rows.length:null}
 function logLoss(rows){return rows.length?rows.reduce((s,r)=>{const p=clamp(r.p,.0001,.9999);return s-(r.y*Math.log(p)+(1-r.y)*Math.log(1-p))},0)/rows.length:null}
 function calibration(rows,bins=10){return Array.from({length:bins},(_,i)=>{const lo=i/bins,hi=(i+1)/bins,g=rows.filter(r=>r.p>=lo&&r.p<(i===bins-1?1:hi));return {lo,hi,count:g.length,predicted:g.length?g.reduce((s,r)=>s+r.p,0)/g.length:null,actual:g.length?g.reduce((s,r)=>s+r.y,0)/g.length:null}})}
 function metrics(rows){const n=rows.length;return {samples:n,accuracy:n?rows.filter(r=>(r.p>=.5?1:0)===r.y).length/n:null,brier:brier(rows),logLoss:logLoss(rows),calibration:calibration(rows)}}
 window.EdgeIQMetrics={brier,logLoss,calibration,metrics};
})();
