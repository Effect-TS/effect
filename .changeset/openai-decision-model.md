---
"@effect/ai-openai": patch
---

Add `OpenAiDecisionModel`, a `DecisionModel` backed by OpenAI's Decisions API (`gpt-6-luna`), and `OpenAiClient.createDecisions`. Refused decisions fail the call with `AiError.ContentPolicyError`, and remote image URLs fail with `AiError.InvalidUserInputError`.
