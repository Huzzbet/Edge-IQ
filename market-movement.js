/* Edge-IQ market movement intelligence. Stores snapshots locally and derives price/CLV trajectories. */
(function(){
 const key='edgeiq_market_snapshots_v1';
 const read=()=>{try{return JSON.parse(localStorage.getItem(key)||'[]')}catch{return[]}};
 const write=x=>localStorage.setItem(key,JSON.stringify(x.slice(-20000)));
 function snapshot(o){
  const row={id:crypto.randomUUID(),ts:Date.now(),eventId:o.eventId||o.id||null,sport:o.sport||o.league||null,market:o.market_key||o.market||null,selection:o.selection||o.name||null,odds:Number(o.odds)||null,modelProb:Number(o.modelProb)||null,modelFair:Number(o.modelFair)||null,books:Number(o.books)||0};
  const rows=read();rows.push(row);write(rows);return row;
 }
 function trajectory(eventId,selection){
  return read().filter(r=>r.eventId===eventId&&(selection==null||r.selection===selection)).sort((a,b)=>a.ts-b.ts);
 }
 function analyse(eventId,selection){
  const x=trajectory(eventId,selection);if(x.length<2)return {snapshots:x.length,status:'INSUFFICIENT_DATA'};
  const first=x[0],last=x[x.length-1];
  const move=first.odds&&last.odds?last.odds/first.odds-1:null;
  const fairMove=first.modelFair&&last.modelFair?last.modelFair/first.modelFair-1:null;
  return {snapshots:x.length,entryOdds:first.odds,currentOdds:last.odds,priceMove:move,fairMove,status:move!=null?(move<0?'STEAMING':'DRIFTING'):'NO_PRICE'};
 }
 window.EdgeIQMarketMovement={snapshot,trajectory,analyse,read};
})();