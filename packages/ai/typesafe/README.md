# @effect/ai-typesafe

TypeSafe System One provider for Effect's `DecisionModel`. Supports classification, ordered ratings, and probabilities through Effect `HttpClient`.

Use `TypeSafeClient.layerConfig()` to read `TYPESAFE_API_KEY`, then provide `TypeSafeDecisionModel.model("jev-latest")` to a decision workflow. Versioned model identifiers such as `jev-1.13.0` are also supported.

The client does not retry automatically. Rate-limit errors include the provider's retry delay when available. Provider distributions are preserved, not normalized; they must satisfy the core `DecisionModel` validation, including its current `1e-6` sum tolerance. TypeSafe's rounding behavior has not been verified against the live API.
