/* Edge-IQ validation engine v2. Walk-forward metrics with calibration and signal discipline. */
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const winner=g=>{const h=Number(g.home_score??g.hscore??g.home_points),a=Number(g.away_score??g.ascore??g.away_points);if(!Number.isFinite(h)||!Number.isFinite(a)||h===a)return null;return h>a?1:0};
const logLoss=rows=>rows.length?rows.reduce((s,r)=>{const p=clamp(r.p,.0001,.9999);return s-(r.y*Math.log(p)+(1-r.y)*Math.log(1-p))},0)/rows.length:null;
const brier=rows=>rows.length?rows.reduce((s,r)=>s+(r.p-r.y)**2,0)/rows.length:null;
const accuracy=rows=>rows.length?rows.filter(r=>(r.p>=.5?1:0)===r.y).length/rows.length:null;
function calibration(rows,bins=10){const out=[];for(let i=0;i<bins;i++){const lo=i/bins,hi=(i+1)/bins,a=rows.filter(r=>r.p>=lo&&(i===bins-1?r.p<=hi:r.p<hi));out.push({bin:i+1,lower:lo,upper:hi,samples:a.length,predicted:a.length?a.reduce((s,r)=>s+r.p,0)/a.length:null,actual:a.length?a.reduce((s,r)=>s+r.y,0)/a.length:null});}return out}
function summary(rows){return {samples:rows.length,accuracy:accuracy(rows),brier:brier(rows),logLoss:logLoss(rows),meanProbability:rows.length?rows.reduce((s,r)=>s+r.p,0)/rows.length:null,actualRate:rows.length?rows.reduce((s,r)=>s+r.y,0)/rows.length:null,calibration:calibration(rows)}}
function compare({v1=[],v2=[],market=[]}={}){return {v1:summary(v1),v2:summary(v2),market:summary(market),delta:{brier:brier(v2)-brier(v1),logLoss:logLoss(v2)-logLoss(v1),accuracy:accuracy(v2)-accuracy(v1)}}}
function walkForward(games,build,predictOne,{minTrain=100,step=1}={}){const sorted=[...games].sort((a,b)=>new Date(a.start_time||a.date||0)-new Date(b.start_time||b.date||0));const rows=[];for(let i=minTrain;i<sorted.length;i+=step){const g=sorted[i],y=winner(g);if(y==null)continue;const train=sorted.slice(0,i),model=build(train),p=clamp(predictOne(model,g.home_team||g.home,g.away_team||g.away));rows.push({date:g.start_time||g.date,eventId:g.id??g.game_id??i,p,y,trainGames:train.length});}return rows}
function signalPerformance(bets){const n=bets.length,w=bets.filter(x=>x.y).length,profit=bets.reduce((s,x)=>s+(x.y?(x.odds-1):-1),0);return {bets:n,wins:w,hitRate:n?w/n:null,profit,roi:n?profit/n:null}}
export {summary,compare,calibration,walkForward,signalPerformance,winner};
