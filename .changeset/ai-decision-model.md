---
"effect": patch
---

Add `DecisionModel` and `Decision` to `effect/unstable/ai`.

`Decision.make` pairs an input `Schema` with named `classify`, `rate`, and `probability` decisions. `DecisionModel.decide` encodes the input, answers every decision in one provider call, and returns typed answers keyed like the decisions, with classify and rate labels inferred as literal unions from the criteria. Providers implement the service through `DecisionModel.make`, and a `DecisionModel` layer can be wrapped with `Model.make` like the language and embedding models.
