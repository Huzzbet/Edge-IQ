/* Edge-IQ v4 market universe. Model readiness is deliberately explicit. */
(function(){
 const SPORTS=[
  {key:'AFL',name:'AFL',tier:'CORE',model:'AFL_ML_V3',markets:['h2h','spread','total','team_total'],enabled:true},
  {key:'NRL',name:'NRL',tier:'CORE',model:null,markets:['h2h','spread','total','team_total'],enabled:true},
  {key:'NBA',name:'NBA',tier:'CORE',model:'BASKETBALL_V2',markets:['h2h','spread','total','team_total','1h','1q'],enabled:true},
  {key:'NBL',name:'NBL',tier:'CORE',model:'BASKETBALL_V2',markets:['h2h','spread','total','team_total','1h','1q'],enabled:true},
  {key:'MLB',name:'MLB',tier:'CORE',model:'MLB_V1',markets:['h2h','runline','total','team_total','1st5'],enabled:true},
  {key:'TENNIS',name:'Tennis',tier:'CORE',model:null,markets:['h2h','spread','total'],enabled:true},
  {key:'EPL',name:'EPL',tier:'CORE',model:null,markets:['h2h','spread','total','btts','draw_no_bet'],enabled:true},
  {key:'CRICKET',name:'Cricket',tier:'NEXT',model:null,markets:['h2h','spread','total'],enabled:false},
  {key:'NHL',name:'NHL',tier:'NEXT',model:null,markets:['h2h','spread','total'],enabled:false},
  {key:'NFL',name:'NFL',tier:'NEXT',model:null,markets:['h2h','spread','total','team_total'],enabled:false}
 ];
 const byKey=key=>SPORTS.find(x=>x.key===String(key||'').toUpperCase())||null;
 const enabled=()=>SPORTS.filter(x=>x.enabled);
 window.EdgeIQMarketCatalog={SPORTS,byKey,enabled};
})();