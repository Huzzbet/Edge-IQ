/* Edge-IQ Edge Map v1
   Converts realised prediction history into a sport x market x model
   performance matrix. Research/paper-trading only. */
(function(){
  const esc=x=>String(x??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const pct=x=>Number.isFinite(Number(x))?(Number(x)*100).toFixed(1)+'%':'—';
  const priority=p=>{
    if(p.samples>=100&&p.avgCLV>.01&&p.roi>.02)return ['HIGH','🔥'];
    if(p.samples>=50&&p.avgCLV>0&&p.roi>=0)return ['MEDIUM','🟢'];
    if(p.samples>=20)return ['WATCH','🟡'];
    return ['BUILD','⚪'];
  };
  function render(){
    const root=document.getElementById('edgeMatrix'); if(!root||!window.EdgeIQAdaptiveModel)return;
    const rows=window.EdgeIQAdaptiveModel.profile();
    if(!rows.length){root.innerHTML='<div class="empty">No closed prediction history yet. Run the scanner and close predictions to build the Edge Map.</div>';return;}
    const ranked=rows.map(p=>({...p,priority:priority(p)})).sort((a,b)=>{
      const rank={HIGH:4,MEDIUM:3,WATCH:2,BUILD:1};
      return (rank[b.priority[0]]-rank[a.priority[0]])||(b.reliability-a.reliability);
    });
    const sports=[...new Set(ranked.map(p=>p.key.split('::')[0]))];
    const markets=[...new Set(ranked.map(p=>p.key.split('::')[1]))];
    const top=ranked.slice(0,8);
    root.innerHTML=
      '<div class="edge-matrix-summary">'+
      '<div><small>PROFILES</small><strong>'+ranked.length+'</strong></div>'+
      '<div><small>HIGH PRIORITY</small><strong>'+ranked.filter(x=>x.priority[0]==='HIGH').length+'</strong></div>'+
      '<div><small>POSITIVE CLV</small><strong>'+ranked.filter(x=>x.avgCLV>0).length+'</strong></div>'+
      '<div><small>SPORTS</small><strong>'+sports.length+'</strong></div>'+
      '</div>'+
      '<div class="edge-matrix-table"><table><thead><tr><th>Priority</th><th>Sport</th><th>Market</th><th>Model</th><th>Samples</th><th>Hit</th><th>CLV</th><th>ROI</th><th>Reliability</th></tr></thead><tbody>'+
      top.map(p=>{
        const [sport,market,model]=p.key.split('::');
        return '<tr><td><b>'+p.priority[1]+' '+p.priority[0]+'</b></td><td>'+esc(sport)+'</td><td>'+esc(market)+'</td><td>'+esc(model)+'</td><td>'+p.samples+'</td><td>'+pct(p.hitRate)+'</td><td class="'+(p.avgCLV>=0?'good':'bad')+'">'+pct(p.avgCLV)+'</td><td class="'+(p.roi>=0?'good':'bad')+'">'+pct(p.roi)+'</td><td>'+Math.round(p.reliability*100)+'%</td></tr>';
      }).join('')+
      '</tbody></table></div>'+
      '<div class="tiny">Priority is evidence-weighted. High priority requires 100+ samples, positive CLV above 1% and positive ROI above 2%. This layer ranks where to investigate; it does not create model probabilities.</div>';
  }
  window.EdgeIQEdgeMap={render};
  document.addEventListener('DOMContentLoaded',render);
  window.addEventListener('edgeiq:predictions-updated',render);
})();