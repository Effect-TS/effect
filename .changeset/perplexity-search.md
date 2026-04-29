---
"@effect/ai-perplexity": minor
---

Add `@effect/ai-perplexity` package providing Effect bindings for the
[Perplexity Search API](https://docs.perplexity.ai/api-reference/search-post).

The package exposes a `PerplexitySearch` service with a `search` method that
returns typed `{ title, url, snippet, date? }` results. It supports the
`max_results`, `search_domain_filter`, `search_recency_filter`, and date-range
filters from the Search API. Authentication is read from the
`PERPLEXITY_API_KEY` environment variable (with `PPLX_API_KEY` as a fallback).
