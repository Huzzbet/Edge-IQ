/* Edge-IQ Prediction Lab: records predictions, entry price, closing price and outcome. */
(function(){
 const key='edgeiq_prediction_lab_v1';
 const read=()=>{try{return JSON.parse(localStorage.getItem(key)||'[]')}catch{return[]}};
 const write=x=>localStorage.setItem(key,JSON.stringify(x.slice(-5000)));
 function capture(o,meta={}){
  const row={id:crypto.randomUUID(),createdAt:new Date().toISOString(),eventId:o.eventId||o.id||null,sport:o.sport||o.league||null,market:o.market_key||o.market||null,selection:o.selection||o.name||null,modelProb:Number(o.modelProb)||null,entryOdds:Number(o.odds)||null,consensusProb:Number(o.consensusProb)||null,opportunityScore:Number(o.opportunityScore)||null,books:Number(o.books)||0,{...meta,modelSource:o.modelSource||o.model_source||meta.modelSource||null};
  const rows=read();rows.push(row);write(rows);return row;
 }
 function close(id,closingOdds,result=null){
  const rows=read(),r=rows.find(x=>x.id===id);if(!r)return null;
  r.closedAt=new Date().toISOString();r.closingOdds=Number(closingOdds)||null;r.result=result;
  if(r.entryOdds>1&&r.closingOdds>1)r.clv=(r.entryOdds/r.closingOdds)-1;
  if(result==='WIN')r.profit=r.entryOdds-1;if(result==='LOSS')r.profit=-1;if(result==='PUSH')r.profit=0;
  write(rows);return r;
 }
 function summary(){
  const rows=read().filter(r=>r.entryOdds>1),closed=rows.filter(r=>r.closingOdds>1);
  const wins=closed.filter(r=>r.result==='WIN').length,losses=closed.filter(r=>r.result==='LOSS').length;
  const clv=closed.length?closed.reduce((s,r)=>s+(r.clv||0),0)/closed.length:null;
  const roi=closed.length?closed.reduce((s,r)=>s+(r.profit||0),0)/closed.length:null;
  return {predictions:rows.length,closed:closed.length,wins,losses,hitRate:closed.length?wins/closed.length:null,avgCLV:clv,roi};
 }
 window.EdgeIQPredictionLab={capture,close,summary,read};
})();