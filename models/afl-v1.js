/* Edge-IQ AFL Model v1.0
   Independent pre-market probability model.
   IMPORTANT: this model never reads bookmaker odds. It uses a published 2026
   AFL ladder snapshot (wins/points + percentage), a home advantage and
   conservative score-distribution assumptions. It is a research model until
   CLV/ROI validation gates are met.
*/
(function(){
  const clamp=(x,a=.01,b=.99)=>Math.max(a,Math.min(b,x));
  const erf=x=>{const s=x<0?-1:1,a=Math.abs(x),t=1/(1+.3275911*a),y=1-((((1.061405429*t-1.453152027)*t+1.421413741)*t-.284496736)*t+.254829592)*t*Math.exp(-a*a);return s*y};
  const cdf=(x,mu,sd)=>.5*(1+erf((x-mu)/(sd*Math.sqrt(2))));
  const norm=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]/g,'');
  const TEAMS={
    fremantle:{pct:137.2,pts:76},sydney:{pct:136.1,pts:72},brisbane:{pct:121.7,pts:64},
    hawthorn:{pct:120.1,pts:64},geelong:{pct:122.3,pts:60},adelaide:{pct:117.3,pts:60},
    melbourne:{pct:109.6,pts:60},westerndogs:{pct:95.4,pts:54},collingwood:{pct:102.4,pts:52},
    carlton:{pct:101.5,pts:50},stkilda:{pct:102.8,pts:40},gws:{pct:98.9,pts:40},
    goldcoast:{pct:94.5,pts:36},northmelbourne:{pct:88.8,pts:36},portadelaide:{pct:88.1,pts:28},
    westcoast:{pct:69.2,pts:16},richmond:{pct:62.5,pts:12},essendon:{pct:64.6,pts:8}
  };
  const ALIASES={
    fremantledockers:'fremantle',fremantlefc:'fremantle',
    sydneyswans:'sydney',sydneyfc:'sydney',
    brisbanelions:'brisbane',brisbanefc:'brisbane',
    hawks:'hawthorn',hawthornhawks:'hawthorn',
    geelongcats:'geelong',geelongfc:'geelong',
    adelaidecrows:'adelaide',adelaidefc:'adelaide',
    melbournedemons:'melbourne',melbournefc:'melbourne',
    westerndogsbullies:'westerndogs',westernbulldogs:'westerndogs',wb:'westerndogs',
    collingwoodmagpies:'collingwood',collingwoodfc:'collingwood',
    carltonblues:'carlton',carltonfc:'carlton',
    stkildasaints:'stkilda',stkildafc:'stkilda',
    greaterwesterngiants:'gws',gwsgiants:'gws',gwsfc:'gws',
    goldcoastsuns:'goldcoast',goldcoastfc:'goldcoast',
    northmelbournekangaroos:'northmelbourne',northmelbournefc:'northmelbourne',
    portadelaidepower:'portadelaide',portadelaidefc:'portadelaide',
    westcoasteagles:'westcoast',westcoastfc:'westcoast',
    richmondtigers:'richmond',richmondfc:'richmond',
    essendonbombers:'essendon',essendonfc:'essendon'
  };
  function key(s){const n=norm(s);return ALIASES[n]||n}
  function team(s){return TEAMS[key(s)]||null}
  function rating(t){
    if(!t)return null;
    const winRate=t.pts/(23*4);
    return 42*Math.log(t.pct/100)+22*(winRate-.5);
  }
  function modelFor(e){
    const home=e.home||e.home_team, away=e.away||e.away_team;
    const ht=team(home),at=team(away);
    if(!ht||!at)return null;
    const hr=rating(ht),ar=rating(at);
    const homeAdv=3.5;
    const margin=hr-ar+homeAdv;
    const total=174+.28*(hr+ar);
    return {home,away,margin,total,marginSd:27.5,totalSd:18.0,
      source:'AFL_LADDER_2026_V1',version:'AFL-V1.0',
      asOf:'2026-09-07',independent:true};
  }
  function probability(o){
    if(String(o.sport||o.league||'').toUpperCase()!=='AFL')return null;
    const m=modelFor(o); if(!m)return null;
    const market=String(o.market||'').toLowerCase();
    const side=String(o.side||'').toLowerCase();
    const line=Number(o.line);
    if(/moneyline|match.?winner|winner|h2h|head.?to.?head|1x2/.test(market)){
      if(side==='home')return clamp(1-cdf(0,m.margin,m.marginSd));
      if(side==='away')return clamp(cdf(0,m.margin,m.marginSd));
      if(side==='draw')return clamp(cdf(.5,m.margin,m.marginSd)-cdf(-.5,m.margin,m.marginSd),.005,.08);
    }
    if(/spread|handicap|line/.test(market)&&!/total/.test(market)&&Number.isFinite(line)){
      const teamMean=side==='away'?-m.margin:m.margin;
      return clamp(1-cdf(-line,teamMean,m.marginSd));
    }
    if(/total|over.?under|ou/.test(market)&&Number.isFinite(line)){
      if(side==='over')return clamp(1-cdf(line,m.total,m.totalSd));
      if(side==='under')return clamp(cdf(line,m.total,m.totalSd));
    }
    return null;
  }
  function predict(o){
    const p=probability(o); if(p==null)return null;
    const m=modelFor(o);
    return {prob:p,fair:1/p,expectedMargin:m.margin,expectedTotal:m.total,
      modelVersion:m.version,modelSource:m.source,modelIndependent:true,
      modelConfidence:Math.round(clamp(.58+(Math.min(1,Math.abs(m.margin)/35)*.12),.55,.72)*100)};
  }
  window.EdgeIQAFLModel={predict,probability,modelFor,team,version:'AFL-V1.0',asOf:'2026-09-07'};
})();