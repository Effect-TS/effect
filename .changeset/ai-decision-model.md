---
"effect": patch
---

Add `DecisionModel` and `Decision` to `effect/unstable/ai`.

`Decision.make` pairs an input `Schema` with named `classify`, `rate`, and `probability` decisions. `DecisionModel.decide` encodes the input, answers every decision in one provider call, and returns typed answers keyed like the decisions, with classify and rate labels inferred as literal unions from the criteria. Providers implement the service through `DecisionModel.make`, and a `DecisionModel` layer can be wrapped with `Model.make` like the language and embedding models.

Input encoding uses `Schema.toCodecJson` to produce `Schema.Json` provider state. Explicitly `undefined` optional fields become `null`; absent fields remain absent. Inputs without a defined JSON encoding, such as a raw `Schema.declare<Date>` without a `toCodecJson` or `toCodec` annotation, fail with `InvalidUserInputError` before the provider is called. Use `Schema.Date` or supply a codec annotation for custom declarations.
