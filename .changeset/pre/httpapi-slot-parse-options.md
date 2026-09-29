---
"effect": patch
---

Add per-slot `HttpApi` parse options for params, query, headers, payload, success and error codecs. Each slot falls back to `ParseOptions` when unset. Set `HeadersParseOptions` to `{}` to keep strict body parsing without rejecting transport headers.
