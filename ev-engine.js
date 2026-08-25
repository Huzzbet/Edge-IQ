/* Edge-IQ EV engine
 * Runs entirely in the browser against the cached odds snapshot.
 * No API request is made by this file.
 */
(function(){
  const BANKROLL_KEY='edgeIqBankroll';
  const FRACTION_KEY='edgeIqKellyFraction';
  const bankEl=()=>document.getElementById('bankroll');
  const fracEl=()=>document.getElementById('kellyFraction');
  const num=v=>{const n=Number(v);return Number.isFinite(n)?n:null};
  const esc=v=>String(v??'').replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[m]));
  function ev(prob,odds){
    if(prob==null||odds==null||prob<=0||prob>=1||odds<=1)return null;
    return prob*odds-1;
  }
  function kelly(prob,odds,fraction){
    if(prob==null||odds==null||prob<=0||prob>=1||odds<=1)return null;
    const b=odds-1; const raw=(prob*odds-1)/b;
    return Math.max(0,raw*(fraction||1));
  }
  function addControls(){
    const setup=document.querySelector('.setup'); if(!setup||document.getElementById('evControls'))return;
    const box=document.createElement('div');box.id='evControls';box.className='setup';
    box.innerHTML='<summary style="list-style:none;cursor:default;font-weight:800">EV & Kelly settings</summary><div class="setupGrid" style="grid-template-columns:1fr 1fr; margin-top:12px"><div><label style="display:block;color:var(--muted);font-size:11px;text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px">Bankroll ($)</label><input id="bankroll" type="number" min="0" step="1" value="5000"></div><div><label style="display:block;color:var(--muted);font-size:11px;text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px">Kelly fraction</label><select id="kellyFraction" style="background:#0d1426;color:var(--text);border:1px solid var(--line);border-radius:10px;padding:11px;width:100%"><option value="1">Full Kelly</option><option value="0.5" selected>Half Kelly</option><option value="0.25">Quarter Kelly</option></select></div></div><div class="note">Enter a model probability on a row to calculate EV and Kelly. These calculations use cached odds only.</div>';
    setup.insertAdjacentElement('afterend',box);
    const b=localStorage.getItem(BANKROLL_KEY);if(b)bankEl().value=b;
    const f=localStorage.getItem(FRACTION_KEY);if(f)fracEl().value=f;
    bankEl().addEventListener('input',()=>localStorage.setItem(BANKROLL_KEY,bankEl().value));
    fracEl().addEventListener('change',()=>localStorage.setItem(FRACTION_KEY,fracEl().value));
  }
  window.edgeIQRenderEV=function(){
    if(!window.edgeIQRows||typeof window.edgeIQRenderOriginal!=='function')return;
  };
  addControls();
})();
