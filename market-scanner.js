/* Edge-IQ market scanner. Pure local calculations: never calls the Odds API. */
(function(){
  const num=v=>{const n=Number(v);return Number.isFinite(n)?n:null};
  const key=v=>String(v??'').trim().toLowerCase();
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  function flatten(data){
    const rows=[];
    for(const e of (data?.events||[])){
      const base={eventId:e.event_id,event:`${e.home_team||''} v ${e.away_team||''}`,start:e.start_time,league:e.league||'',sport:e.sport||''};
      for(const [marketKey,m] of Object.entries(e.lines||{})){
        for(const b of (m?.books||[])){
          for(const side of ['home','away','draw','over','under']){
            const o=b?.[side]; if(!o) continue;
            const odds=num(o.odds??o.decimal_odds); if(!(odds>1)) continue;
            rows.push({...base,market:marketKey,marketType:m.market_type||'',period:m.period_str||'',line:o.line??o.points??o.total??m.line??null,selection:o.selection_name||o.name||side,side,book:key(b.bookmaker||b.name||'unknown'),odds});
          }
        }
      }
    }
    for(const e of (data?.events||[])){
      if(!Array.isArray(e.items)) continue;
      const base={eventId:e.event_id,event:`${e.home_team||''} v ${e.away_team||''}`,start:e.start_time,league:e.league||'',sport:e.sport||''};
      for(const x of e.items){
        const odds=num(x.odds??x.decimal_odds); if(!(odds>1)) continue;
        rows.push({...base,market:x.market_key||x.bet_type||'market',marketType:x.market_type||'',period:x.period_str||'',line:x.line??null,selection:x.selection_name||x.selection||x.side||'',side:x.side||'',book:key(x.bookmaker||x.bookmaker_name||'unknown'),odds});
      }
    }
    return rows;
  }
  function scan(data){
    const rows=flatten(data), bookGroups=new Map();
    for(const r of rows){
      const k=[r.eventId||r.event,r.market,r.period,r.line??''].map(key).join('|');
      const bk=k+'|'+r.book;
      if(!bookGroups.has(bk)) bookGroups.set(bk,[]);
      bookGroups.get(bk).push(r);
    }
    for(const g of bookGroups.values()){
      const inv=g.reduce((s,r)=>s+1/r.odds,0);
      g.forEach(r=>{r.rawProb=1/r.odds;r.noVigProb=inv>0?r.rawProb/inv:null;r.bookMargin=inv-1;});
    }
    const marketGroups=new Map();
    for(const r of rows){
      const k=[r.eventId||r.event,r.market,r.period,r.line??''].map(key).join('|');
      if(!marketGroups.has(k)) marketGroups.set(k,[]);
      marketGroups.get(k).push(r);
    }
    const opportunities=[];
    for(const g of marketGroups.values()){
      const selections=new Map();
      for(const r of g){
        if(!selections.has(key(r.selection))) selections.set(key(r.selection),[]);
        selections.get(key(r.selection)).push(r);
      }
      for(const prices of selections.values()){
        const consensus=prices.map(r=>r.noVigProb).filter(v=>v!=null);
        if(!consensus.length) continue;
        const consensusProb=consensus.reduce((a,b)=>a+b,0)/consensus.length;
        const best=prices.reduce((a,b)=>b.odds>a.odds?b:a);
        const ev=consensusProb*best.odds-1;
        const fair=1/consensusProb;
        const dispersion=consensus.length>1?Math.sqrt(consensus.reduce((s,p)=>s+Math.pow(p-consensusProb,2),0)/consensus.length):0;
        const confidence=Math.max(0,Math.min(100,50+Math.min(25,consensus.length*7.5)-Math.min(25,dispersion*400)));
        opportunities.push({...best,books:prices.length,consensusProb,ev,fair,dispersion,confidence,prices});
      }
    }
    opportunities.sort((a,b)=>b.ev-a.ev);
    return {rows,opportunities,positive:opportunities.filter(x=>x.ev>0)};
  }
  window.EdgeIQScanner={scan,flatten,esc};
})();
