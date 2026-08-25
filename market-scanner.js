/* Edge-IQ market scanner. Pure local calculations: never calls the Odds API. */
(function(){
  const num=v=>{const n=Number(v);return Number.isFinite(n)?n:null};
  const key=v=>String(v??'').trim().toLowerCase();
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  function modelProbFor(e,side){
    const p=e?.model_probabilities;
    if(!p)return null;
    if(side==='home'||side==='over')return num(p.home);
    if(side==='away'||side==='under')return num(p.away);
    return null;
  }
  function flatten(data){
    const rows=[];
    for(const e of (data?.events||[])){
      const base={eventId:e.event_id,event:`${e.home_team||''} v ${e.away_team||''}`,start:e.start_time,league:e.league||'',sport:e.sport||'',modelSource:e.model_source||null,modelGamesUsed:e.model_games_used||null};
      for(const [marketKey,m] of Object.entries(e.lines||{})){
        for(const b of (m?.books||[])){
          for(const side of ['home','away','draw','over','under']){
            const o=b?.[side]; if(!o) continue;
            const odds=num(o.odds??o.decimal_odds); if(!(odds>1)) continue;
            rows.push({...base,market:marketKey,marketType:m.market_type||'',period:m.period_str||'',line:o.line??o.points??o.total??m.line??null,selection:o.selection_name||o.name||side,side,book:key(b.bookmaker||b.name||'unknown'),odds,modelProb:modelProbFor(e,side)});
          }
        }
      }
    }
    for(const e of (data?.events||[])){
      if(!Array.isArray(e.items)) continue;
      const base={eventId:e.event_id,event:`${e.home_team||''} v ${e.away_team||''}`,start:e.start_time,league:e.league||'',sport:e.sport||'',modelSource:e.model_source||null,modelGamesUsed:e.model_games_used||null};
      for(const x of e.items){
        const odds=num(x.odds??x.decimal_odds); if(!(odds>1)) continue;
        rows.push({...base,market:x.market_key||x.bet_type||'market',marketType:x.market_type||'',period:x.period_str||'',line:x.line??null,selection:x.selection_name||x.selection||x.side||'',side:x.side||'',book:key(x.bookmaker||x.bookmaker_name||'unknown'),odds,modelProb:modelProbFor(e,x.side||'')});
      }
    }
    return rows;
  }
  function addBookMetrics(rows){
    const bookGroups=new Map();
    for(const r of rows){const k=[r.eventId||r.event,r.market,r.period,r.line??''].map(key).join('|');const bk=k+'|'+r.book;if(!bookGroups.has(bk))bookGroups.set(bk,[]);bookGroups.get(bk).push(r)}
    for(const g of bookGroups.values()){const inv=g.reduce((s,r)=>s+1/r.odds,0);g.forEach(r=>{r.rawProb=1/r.odds;r.noVigProb=inv>0?r.rawProb/inv:null;r.bookMargin=inv-1})}
  }
  function median(values){const a=values.filter(v=>v!=null).sort((x,y)=>x-y);if(!a.length)return null;const m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2}
  function scan(data){
    const rows=flatten(data);addBookMetrics(rows);const marketGroups=new Map();
    for(const r of rows){const k=[r.eventId||r.event,r.market,r.period,r.line??''].map(key).join('|');if(!marketGroups.has(k))marketGroups.set(k,[]);marketGroups.get(k).push(r)}
    const opportunities=[];
    for(const g of marketGroups.values()){
      const selections=new Map();for(const r of g){if(!selections.has(key(r.selection)))selections.set(key(r.selection),[]);selections.get(key(r.selection)).push(r)}
      for(const prices of selections.values()){
        const valid=prices.filter(r=>r.noVigProb!=null);if(!valid.length)continue;const probs=valid.map(r=>r.noVigProb),consensusProb=median(probs),meanProb=probs.reduce((a,b)=>a+b,0)/probs.length;
        const dispersion=Math.sqrt(probs.reduce((s,p)=>s+Math.pow(p-meanProb,2),0)/probs.length),best=prices.reduce((a,b)=>b.odds>a.odds?b:a),ev=consensusProb*best.odds-1,fair=1/consensusProb,bestVsMedian=(best.odds/fair)-1,books=prices.length;
        const coverage=Math.min(1,books/5),agreement=Math.max(0,1-dispersion*500),edgeQuality=Math.max(0,Math.min(1,.55*coverage+.45*agreement)),confidence=Math.round(100*edgeQuality);
        opportunities.push({...best,books,consensusProb,meanProb,ev,fair,dispersion,confidence,edgeQuality,bestVsMedian,signal:ev>=.10?'ELITE':ev>=.05?'STRONG':ev>=.03?'WATCH':ev>0?'MARGINAL':'PASS',prices});
      }
    }
    opportunities.sort((a,b)=>b.ev-a.ev||b.confidence-a.confidence||b.books-a.books);return {rows,opportunities,positive:opportunities.filter(x=>x.ev>0),modelMeta:data?.model_meta||null};
  }
  window.EdgeIQScanner={scan,flatten,esc,median};
})();
