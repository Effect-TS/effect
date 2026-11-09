---
"@effect/ai-openrouter": patch
---

Regenerate `Generated.ts` from a pinned OpenRouter spec, removing the `Schema.Never` properties that rejected valid payloads.

Type changes to this unstable module:

- `Generated.make` is generic over the HTTP client's error and requirement types.
- Operations no longer take `HTTP-Referer`, `X-OpenRouter-Title` or `X-OpenRouter-Categories` params, and `*Params` schemas holding only those headers are removed. `OpenRouterClient` sends `HTTP-Referer` and `X-Title` from `siteReferrer` and `siteTitle`; add other headers with `transformClient`.
- `GetGeneration200.data.workspace_id` is required and nullable, so responses without it no longer decode.
- JSON Schema fields such as tool `parameters` are typed as JSON objects.
- Schemas inlined into their only uses (such as `BaseResponsesResult`, `Usage` and `ResponsesErrorField`), schemas the spec dropped (such as `FileMetadata`) and the anonymous `Objects_N`, `Arrays_N` and `Union_N` schemas are no longer exported.
