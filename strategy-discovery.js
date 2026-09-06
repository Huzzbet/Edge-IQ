/* Edge-IQ Strategy Discovery. Research/backtest analytics only. */
(function(){
 const metrics=(x)=>{
  const n=x.length,clv=n?x.reduce((s,r)=>s+(Number(r.clv)||0),0)/n:0;
  const pos=n?x.filter(r=>Number(r.clv)>0).length/n:0;
  const ev=n?x.reduce((s,r)=>s+(Number(r.entryEV)||0),0)/n:0;
  return {n,avgCLV:clv,positiveCLVRate:pos,avgEV:ev,score:clv*.55+pos*.25+Math.min(1,n/100)*.20};
 };
 function discover(rows,opts={}){
  const evs=opts.evThresholds||[.03,.05,.07,.10],books=opts.bookCounts||[2,3,4,5],moves=opts.moveThresholds||[0,.01,.02];
  const out=[];
  for(const minEV of evs)for(const minBooks of books)for(const minMove of moves){
   const x=(rows||[]).filter(r=>Number(r.entryEV)>=minEV&&Number(r.books||0)>=minBooks&&Math.abs(Number(r.priceMove||0))>=minMove);
   if(x.length>=Number(opts.minSamples||20)){const m=metrics(x);out.push({minEV,minBooks,minMove,...m})}
  }
  return out.sort((a,b)=>b.score-a.score);
 }
 function status(r){if(r.n<100)return 'RESEARCH';if(r.avgCLV>0&&r.positiveCLVRate>.52)return 'VALIDATION REVIEW';if(r.avgCLV<0)return 'DOWNGRADE';return 'RESEARCH'}
 window.EdgeIQStrategyDiscovery={discover,metrics,status};
})();