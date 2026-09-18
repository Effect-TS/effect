---
"effect": patch
---

Add `Decision` and `DecisionModel` to `effect/unstable/ai` for classification, rating, and probability estimates. Named decisions share one input and one provider call, returning typed answers and token usage.

Inputs are encoded with `Schema.toCodecJson`: explicit `undefined` fields become `null`, and absent fields stay absent. Custom declarations need a JSON codec annotation or encoding fails with `InvalidUserInputError`.
