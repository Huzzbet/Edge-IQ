/* Edge-IQ CLV + risk engine. */
function implied(odds){return Number.isFinite(Number(odds))&&Number(odds)>1?1/Number(odds):null}
function clv(entryOdds,closeOdds){const e=implied(entryOdds),c=implied(closeOdds);if(e==null||c==null)return null;return c-e}
function priceMove(entryOdds,closeOdds){if(!(entryOdds>1&&closeOdds>1))return null;return (entryOdds/closeOdds)-1}
function kelly(prob,odds){if(!(prob>0&&prob<1&&odds>1))return 0;return Math.max(0,(prob*odds-1)/(odds-1))}
function stake({prob,odds,bankroll,fraction=.5,maxPct=.02}){const raw=kelly(prob,odds)*fraction;return Math.max(0,Math.min(Number(bankroll||0)*maxPct,Number(bankroll||0)*raw))}
function riskLabel({modelProb,marketProb,books,modelAgreement,calibrated=false}){const edge=Number(modelProb)-Number(marketProb);if(!calibrated)return 'PAPER_ONLY';if(edge>=.05&&modelAgreement>=.9&&books>=4)return 'ELITE';if(edge>=.025&&modelAgreement>=.8&&books>=3)return 'STRONG';return 'WATCH'}
export {implied,clv,priceMove,kelly,stake,riskLabel};
