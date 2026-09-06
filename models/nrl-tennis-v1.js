/* Edge-IQ research models: probability estimators only. Promotion remains gated. */
(function(){
 const clamp=(x,a=.02,b=.98)=>Math.max(a,Math.min(b,x));
 const n=v=>Number.isFinite(Number(v))?Number(v):null;
 const sigmoid=x=>1/(1+Math.exp(-x));
 function nrlProbability(o){const rating=n(o.homeRatingDiff??o.ratingDiff??o.modelRatingDiff),line=n(o.line??o.spread),total=n(o.total),home=n(o.homeAdvantage);if(rating==null&&line==null)return null;let z=(rating||0)/18+(home||0)/100;if(line!=null)z+=(-line)/12;if(total!=null)z+=((total-44)/80)*.05;return clamp(sigmoid(z))}
 function tennisProbability(o){const elo=n(o.eloDiff??o.ratingDiff??o.surfaceRatingDiff),surface=n(o.surfaceAdjustment),fatigue=n(o.fatigueDiff),rest=n(o.restDiff);if(elo==null&&surface==null)return null;let z=(elo||0)/190+(surface||0)/250;if(fatigue!=null)z-=fatigue/20;if(rest!=null)z+=rest/14;return clamp(sigmoid(z))}
 function eplProbability(o){const attack=n(o.attackDiff),defence=n(o.defenceDiff),home=n(o.homeAdvantage);if(attack==null&&defence==null)return null;return clamp(sigmoid((attack||0)/1.8-(defence||0)/2.2+(home||0)/4))}
 window.EdgeIQResearchModels={nrlProbability,tennisProbability,eplProbability};
})();