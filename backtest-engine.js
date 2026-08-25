/* Edge-IQ AFL backtest engine v1.
   Walk-forward, leakage-safe evaluation of AFL_ELO_V1.
   Uses only games available before each prediction date.
*/
import { buildRatings, probability, normaliseTeam } from './afl-model.js';

const num=v=>{const n=Number(v);return Number.isFinite(n)?n:null};
const winner=g=>{const h=num(g.home_score??g.hscore??g.home_points),a=num(g.away_score??g.ascore??g.away_points);if(h==null||a==null||h===a)return null;return h>a?'home':'away'};

function brier(rows){return rows.length?rows.reduce((s,r)=>s+Math.pow(r.p-(r.y),2),0)/rows.length:null}
function logLoss(rows){return rows.length?rows.reduce((s,r)=>{const p=Math.max(.0001,Math.min(.9999,r.p));return s-(r.y*Math.log(p)+(1-r.y)*Math.log(1-p))},0)/rows.length:null}
function calibration(rows,bins=10){return Array.from({length:bins},(_,i)=>{const lo=i/bins,hi=(i+1)/bins,g=rows.filter(r=>r.p>=lo&&r.p<(i===bins-1?1:hi));return {bin:`${Math.round(lo*100)}-${Math.round(hi*100)}%`,count:g.length,predicted:g.length?g.reduce((s,r)=>s+r.p,0)/g.length:null,actual:g.length?g.reduce((s,r)=>s+r.y,0)/g.length:null}}).filter(x=>x.count)}

export function runBacktest(games,opts={}){
 const sorted=[...games].filter(g=>winner(g)).sort((a,b)=>new Date(a.start_time||a.date||0)-new Date(b.start_time||b.date||0));
 const minGames=opts.minGames??30,rows=[],bets=[];
 for(let i=minGames;i<sorted.length;i++){
  const train=sorted.slice(0,i),g=sorted[i],h=normaliseTeam(g.home_team||g.home),a=normaliseTeam(g.away_team||g.away);if(!h||!a)continue;
  const model=buildRatings(train,opts.modelParams||{}),p=probability(model,h,a),y=winner(g)==='home'?1:0;
  rows.push({date:g.start_time||g.date,event:g.event_id||`${h} v ${a}`,p,y});
  const odds=num(g.home_odds??g.home_price??g.home_decimal_odds);
  if(odds>1){const ev=p*odds-1;if(ev>=0.03)bets.push({date:g.start_time||g.date,event:g.event_id||`${h} v ${a}`,selection:h,odds,p,ev,y,profit:y?(odds-1):-1})}
 }
 const stake=bets.length?bets.length:0,profit=bets.reduce((s,b)=>s+b.profit,0),wins=bets.filter(b=>b.y).length;
 return {model:'AFL_ELO_V1',predictions:rows,bets,metrics:{samples:rows.length,brier:brier(rows),logLoss:logLoss(rows),accuracy:rows.length?rows.filter(r=>(r.p>=.5?1:0)===r.y).length/rows.length:null,calibration:calibration(rows),betCount:bets.length,wins,hitRate:stake?wins/stake:null,profit,roi:stake?profit/stake:null},period:{from:rows[0]?.date??null,to:rows.at(-1)?.date??null}};
}
