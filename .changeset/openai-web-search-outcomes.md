---
"@effect/ai-openai": patch
---

Report non-completed OpenAI web and file searches as failure tool results, preserving search details and partial file results in both `generateText` and `streamText`.

Search success types now restrict `status` to `"completed"`; handle other statuses when `isFailure` is `true`. File-search success and failure results now require `results`, an array or `null`. Streaming normalizes omitted results to `null`, matching `generateText`. When constructing result payloads, include `results: null` when results are unavailable.
