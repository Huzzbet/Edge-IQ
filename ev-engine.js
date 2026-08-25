/* Edge-IQ EV + Kelly engine. Uses cached odds only; never calls the Odds API. */
(function(){
  const BANKROLL_KEY='edgeIqBankroll';
  const FRACTION_KEY='edgeIqKellyFraction';
  const $=id=>document.getElementById(id);
  const n=v=>{const x=Number(v);return Number.isFinite(x)?x:null};
  function calculate(prob,odds,fraction){
    if(prob==null||odds==null||prob<=0||prob>=1||odds<=1)return null;
    const b=odds-1; const ev=prob*odds-1; const full=Math.max(0,ev/b);
    return {ev,fullKelly:full,kelly:full*fraction};
  }
  function renderRow(input){
    const tr=input.closest('tr'); if(!tr)return;
    const odds=n(input.dataset.odds), prob=n(input.value)/100;
    const fraction=n($('kellyFraction')?.value)||0.5;
    const bankroll=n($('bankroll')?.value)||0;
    const r=calculate(prob,odds,fraction);
    const ev=tr.querySelector('.evCell'), k=tr.querySelector('.kellyCell'), s=tr.querySelector('.stakeCell'), fair=tr.querySelector('.fairCell');
    if(!r){ev.textContent='—';k.textContent='—';s.textContent='—';fair.textContent='—';ev.className='evCell';return;}
    ev.textContent=(r.ev*100).toFixed(1)+'%'; ev.className='evCell '+(r.ev>0?'positive':'negative');
    k.textContent=(r.kelly*100).toFixed(1)+'%';
    s.textContent=bankroll>0?'$'+Math.round(bankroll*r.kelly).toLocaleString():'—';
    fair.textContent=(1/prob).toFixed(2);
  }
  function bind(){
    document.querySelectorAll('.modelProb').forEach(x=>x.addEventListener('input',()=>renderRow(x)));
    $('bankroll')?.addEventListener('input',()=>document.querySelectorAll('.modelProb').forEach(renderRow));
    $('kellyFraction')?.addEventListener('change',()=>document.querySelectorAll('.modelProb').forEach(renderRow));
  }
  window.EdgeIQ={calculate,renderRow,bind};
  window.addEventListener('DOMContentLoaded',bind);
})();
