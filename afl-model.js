/* Edge-IQ AFL predictive model v1.
   Transparent statistical baseline: Elo + home advantage + recent-form blend.
   This is deliberately NOT labelled AI. It is the first independently-derived
   probability layer and is designed to be backtested before it is trusted.
*/
const clamp=(x,a=.02,b=.98)=>Math.max(a,Math.min(b,x));
const key=v=>String(v??'').trim().toLowerCase().replace(/[^a-z0-9]+/g,' ');
const num=v=>{const n=Number(v);return Number.isFinite(n)?n:null};

function normaliseTeam(v){return key(v).replace(/\b(fc|football club|afl)\b/g,'').replace(/\s+/g,' ').trim()}
function winner(g){
  const hs=num(g.home_score??g.hscore??g.home_points), as=num(g.away_score??g.ascore??g.away_points);
  if(hs==null||as==null||hs===as)return null;
  return hs>as?'home':'away';
}
function buildRatings(games,{initial=1500,k=22,homeAdv=35,formGames=8}={}){
  const ratings=new Map(), form=new Map();
  const get=t=>ratings.has(t)?ratings.get(t):initial;
  const recent=t=>form.get(t)||[];
  const sorted=[...games].filter(g=>winner(g)).sort((a,b)=>new Date(a.start_time||a.date||0)-new Date(b.start_time||b.date||0));
  for(const g of sorted){
    const h=normaliseTeam(g.home_team||g.home||g.hteam), a=normaliseTeam(g.away_team||g.away||g.ateam); if(!h||!a)continue;
    const wh=get(h), wa=get(a), p=1/(1+Math.pow(10,-((wh+homeAdv)-wa)/400)), y=winner(g)==='home'?1:0;
    const margin=Math.abs(num(g.home_score??g.hscore??g.home_points)-num(g.away_score??g.ascore??g.away_points));
    const marginMult=Math.min(1.8,Math.max(.8,Math.log1p(margin)/2));
    const delta=k*marginMult*(y-p); ratings.set(h,wh+delta); ratings.set(a,wa-delta);
    for(const [t,r] of [[h,y],[a,1-y]]){const arr=recent(t);arr.push(r);while(arr.length>formGames)arr.shift();form.set(t,arr)}
  }
  return {ratings,form,params:{initial,k,homeAdv,formGames},gamesUsed:sorted.length};
}
function probability(model,home,away){
  const h=normaliseTeam(home),a=normaliseTeam(away),hr=model.ratings.get(h)??model.params.initial,ar=model.ratings.get(a)??model.params.initial;
  const base=1/(1+Math.pow(10,-((hr+model.params.homeAdv)-ar)/400));
  const hf=model.form.get(h)||[],af=model.form.get(a)||[];
  const hform=hf.length?hf.reduce((x,y)=>x+y,0)/hf.length:.5, aform=af.length?af.reduce((x,y)=>x+y,0)/af.length:.5;
  const formAdj=Math.max(-.06,Math.min(.06,(hform-aform)*.12));
  return clamp(base+formAdj);
}
function predict(model,events){
  return (events||[]).map(e=>{const home=e.home_team||e.home,away=e.away_team||e.away;const p=probability(model,home,away);return {event_id:e.event_id,event:`${home} v ${away}`,home,away,homeProbability:p,awayProbability:1-p,source:'AFL_ELO_V1',gamesUsed:model.gamesUsed}});
}
export {buildRatings,predict,probability,normaliseTeam};
