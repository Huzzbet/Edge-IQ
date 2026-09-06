/* Edge-IQ Research Collector. Browser-side persistence for historical market snapshots. */
(function(){
 const key='edgeiq_market_snapshots_v1',metaKey='edgeiq_collector_meta_v1';
 const read=()=>{try{return JSON.parse(localStorage.getItem(key)||'[]')}catch{return[]}};
 const write=x=>localStorage.setItem(key,JSON.stringify(x.slice(-50000)));
 function collect(opps,runMeta={}){
  const rows=read(),now=Date.now(),batch=(opps||[]).map(o=>({ts:now,eventId:o.eventId||o.id||null,sport:o.sport||o.league||null,market:o.market_key||o.market||null,selection:o.selection||o.name||null,odds:Number(o.odds)||null,modelProb:Number(o.modelProb)||null,modelFair:Number(o.modelFair)||null,modelEv:Number(o.modelEv)||null,screeningEv:Number(o.screeningEv)||null,opportunityScore:Number(o.opportunityScore)||null,books:Number(o.books)||0,runId:runMeta.runId||crypto.randomUUID()}));
  write(rows.concat(batch));localStorage.setItem(metaKey,JSON.stringify({lastRun:now,count:batch.length,total:read().length}));return batch.length;
 }
 function stats(){const x=read();return {snapshots:x.length,events:new Set(x.map(r=>r.eventId)).size,sports:new Set(x.map(r=>r.sport)).size,lastRun:(()=>{try{return JSON.parse(localStorage.getItem(metaKey)||'{}').lastRun||null}catch{return null}})()}}
 function exportJSON(){return JSON.stringify({version:1,exportedAt:new Date().toISOString(),snapshots:read()},null,2)}
 window.EdgeIQDataCollector={collect,stats,exportJSON,read};
})();