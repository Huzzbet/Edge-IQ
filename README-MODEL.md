# Edge-IQ model framework

## Current models
- `AFL_ELO_V1`: transparent Elo + home advantage + recent form.
- `AFL_ML_V2`: deterministic ensemble of Elo, recent form and scoring margin. This is a model-style ensemble, not a trained neural network.

## Signal rules
A live signal becomes `STRONG` only when:
- ensemble EV >= 5%
- model probability exceeds market consensus by >= 2.5 percentage points
- model agreement >= 80%
- bookmaker coverage >= 3 books

`ELITE` requires EV >= 10%, model-vs-market edge >= 5pp, model agreement >= 90%, and >= 4 books.

## Validation
All models must be evaluated with walk-forward data. Do not use future results or post-match information when creating a prediction. Track accuracy, Brier score, log loss, calibration, ROI, drawdown and closing-line value.

## Safety of interpretation
Positive model EV is an estimate, not a guarantee. A model probability is only actionable after sufficient out-of-sample evidence supports its calibration and profitability.
