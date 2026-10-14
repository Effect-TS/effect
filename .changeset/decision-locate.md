---
"effect": patch
"@effect/ai-typesafe": patch
---

Add `Decision.locate`, which answers with a bounding box around one target in the images passed to `DecisionModel.decide`.

- Providers opt in with `supportsLocate: true`. Other providers reject locate decisions with `InvalidUserInputError`, and their `decide` options exclude `Decision.Locate` at the type level. A locate decision also needs at least one image.
- `Decision.Any` and `DecisionModel.ProviderAnswer` gain locate variants, so exhaustive switches over them need a `Locate` case.
- `TypeSafeDecisionModel` accepts PNG and JPEG images and sends locate decisions as Box questions, which need `jev-preview` or `jev-1.14.0`. With images, the request state becomes `{ input, images }`.
