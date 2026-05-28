---
"@effect/ai-amazon-bedrock": patch
---

`generateObject` no longer fails when extended thinking is configured via `withConfigOverride`. Anthropic's API rejects requests that set `thinking` in `additionalModelRequestFields` alongside a forced `toolChoice` — which `generateObject` always does. The fix strips `thinking` from `additionalModelRequestFields` in the `json` response format path before the request is sent.
