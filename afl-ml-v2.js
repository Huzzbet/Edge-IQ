/* Edge-IQ AFL model v3. Transparent deterministic ensemble until a trained artifact is available. */
const clamp=(x,a=.02,b=.98)=>Math.max(a,Math.min(b,x));
const key=v=>String(v??'').trim().toLowerCase().replace(/[^a-z0-9]+/g,' ');
const num=v=>{const n=Number(v);return Number.isFinite(n)?n:null};
const team=v=>key(v).replace(/\b(fc|football club|afl)\b/g,'').replace(/\s+/g,' ').trim();
function result(g){const h=num(g.home_score??g.hscore??g.home_points),a=num(g.away_score??g.ascore??g.away_points);if(h==null||a==null||h===a)return null;return {y:h>a?1:0,margin:h-a,absMargin:Math.abs(h-a)}}
function build(games,{initial=1500,k=20,homeAdv=38,formGames=10,decay=.985}={}){
 const ratings=new Map(),stats=new Map();const getR=t=>ratings.get(t)??initial;const getS=t=>stats.get(t)??{games:0,margin:[],wins:[]};
 const sorted=[...games].filter(result).sort((a,b)=>new Date(a.start_time||a.date||0)-new Date(b.start_time||b.date||0));
 for(const g of sorted){const h=team(g.home_team||g.home),a=team(g.away_team||g.away),r=result(g);if(!h||!a||!r)continue;const hr=getR(h),ar=getR(a);const p=1/(1+10**(-((hr+homeAdv-ar)/400)));const mult=Math.min(1.65,Math.max(.75,Math.log1p(r.absMargin)/2));const d=k*mult*(r.y-p);ratings.set(h,hr+d);ratings.set(a,ar-d);
   for(const [t,win,margin] of [[h,r.y,r.margin],[a,1-r.y,-r.margin]]){const s=getS(t);s.games++;s.margin.push(margin);s.wins.push(win);if(s.margin.length>formGames){s.margin.shift();s.wins.shift()}stats.set(t,s)}
 }
 return {ratings,stats,params:{initial,k,homeAdv,formGames,decay},gamesUsed:sorted.length};
}
function weightedAvg(a,decay=.985){if(!a?.length)return 0;let n=0,d=0;for(let i=0;i<a.length;i++){const w=Math.pow(decay,a.length-1-i);n+=a[i]*w;d+=w}return d?n/d:0}
function predictOne(model,home,away){const h=team(home),a=team(away),hr=model.ratings.get(h)??model.params.initial,ar=model.ratings.get(a)??model.params.initial;const elo=1/(1+10**(-((hr+model.params.homeAdv-ar)/400)));const hs=model.stats.get(h),as=model.stats.get(a);const form=clamp(.5+(weightedAvg(hs?.wins,model.params.decay)-weightedAvg(as?.wins,model.params.decay))*.34,.15,.85);const margin=clamp(.5+(weightedAvg(hs?.margin,model.params.decay)-weightedAvg(as?.margin,model.params.decay))/105,.15,.85);const logit=x=>Math.log(x/(1-x));const z=.60*logit(elo)+.24*logit(form)+.16*logit(margin);return clamp(1/(1+Math.exp(-z)))}
function predict(model,events){return (events||[]).map(e=>{const p=predictOne(model,e.home_team||e.home,e.away_team||e.away);return {event_id:e.event_id,event:`${e.home_team||e.home} v ${e.away_team||e.away}`,homeProbability:p,awayProbability:1-p,source:'AFL_ML_V3',gamesUsed:model.gamesUsed,features:['elo','recency_weighted_form','recency_weighted_margin']}})}
export {build,predict,predictOne,team};
