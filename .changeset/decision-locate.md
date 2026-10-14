---
"effect": patch
"@effect/ai-openai": patch
---

Add `Decision.locate`, a decision that finds one target in the images passed to `DecisionModel.decide` and answers with a bounding box. Providers opt in with `supportsLocate: true`; other models reject locate decisions with `InvalidUserInputError`, as does a locate decision without images.
