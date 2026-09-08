/* Edge-IQ model engine v3.0.
   Strict separation: independent model probabilities are calculated without
   bookmaker odds; baseline probabilities remain screening-only.
*/
(function(){
 const clamp=(x,a=.01,b=.99)=>Math.max(a,Math.min(b,x));
 const num=v=>{const n=Number(v);return Number.isFinite(n)?n:null};
 function externalProbability(o){
   for(const v of [o.modelProb,o.model_probability,o.predictedProbability,o.predicted_probability,o.probability]){
     const n=num(v); if(n!=null){const p=n>1?n/100:n;if(p>0&&p<1)return p;}
   }
   return null;
 }
 function baselineProbability(o){
   const p=num(o.consensusProb); if(p==null)return null;
   const books=Math.max(1,Number(o.books)||1),conf=Math.max(0,Math.min(1,(Number(o.confidence)||0)/100));
   return clamp(.5+(p-.5)*(.45+.35*Math.min(1,books/5)+.20*conf));
 }
 function priceAnomaly(o){
   const p=num(o.consensusProb),odds=num(o.odds);
   if(p==null||!(odds>1))return {anomaly:false,ratio:null};
   const ratio=(1/odds)/p;
   return {anomaly:ratio<.55||ratio>1.65,ratio};
 }
 function calibratedExternal(o,p){
   const d=num(o.modelDisagreement??o.model_disagreement);
   let q=.92*p+.08*.5;
   if(d!=null&&d>.10)q=.75*q+.25*.5;
   return clamp(q,.05,.95);
 }
 function internalModelProbability(o){
   try{
     const afl=window.EdgeIQAFLModel?.predict?.(o);
     if(afl&&Number.isFinite(afl.prob)&&afl.prob>0&&afl.prob<1)return afl;
   }catch(_){}
   try{
     const sport=String(o.sport||o.league||'').toUpperCase();
     const market=String(o.market||'').toLowerCase();
     if(sport==='NRL' && /h2h|winner|moneyline|spread|handicap|line/.test(market)){
       const p=window.EdgeIQResearchModels?.nrlProbability?.(o);
       if(Number.isFinite(p)&&p>0&&p<1)return {prob:p,fair:1/p,modelVersion:'NRL-RESEARCH-V1',modelSource:'NRL_RESEARCH',modelIndependent:true,modelConfidence:55};
     }
     if(sport==='TENNIS' && /h2h|winner|moneyline|match/.test(market)){
       const p=window.EdgeIQResearchModels?.tennisProbability?.(o);
       if(Number.isFinite(p)&&p>0&&p<1)return {prob:p,fair:1/p,modelVersion:'TENNIS-RESEARCH-V1',modelSource:'TENNIS_RESEARCH',modelIndependent:true,modelConfidence:55};
     }
     if(sport==='EPL' && /h2h|winner|moneyline|1x2/.test(market)){
       const p=window.EdgeIQResearchModels?.eplProbability?.(o);
       if(Number.isFinite(p)&&p>0&&p<1)return {prob:p,fair:1/p,modelVersion:'EPL-RESEARCH-V1',modelSource:'EPL_RESEARCH',modelIndependent:true,modelConfidence:55};
     }
   }catch(_){}
   return null;
 }
 function evaluate(o){
   const anomaly=priceAnomaly(o);
   const external=externalProbability(o);
   const internal=external==null?internalModelProbability(o):null;
   if(external==null&&internal){
     const modelProb=internal.prob, modelFair=internal.fair, modelEv=modelProb*o.odds-1;
     if(anomaly.anomaly){
       return {...o,modelProb,modelFair,modelEv:null,modelEdge:null,modelSource:'MODEL',
         modelDelta:modelProb-(Number(o.consensusProb)||0),opportunityScore:0,
         priceAnomaly:true,priceAnomalyRatio:anomaly.ratio,modelUsable:false,signal:'VERIFY',
         modelVersion:internal.modelVersion,modelIndependent:true,modelConfidence:internal.modelConfidence,
         modelExpectedMargin:internal.expectedMargin,modelExpectedTotal:internal.expectedTotal};
     }
     return {...o,modelProb,modelFair,modelEv,modelEdge:modelEv,
       modelSource:'MODEL',modelDelta:modelProb-(Number(o.consensusProb)||0),
       opportunityScore:Math.max(0,modelEv),priceAnomaly:false,priceAnomalyRatio:anomaly.ratio,
       modelUsable:modelEv>0,signal:modelEv>=.10?'ELITE':modelEv>=.05?'STRONG':modelEv>=.03?'WATCH':modelEv>0?'MARGINAL':'PASS',
       modelVersion:internal.modelVersion,modelIndependent:true,modelConfidence:internal.modelConfidence,
       modelExpectedMargin:internal.expectedMargin,modelExpectedTotal:internal.expectedTotal};
   }
   if(external!=null){
     const modelProb=calibratedExternal(o,external),modelFair=1/modelProb;
     if(anomaly.anomaly)return {...o,modelProb,modelFair,modelEv:null,modelEdge:null,modelSource:'MODEL',
       modelDelta:modelProb-(Number(o.consensusProb)||0),opportunityScore:0,priceAnomaly:true,
       priceAnomalyRatio:anomaly.ratio,modelUsable:false,signal:'VERIFY',modelIndependent:false};
     const modelEv=modelProb*o.odds-1;
     return {...o,modelProb,modelFair,modelEv,modelEdge:o.odds/modelFair-1,modelSource:'MODEL',
       modelDelta:modelProb-(Number(o.consensusProb)||0),opportunityScore:Math.max(0,modelEv),
       priceAnomaly:false,priceAnomalyRatio:anomaly.ratio,modelUsable:modelEv>0,
       signal:modelEv>=.10?'ELITE':modelEv>=.05?'STRONG':modelEv>=.03?'WATCH':modelEv>0?'MARGINAL':'PASS',
       modelIndependent:false};
   }
   const screeningProb=baselineProbability(o),screeningEv=screeningProb!=null?screeningProb*o.odds-1:null;
   const priceEdge=o.bestVsMedian!=null?o.bestVsMedian:0;
   const anomalous=anomaly.anomaly;
   return {...o,modelProb:null,modelFair:null,modelEv:null,modelEdge:null,modelSource:'BASELINE',
     screeningProb,screeningEv,priceEdge,opportunityScore:anomalous?0:(screeningEv!=null?Math.max(0,screeningEv)*.35:Math.max(0,priceEdge)*.25),
     modelUsable:false,priceAnomaly:anomalous,priceAnomalyRatio:anomaly.ratio,signal:anomalous?'VERIFY':'SCREEN',
     modelIndependent:false};
 }
 function apply(opportunities){
   return opportunities.map(evaluate).sort((a,b)=>(b.opportunityScore??-Infinity)-(a.opportunityScore??-Infinity)||((b.modelEv??-Infinity)-(a.modelEv??-Infinity))||((b.confidence??0)-(a.confidence??0)));
 }
 function ensureLeagueOptions(){const sel=document.getElementById('league');if(sel&&!Array.from(sel.options).some(o=>o.value==='MLB')){const o=document.createElement('option');o.value='MLB';o.textContent='MLB';sel.appendChild(o)}}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ensureLeagueOptions);else ensureLeagueOptions();
 window.EdgeIQModel={evaluate,apply,externalProbability,baselineProbability,priceAnomaly,calibratedExternal,internalModelProbability};
})();

function marketQuality(o){
  const books=Number(o.books||0),consensus=Number(o.consensusProb||0),model=Number(o.modelProb||0);
  const coverage=Math.min(1,books/6);
  const disagreement=model&&consensus?Math.min(1,Math.abs(model-consensus)/0.12):0;
  const anomaly=Math.min(1,Math.abs(Number(o.priceAnomalyRatio||0))/0.08);
  return Math.min(1,coverage*.45+disagreement*.25+anomaly*.30);
}
function opportunityScoreV41(o){
  const ev=Number(o.modelEv),screen=Number(o.screeningEv),q=marketQuality(o);
  if(Number.isFinite(ev)) return Math.max(0,ev)*.70+q*.30;
  if(Number.isFinite(screen)) return Math.max(0,screen)*.40+q*.15;
  return Math.max(0,Number(o.priceEdge||0))*.15;
}
function rankOpportunitiesV41(items){
  return items.map(o=>({...o,marketQuality:marketQuality(o),opportunityScore:opportunityScoreV41(o)}))
    .sort((a,b)=>(b.opportunityScore??-Infinity)-(a.opportunityScore??-Infinity));
}