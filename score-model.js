/* Edge-IQ Generic Score Model V1
   Independent, transparent team-strength model for NRL/EPL.
   Uses historical scores only: recency-weighted offense/defense + home advantage.
   Promotion remains gated by validation/CLV. */
const clamp=(x,a=.01,b=.99)=>Math.max(a,Math.min(b,x));
const num=v=>{const n=Number(v);return Number.isFinite(n)?n:null};
const key=v=>String(v??'').trim().toLowerCase().replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
function poissonPmf(k,lambda){if(lambda<=0)return k===0?1:0;let p=Math.exp(-lambda);for(let i=1;i<=k;i++)p*=lambda/i;return p}
function parseGame(g){
 const comps=g.competitions?.[0]?.competitors||[];
 const home=g.home_team||g.home?.name||g.homeTeam||comps.find(x=>x.homeAway==='home')?.team?.displayName;
 const away=g.away_team||g.away?.name||g.awayTeam||comps.find(x=>x.homeAway==='away')?.team?.displayName;
 const hs=num(g.home_score??g.home_points??g.homeScore??comps.find(x=>x.homeAway==='home')?.score);
 const as=num(g.away_score??g.away_points??g.awayScore??comps.find(x=>x.homeAway==='away')?.score);
 if(!home||!away||hs==null||as==null)return null;
 return {home,away,hs,as,date:g.start_time||g.date||g.dateScheduled||g.competitions?.[0]?.date||''};
}
function build(games,{initial=4,homeAdv=.25,k=.10,formGames=20,decay=.985,scale=1,draws=false}={}){
 const ratings=new Map(),hist=new Map(),get=t=>ratings.get(t)||{off:initial,def:initial},getH=t=>hist.get(t)||[];
 const sorted=games.map(parseGame).filter(Boolean).sort((a,b)=>new Date(a.date)-new Date(b.date));
 for(const g of sorted){
  const h=key(g.home),a=key(g.away),H=get(h),A=get(a);
  const expH=Math.max(.5,H.off-A.def+homeAdv),expA=Math.max(.5,A.off-H.def);
  const hr=g.hs-expH,ar=g.as-expA,damp=Math.min(1.4,Math.max(.7,Math.log1p(Math.abs(g.hs-g.as))/1.5));
  H.off+=k*damp*hr;H.def-=k*damp*(g.as-expA);A.off+=k*damp*ar;A.def-=k*damp*(g.hs-expH);
  ratings.set(h,H);ratings.set(a,A);
  for(const [t,pts,opp] of [[h,g.hs,g.as],[a,g.as,g.hs]]){const arr=getH(t);arr.push({pts,opp});if(arr.length>formGames)arr.shift();hist.set(t,arr)}
 }
 return {ratings,history:hist,params:{initial,homeAdv,k,formGames,decay,scale,draws},gamesUsed:sorted.length};
}
function weighted(arr,field,decay){if(!arr?.length)return null;let n=0,d=0;for(let i=0;i<arr.length;i++){const w=Math.pow(decay,arr.length-1-i);n+=arr[i][field]*w;d+=w}return d?n/d:null}
function normalCdf(x,mu,sd){const erf=x=>{const s=x<0?-1:1,a=Math.abs(x),t=1/(1+.3275911*a),y=1-((((1.061405429*t-1.453152027)*t+1.421413741)*t-.284496736)*t+.254829592)*t*Math.exp(-a*a);return s*y};return .5*(1+erf((x-mu)/(sd*Math.sqrt(2))))}
function predictOne(model,home,away){
 const h=key(home),a=key(away),H=model.ratings.get(h)||{off:model.params.initial,def:model.params.initial},A=model.ratings.get(a)||{off:model.params.initial,def:model.params.initial};
 const hh=model.history.get(h)||[],aa=model.history.get(a)||[];
 const hRecent=weighted(hh,'pts',model.params.decay)??model.params.initial,aRecent=weighted(aa,'pts',model.params.decay)??model.params.initial;
 const homeScore=clamp((H.off-A.def+model.params.homeAdv)*.62+hRecent*.38,.5,8),awayScore=clamp((A.off-H.def)*.62+aRecent*.38,.5,8);
 const total=homeScore+awayScore,margin=homeScore-awayScore,sdMargin=Math.max(1.2,model.params.scale*(1.25+.08*Math.sqrt(Math.max(1,total)))),sdTotal=Math.max(1.5,model.params.scale*(1.55+.05*Math.sqrt(Math.max(1,total))));
 let homeProbability,awayProbability,drawProbability=null;
 if(model.params.draws){
  let hp=0,ap=0,dp=0;for(let i=0;i<=8;i++)for(let j=0;j<=8;j++){const p=poissonPmf(i,homeScore)*poissonPmf(j,awayScore);if(i>j)hp+=p;else if(i<j)ap+=p;else dp+=p}const z=hp+ap+dp;homeProbability=clamp(hp/z);awayProbability=clamp(ap/z);drawProbability=clamp(dp/z);
 }else{homeProbability=clamp(1-normalCdf(0,margin,sdMargin));awayProbability=clamp(normalCdf(0,margin,sdMargin))}
 return {homeScore,awayScore,total,margin,sdMargin,sdTotal,homeProbability,awayProbability,drawProbability};
}
function eventPredictions(model,events){return (events||[]).map(e=>{const p=predictOne(model,e.home_team||e.home,e.away_team||e.away);return {event_id:e.event_id,source:model.params.draws?'EPL_V1':'NRL_V1',gamesUsed:model.gamesUsed,homeProbability:p.homeProbability,awayProbability:p.awayProbability,drawProbability:p.drawProbability,expectedHomeScore:p.homeScore,expectedAwayScore:p.awayScore,expectedMargin:p.margin,expectedTotal:p.total,marginSd:p.sdMargin,totalSd:p.sdTotal,features:['recency_weighted_team_strength','home_advantage','recent_scoring']}})}
function predict(model,events){return eventPredictions(model,events)}
export {build,predict,predictOne,eventPredictions,key};