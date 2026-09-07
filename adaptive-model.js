/* Edge-IQ Adaptive Model Layer v1
   Research/paper-trading only. Uses realised CLV + ROI + sample size to
   adjust ranking, never to manufacture an independent probability. */
(function(){
 const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
 const read=()=>{try{return JSON.parse(localStorage.getItem('edgeiq_prediction_lab_v1')||'[]')}catch{return[]}};
 const key=(sport,market,source)=>[sport||'UNKNOWN',market||'UNKNOWN',source||'UNKNOWN'].map(x=>String(x).trim().toUpperCase()).join('::');
 function profile(){
  const map={};
  for(const r of read()){if(!(r.entryOdds>1&&r.closingOdds>1))continue;const k=key(r.sport,r.market,r.meta?.modelSource||r.modelSource);(map[k]??=[]).push(r)}
  return Object.entries(map).map(([k,rows])=>{
   const n=rows.length,w=rows.filter(r=>r.result==='WIN').length;
   const roi=rows.reduce((s,r)=>s+(Number(r.profit)||0),0)/n;
   const clv=rows.reduce((s,r)=>s+(Number(r.clv)||0),0)/n;
   const hit=n?w/n:null, sampleWeight=clamp(n/100,0,1);
   const raw=clv*.55+roi*.30+(hit==null?0:(hit-.5)*.15);
   const reliability=clamp(.5+raw*2,0,1);
   return {key:k,samples:n,wins:w,hitRate:hit,roi,avgCLV:clv,reliability,sampleWeight};
  }).sort((a,b)=>b.reliability-a.reliability);
 }
 function adjust({sport,market,modelSource}={}){
  const p=profile().find(x=>x.key===key(sport,market,modelSource));
  if(!p||p.samples<20)return {multiplier:1,status:'INSUFFICIENT_DATA',evidence:p?.samples||0};
  const multiplier=clamp(1+(p.reliability-.5)*.30*p.sampleWeight,.85,1.15);
  let status='NEUTRAL';
  if(p.samples>=100&&p.avgCLV>.01&&p.roi>.02)status='BOOST';
  else if(p.samples>=50&&p.avgCLV<-.01&&p.roi<-.02)status='DOWNGRADE';
  else if(p.avgCLV>0)status='POSITIVE_CLV';
  else if(p.avgCLV<0)status='NEGATIVE_CLV';
  return {multiplier,status,evidence:p.samples,reliability:p.reliability,roi:p.roi,avgCLV:p.avgCLV,hitRate:p.hitRate};
 }
 window.EdgeIQAdaptiveModel={profile,adjust,key};
})();