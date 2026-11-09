---
"@effect/ai-openrouter": patch
---

Regenerate `Generated.ts` from a pinned OpenRouter spec, making `Generated.make` generic over the HTTP client's error and requirement types. Operations no longer take `HTTP-Referer`, `X-OpenRouter-Title` or `X-OpenRouter-Categories` params, so `*Params` schemas holding only those headers are removed; schemas now inlined into their only uses (such as `BaseResponsesResult`, `Usage` and `ResponsesErrorField`), schemas the spec dropped (such as `FileMetadata`) and the anonymous `Objects_N`, `Arrays_N` and `Union_N` schemas are no longer exported.
