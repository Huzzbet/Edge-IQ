/* Edge-IQ Basketball Validation V1. Walk-forward validation for NBA/NBL moneyline/spread/total models. */
const clamp=(x,a=.001,b=.999)=>Math.max(a,Math.min(b,x));
const winner=g=>{const h=Number(g.home_score??g.home_points??g.homeScore),a=Number(g.away_score??g.away_points??g.awayScore);if(!Number.isFinite(h)||!Number.isFinite(a)||h===a)return null;return h>a?1:0};
const logLoss=rows=>rows.length?rows.reduce((s,r)=>{const p=clamp(r.p);return s-(r.y*Math.log(p)+(1-r.y)*Math.log(1-p))},0)/rows.length:null;
const brier=rows=>rows.length?rows.reduce((s,r)=>s+(r.p-r.y)**2,0)/rows.length:null;
const accuracy=rows=>rows.length?rows.filter(r=>(r.p>=.5?1:0)===r.y).length/rows.length:null;
function calibration(rows,bins=10){return Array.from({length:bins},(_,i)=>{const lo=i/bins,hi=(i+1)/bins,a=rows.filter(r=>r.p>=lo&&(i===bins-1?r.p<=hi:r.p<hi));return {bin:i+1,samples:a.length,predicted:a.length?a.reduce((s,r)=>s+r.p,0)/a.length:null,actual:a.length?a.reduce((s,r)=>s+r.y,0)/a.length:null}})}
function summary(rows){return{samples:rows.length,accuracy:accuracy(rows),brier:brier(rows),logLoss:logLoss(rows),calibration:calibration(rows)}}
function betRoi(bets){if(!bets.length)return{bets:0,roi:null,profit:0};const profit=bets.reduce((s,b)=>s+(b.y?(b.odds-1):-1),0);return{bets:bets.length,wins:bets.filter(b=>b.y).length,profit,roi:profit/bets.length}}
function walkForward(games,build,predictOne,{minTrain=200}={}){const sorted=[...games].filter(g=>winner(g)!=null).sort((a,b)=>new Date(a.date||a.start_time||0)-new Date(b.date||b.start_time||0));const rows=[];for(let i=minTrain;i<sorted.length;i++){const g=sorted[i],y=winner(g),m=build(sorted.slice(0,i)),p=clamp(predictOne(m,g.home_team||g.home,g.away_team||g.away).winHome);rows.push({date:g.date||g.start_time,p,y,trainGames:i})}return rows}
export{summary,calibration,betRoi,walkForward};
