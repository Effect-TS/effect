---
"@effect/ai-anthropic": patch
---

Strip `strictJsonSchema` from the Messages request body (#8076)

`strictJsonSchema` is a provider-only config key consumed by `prepareTools` to decide the per-tool `strict` flag. It was missing from the destructuring list in `makeRequest`, so it leaked into the request payload as a top-level field, which the Anthropic API (and Bedrock's Anthropic runtime) reject with `Extra inputs are not permitted`.
