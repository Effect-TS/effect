---
"@effect/ai-openrouter": patch
---

Add OpenRouterDecisionModel backed by the alpha Decisions API, with typed request and response schemas and a client method that reuses authentication and error mapping.

`OpenRouterClient.Service` now requires `createDecisions`. Handwritten service implementations and mocks must provide this method.
