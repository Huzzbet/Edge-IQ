/* Edge-IQ paper trading ledger. No real bets are placed. */
const KEY='edgeiq-paper-trades-v1';
function read(){try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch{return []}}
function add(trade){const rows=read();const t={...trade,id:trade.id||`${Date.now()}-${Math.random().toString(36).slice(2,8)}`,status:'OPEN',createdAt:new Date().toISOString()};rows.push(t);localStorage.setItem(KEY,JSON.stringify(rows));return t}
function settle(id,result){const rows=read();const i=rows.findIndex(x=>x.id===id);if(i<0)return null;const t=rows[i];t.result=result;t.status='SETTLED';t.profit=result==='WIN'?Number(t.stake||1)*(Number(t.odds)-1):result==='PUSH'?0:-Number(t.stake||1);t.settledAt=new Date().toISOString();localStorage.setItem(KEY,JSON.stringify(rows));return t}
function stats(){const rows=read().filter(x=>x.status==='SETTLED'),staked=rows.reduce((s,x)=>s+Number(x.stake||1),0),profit=rows.reduce((s,x)=>s+Number(x.profit||0),0);return {bets:rows.length,profit,roi:staked?profit/staked:null,wins:rows.filter(x=>x.result==='WIN').length,losses:rows.filter(x=>x.result==='LOSS').length}}
export {read,add,settle,stats};
