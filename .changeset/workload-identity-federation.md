---
"effect": patch
"@effect/ai-anthropic": patch
---

Add Workload Identity Federation to `@effect/ai-anthropic` with `AnthropicCredentials.layerWorkloadIdentity` and `AnthropicCredentials.layerWorkloadIdentityConfig`, built on the new `effect/ai/Credentials` and `effect/ai/WorkloadIdentity` modules. `AnthropicClient` takes credentials from a new `credentials` option or from context.

`AnthropicConfig` client transforms must now be generic over the client's error and requirement types, and `AnthropicClient`'s `client` can also fail with `AiError`.
