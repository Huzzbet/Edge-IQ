/* Edge-IQ AFL ML-style ensemble v2.
   Transparent, deterministic model for the Worker/browser until a trained
   artifact is available. Combines Elo, recent form, scoring margin and
   recency into a calibrated logistic ensemble. It is explicitly not labelled
   as a trained neural network. Designed to be backtested against V1.
*/
const clamp=(x,a=.02,b=.98)=>Math.max(a,Math.min(b,x));
const key=v=>String(v??'').trim().toLowerCase().replace(/[^a-z0-9]+/g,' ');
const num=v=>{const n=Number(v);return Number.isFinite(n)?n:null};
const team=v=>key(v).replace(/\b(fc|football club|afl)\b/g,'').replace(/\s+/g,' ').trim();
function result(g){const h=num(g.home_score??g.hscore??g.home_points),a=num(g.away_score??g.ascore??g.away_points);if(h==null||a==null||h===a)return null;return {h,a,y:h>a?1:0,margin:h-a}};
function build(games,{initial=1500,k=22,homeAdv=35,formGames=8,decay=.94}={}){
 const ratings=new Map(),stats=new Map();const getR=t=>ratings.get(t)??initial;const getS=t=>stats.get(t)??{games:0,margin:[],wins:[]};
 const sorted=[...games].filter(result).sort((a,b)=>new Date(a.start_time||a.date||0)-new Date(b.start_time||b.date||0));
 for(const g of sorted){const h=team(g.home_team||g.home),a=team(g.away_team||g.away),r=result(g);if(!h||!a||!r)continue;const hr=getR(h),ar=getR(a);const p=1/(1+10**(-((hr+homeAdv-ar)/400)));const mult=Math.min(1.8,Math.max(.8,Math.log1p(Math.abs(r.margin))/2));const d=k*mult*(r.y-p);ratings.set(h,hr+d);ratings.set(a,ar-d);for(const [t,win,margin] of [[h,r.y,r.margin],[a,1-r.y,-r.margin]]){const s=getS(t);s.games++;s.margin.push(margin);s.wins.push(win);if(s.margin.length>formGames){s.margin.shift();s.wins.shift()}stats.set(t,s)}}
 return {ratings,stats,params:{initial,k,homeAdv,formGames,decay},gamesUsed:sorted.length};
}
function avg(a){return a?.length?a.reduce((x,y)=>x+y,0)/a.length:0}
function predictOne(model,home,away){const h=team(home),a=team(away),hr=model.ratings.get(h)??model.params.initial,ar=model.ratings.get(a)??model.params.initial;const elo=1/(1+10**(-((hr+model.params.homeAdv-ar)/400));const hs=model.stats.get(h),as=model.stats.get(a);const form=clamp(.5+(avg(hs?.wins)-avg(as?.wins))*.30,.15,.85);const margin=clamp(.5+(avg(hs?.margin)-avg(as?.margin))/90,.15,.85);const logit=x=>Math.log(x/(1-x));const z=.62*logit(elo)+.23*logit(form)+.15*logit(margin);return clamp(1/(1+Math.exp(-z)));}
function predict(model,events){return (events||[]).map(e=>{const p=predictOne(model,e.home_team||e.home,e.away_team||e.away);return {event_id:e.event_id,event:`${e.home_team||e.home} v ${e.away_team||e.away}`,homeProbability:p,awayProbability:1-p,source:'AFL_ML_V2',gamesUsed:model.gamesUsed,features:['elo','recent_form','scoring_margin']}})}
export {build,predict,predictOne,team};
