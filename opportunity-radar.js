/* Edge-IQ Early-Move Radar. Research signal only; never places wagers. */
(function(){
 function classify(o,movement){
  const ev=Number(o.modelEv??o.screeningEv), conf=Number(o.confidence||0), books=Number(o.books||0), move=Number(movement?.priceMove||0);
  const model=o.modelSource==='MODEL';
  if(model&&ev>=.05&&conf>=.70&&books>=3&&move<=-.015)return {tag:'EARLY MOVE',score:ev*100+conf*10+Math.min(5,Math.abs(move)*100),reason:'Positive model edge with broad coverage and shortening price.'};
  if(model&&ev>=.08&&books>=3)return {tag:'HIGH EDGE',score:ev*100+2,reason:'Large model edge with bookmaker confirmation.'};
  if(move<=-.03&&books>=4)return {tag:'STEAM',score:Math.abs(move)*100,reason:'Material price shortening across a broad market.'};
  return {tag:null,score:0,reason:null};
 }
 function rank(opps,movementById={}){
  return opps.map(o=>({...o,radar:classify(o,movementById[o.eventId||o.id])}))
   .filter(o=>o.radar.tag).sort((a,b)=>b.radar.score-a.radar.score);
 }
 window.EdgeIQOpportunityRadar={classify,rank};
})();