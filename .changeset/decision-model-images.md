---
"effect": patch
---

`DecisionModel.decide` accepts `images` beside the input, for decision models that read them. A provider opts in with `DecisionModel.make({ supportsImages: true })` and receives them as `ProviderOptions.images`; a model made without it fails a call that passes images with `InvalidUserInputError`, rather than answer about an image it never saw.
