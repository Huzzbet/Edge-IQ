/* Edge-IQ signal engine v1. Model agreement + market edge + data quality. */
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
function score(o){
 const v1=Number(o.v1Probability),v2=Number(o.v2Probability),market=Number(o.consensusProb),odds=Number(o.odds);
 const valid=[v1,v2,market,odds].every(Number.isFinite)&&odds>1;
 if(!valid)return {...o,signal:'PASS',signalScore:0};
 const model=(v1+v2)/2, agreement=clamp(1-Math.abs(v1-v2)*4), marketEdge=model-market;
 const ev=model*odds-1;
 const coverage=clamp(Number(o.books||0)/5);
 const confidence=clamp(.45*agreement+.30*coverage+.25*clamp(Math.abs(marketEdge)*5));
 const qualifies=ev>=.05&&marketEdge>=.025&&agreement>=.80&&coverage>=.60;
 const elite=ev>=.10&&marketEdge>=.05&&agreement>=.90&&coverage>=.80;
 return {...o,ensembleProbability:model,modelAgreement:agreement,modelMarketEdge:marketEdge,modelEV:ev,signalScore:Math.round(confidence*100),signal:elite?'ELITE':qualifies?'STRONG':ev>=.03?'WATCH':'PASS'};
}
function rank(opportunities){return opportunities.map(score).sort((a,b)=>b.signalScore-a.signalScore||b.modelEV-a.modelEV)}
export {score,rank};
