/* Edge-IQ market scanner v2. Pure local calculations. */
(function(){
  const num=v=>{const n=Number(v);return Number.isFinite(n)?n:null};
  const key=v=>String(v??'').trim().toLowerCase();
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const isWinMarket=m=>/moneyline|match.?winner|winner|h2h|1x2|head.?to.?head/i.test(String(m||''));
  function modelProbFor(e,side,market){
    if(!isWinMarket(market))return null;
    const p=e?.model_probabilities;if(!p)return null;
    if(side==='home')return num(p.home);if(side==='away')return num(p.away);return null;
  }
  function flatten(data){
    const rows=[];
    const baseFor=e=>({eventId:e.event_id,event:`${e.home_team||''} v ${e.away_team||''}`,start:e.start_time,league:e.league||'',sport:e.sport||'',home:e.home_team||e.home,away:e.away_team||e.away,modelSource:e.model_source||null,modelGamesUsed:e.model_games_used||null,modelDisagreement:e.model_disagreement??null,modelV1Probabilities:e.model_v1_probabilities||null});
    for(const e of (data?.events||[])){
      const base=baseFor(e);
      for(const [marketKey,m] of Object.entries(e.lines||{})){
        for(const b of (m?.books||[]))for(const side of ['home','away','draw','over','under']){
          const o=b?.[side];if(!o)continue;const odds=num(o.odds??o.decimal_odds);if(!(odds>1))continue;
          rows.push({...base,market:marketKey,marketType:m.market_type||'',period:m.period_str||'',line:o.line??o.points??o.total??m.line??null,selection:o.selection_name||o.name||side,side,book:key(b.bookmaker||b.name||'unknown'),odds,modelProb:modelProbFor(e,side,marketKey)});
        }
      }
    }
    for(const e of (data?.events||[])){
      if(!Array.isArray(e.items))continue;const base=baseFor(e);
      for(const x of e.items){const odds=num(x.odds??x.decimal_odds);if(!(odds>1))continue;const market=x.market_key||x.bet_type||'market';rows.push({...base,market,marketType:x.market_type||'',period:x.period_str||'',line:x.line??null,selection:x.selection_name||x.selection||x.side||'',side:x.side||'',book:key(x.bookmaker||x.bookmaker_name||'unknown'),odds,modelProb:modelProbFor(e,x.side||'',market)});}
    }
    return rows;
  }
  function addBookMetrics(rows){const bookGroups=new Map();for(const r of rows){const k=[r.eventId||r.event,r.market,r.period,r.line??''].map(key).join('|');const bk=k+'|'+r.book;if(!bookGroups.has(bk))bookGroups.set(bk,[]);bookGroups.get(bk).push(r)}for(const g of bookGroups.values()){const inv=g.reduce((s,r)=>s+1/r.odds,0);g.forEach(r=>{r.rawProb=1/r.odds;r.noVigProb=inv>0?r.rawProb/inv:null;r.bookMargin=inv-1})}}
  function median(values){const a=values.filter(v=>v!=null).sort((x,y)=>x-y);if(!a.length)return null;const m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2}
  function scan(data){const rows=flatten(data);addBookMetrics(rows);const marketGroups=new Map();for(const r of rows){const k=[r.eventId||r.event,r.market,r.period,r.line??''].map(key).join('|');if(!marketGroups.has(k))marketGroups.set(k,[]);marketGroups.get(k).push(r)}const opportunities=[];for(const g of marketGroups.values()){const selections=new Map();for(const r of g){if(!selections.has(key(r.selection)))selections.set(key(r.selection),[]);selections.get(key(r.selection)).push(r)}for(const prices of selections.values()){const valid=prices.filter(r=>r.noVigProb!=null);if(!valid.length)continue;const probs=valid.map(r=>r.noVigProb),consensusProb=median(probs),meanProb=probs.reduce((a,b)=>a+b,0)/probs.length,dispersion=Math.sqrt(probs.reduce((s,p)=>s+Math.pow(p-meanProb,2),0)/probs.length),best=prices.reduce((a,b)=>b.odds>a.odds?b:a),consensusEv=consensusProb*best.odds-1,fair=1/consensusProb,bestVsMedian=(best.odds/fair)-1,books=prices.length,coverage=Math.min(1,books/5),agreement=Math.max(0,1-dispersion*500),edgeQuality=Math.max(0,Math.min(1,.55*coverage+.45*agreement)),confidence=Math.round(100*edgeQuality),modelProb=best.modelProb,modelEv=modelProb!=null?modelProb*best.odds-1:null;opportunities.push({...best,books,consensusProb,meanProb,consensusEv,ev:consensusEv,modelEv,modelFair:modelProb!=null?1/modelProb:null,fair,dispersion,confidence,edgeQuality,bestVsMedian,modelSource:modelProb!=null?(best.modelSource||'AFL_MODEL'):'BASELINE',signal:'VERIFY',modelDisagreement:best.modelDisagreement,modelV1Probabilities:best.modelV1Probabilities,prices})}}opportunities.sort((a,b)=>(b.modelEv??-Infinity)-(a.modelEv??-Infinity)||b.confidence-a.confidence||b.books-a.books);return {rows,opportunities,positive:opportunities.filter(x=>x.modelEv>0),modelMeta:data?.model_meta||null}}
  window.EdgeIQScanner={scan,flatten,esc,median};
})();
