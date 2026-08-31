/* Edge-IQ model engine v2.1.
   A genuine model probability must come from an external predictive model.
   No bookmaker-consensus fallback is promoted to MODEL EV.
*/
(function(){
 const num=v=>{const n=Number(v);return Number.isFinite(n)?n:null};
 function externalProbability(o){
  for(const v of [o.modelProb,o.model_probability,o.predictedProbability,o.predicted_probability,o.probability]){const n=num(v);if(n!=null){const p=n>1?n/100:n;if(p>0&&p<1)return p;}}
  return null;
 }
 function baselineProbability(o){
  const p=num(o.consensusProb);if(p==null)return null;
  const books=Math.max(1,Number(o.books)||1),conf=Math.max(0,Math.min(1,(Number(o.confidence)||0)/100));
  const weight=.45+.35*Math.min(1,books/5)+.20*conf;
  return Math.max(.01,Math.min(.99,.5+(p-.5)*weight));
 }
 function evaluate(o){
  const external=externalProbability(o);
  if(external==null||!(o.odds>1)){
   const screeningProb=baselineProbability(o);
   return {...o,modelProb:null,modelFair:null,modelEv:null,modelEdge:null,modelSource:'BASELINE',screeningProb,screeningEv:o.screeningEv??null,modelDelta:null};
  }
  const modelFair=1/external,modelEv=external*o.odds-1,modelEdge=o.odds/modelFair-1;
  return {...o,modelProb:external,modelFair,modelEv,modelEdge,modelSource:o.modelSource&&o.modelSource!=='BASELINE'?o.modelSource:'MODEL',modelDelta:external-(Number(o.consensusProb)||0)};
 }
 function apply(opportunities){return opportunities.map(evaluate).sort((a,b)=>(b.modelEv??-Infinity)-(a.modelEv??-Infinity));}
 window.EdgeIQModel={evaluate,apply,externalProbability,baselineProbability};
})();
