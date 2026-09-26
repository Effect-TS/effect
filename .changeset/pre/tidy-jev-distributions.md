---
"effect": patch
"@effect/ai-openrouter": patch
"@effect/ai-typesafe": patch
---

Add a `probabilityPrecision` option to `DecisionModel.make` that accepts and rescales the sum drift caused by a provider rounding each probability. OpenRouter and TypeSafe decision models set it to two decimals, so rounded distributions such as `0.02 / 0.93 / 0.04` no longer fail with `InvalidOutputError`. Providers that do not opt in keep strict sum validation.
