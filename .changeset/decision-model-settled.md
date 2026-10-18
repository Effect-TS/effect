---
"effect": patch
"@effect/ai-openai": patch
"@effect/ai-openrouter": patch
---

Add `DecisionModel.decideSettled` to retain valid answers alongside per-decision `Result` failures (`Missing`, `Refused`, `NoDistribution`, or `Invalid`). Provider failures still fail the effect; `decide` remains all-or-nothing.

OpenRouter now passes missing distributions to core validation. OpenAI reports refusals per decision and wrong-kind score answers as invalid rather than missing.

Update hand-built services to implement `decideSettled`, handle optional provider `probabilities` and refusal answers, and use settled outcomes instead of the removed `OpenAiContentPolicyMetadata` and `metadata.openai.refusedDecisions`.
