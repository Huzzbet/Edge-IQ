/* Edge-IQ model engine v2.1. Strict model/baseline separation and multi-sport registry. */
(function(){
 const clamp=(x,a=.01,b=.99)=>Math.max(a,Math.min(b,x));
 const num=v=>{const n=Number(v);return Number.isFinite(n)?n:null};
 function externalProbability(o){for(const v of [o.modelProb,o.model_probability,o.predictedProbability,o.predicted_probability,o.probability]){const n=num(v);if(n!=null){const p=n>1?n/100:n;if(p>0&&p<1)return p;}}return null}
 function baselineProbability(o){const p=num(o.consensusProb);if(p==null)return null;const books=Math.max(1,Number(o.books)||1),conf=Math.max(0,Math.min(1,(Number(o.confidence)||0)/100));return clamp(.5+(p-.5)*(.45+.35*Math.min(1,books/5)+.20*conf))}
 function priceAnomaly(o){const p=num(o.consensusProb),odds=num(o.odds);if(p==null||!(odds>1))return {anomaly:false,ratio:null};const ratio=(1/odds)/p;return {anomaly:ratio<.55||ratio>1.65,ratio}}
 function calibratedExternal(o,p){const d=num(o.modelDisagreement??o.model_disagreement);let q=.92*p+.08*.5;if(d!=null&&d>.10)q=.75*q+.25*.5;return clamp(q,.05,.95)}
 function evaluate(o){const external=externalProbability(o),anomaly=priceAnomaly(o);if(external==null)return {...o,modelProb:null,modelFair:null,modelEv:null,modelEdge:null,modelSource:'BASELINE',screeningProb:baselineProbability(o),priceAnomaly:anomaly.anomaly,priceAnomalyRatio:anomaly.ratio,signal:'VERIFY'};const modelProb=calibratedExternal(o,external),modelFair=1/modelProb;if(anomaly.anomaly)return {...o,modelProb,modelFair,modelEv:null,modelEdge:null,modelSource:'MODEL',modelDelta:modelProb-(Number(o.consensusProb)||0),priceAnomaly:true,priceAnomalyRatio:anomaly.ratio,modelUsable:false,signal:'VERIFY'};const modelEv=modelProb*o.odds-1;return {...o,modelProb,modelFair,modelEv,modelEdge:o.odds/modelFair-1,modelSource:'MODEL',modelDelta:modelProb-(Number(o.consensusProb)||0),priceAnomaly:false,priceAnomalyRatio:anomaly.ratio,modelUsable:modelEv>0,signal:modelEv>=.10?'ELITE':modelEv>=.05?'STRONG':modelEv>=.03?'WATCH':modelEv>0?'MARGINAL':'PASS'}}
 function apply(opportunities){return opportunities.map(evaluate).sort((a,b)=>(b.modelEv??-Infinity)-(a.modelEv??-Infinity)||((b.confidence??0)-(a.confidence??0)))}
 function ensureLeagueOptions(){const sel=document.getElementById('league');if(sel&&!Array.from(sel.options).some(o=>o.value==='MLB')){const o=document.createElement('option');o.value='MLB';o.textContent='MLB';sel.appendChild(o)}}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ensureLeagueOptions);else ensureLeagueOptions();
 window.EdgeIQModel={evaluate,apply,externalProbability,baselineProbability,priceAnomaly,calibratedExternal};
})();
