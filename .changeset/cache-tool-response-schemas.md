---
"effect": patch
---

Cache per-tool response schemas and parameter-mode copies to reduce schema construction in `LanguageModel.generateText` and `LanguageModel.streamText`. The schema cache also applies to direct calls to `Response.Part`, `Response.StreamPart` and `Response.AllParts`.
