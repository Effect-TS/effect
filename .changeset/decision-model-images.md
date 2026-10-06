---
"effect": patch
---

Add image input to `DecisionModel.decide`. Providers opt in with `supportsImages: true` and receive images through `ProviderOptions.images`. Models without image support reject nonempty image input with `InvalidUserInputError`.
