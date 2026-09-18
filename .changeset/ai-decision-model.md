---
"effect": patch
---

Add `Decision` and `DecisionModel` to `effect/unstable/ai` for classification, rating, and probability estimates. Named decisions share one input and one provider call, returning typed answers and token usage.

Classify and rate answers report `confidence` only when the provider supplies one, so callers must handle its absence.

Inputs are encoded with `Schema.toCodecJson`: explicit `undefined` fields become `null`, and absent fields stay absent. Custom declarations need a JSON codec annotation or encoding fails with `InvalidUserInputError`.
