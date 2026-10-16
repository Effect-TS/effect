---
"effect": patch
"@effect/ai-openai": patch
"@effect/ai-openrouter": patch
---

Add `DecisionModel.decideSettled`, which keeps valid decision answers when others are missing, refused, or invalid. Each decision settles to a `Result` of its answer or a `Decision.Unanswered` with reason `"Missing"`, `"Refused"`, `"NoDistribution"`, or `"Invalid"`; provider failures still fail the effect.

Provider answers may now omit `probabilities`, and providers can report a `{ _tag: "Refusal" }` answer. `decide` keeps its all-or-nothing contract: any refusal fails with `AiError.ContentPolicyError`, otherwise the first unanswered decision fails with `AiError.InvalidOutputError`.

`OpenRouterDecisionModel` passes choice and score answers without probabilities to the core instead of failing the whole call. `OpenAiDecisionModel` reports refusals per decision, and its `ContentPolicyError` no longer carries `metadata.openai.refusedDecisions`. It also reports a score answer for a non-rate decision as invalid instead of missing.
