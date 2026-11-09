---
"@effect/ai-openai": patch
---

Add Workload Identity Federation to `@effect/ai-openai` with `OpenAiCredentials.layerWorkloadIdentity`. `OpenAiClient` takes credentials from a new `credentials` option or from context.

`OpenAiConfig` client transforms must now be generic over the client's error and requirement types, and `OpenAiClient`'s `client` can also fail with `AiError`.
