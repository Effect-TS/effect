# `@effect/ai-perplexity`

Effect bindings for the [Perplexity Search API](https://docs.perplexity.ai/api-reference/search-post).

## Installation

```sh
pnpm add @effect/ai-perplexity @effect/ai @effect/platform effect
```

You will also need a platform-specific HTTP client implementation, e.g.
`@effect/platform-node` or `@effect/platform-bun`.

## Authentication

The client reads its API key from the `PERPLEXITY_API_KEY` environment
variable, falling back to `PPLX_API_KEY` if the former is not set. You can
obtain a key from the
[Perplexity API key console](https://www.perplexity.ai/account/api/keys).

## Usage

```ts
import { NodeHttpClient } from "@effect/platform-node"
import { PerplexitySearch } from "@effect/ai-perplexity"
import { Effect, Layer } from "effect"

const program = Effect.gen(function*() {
  const search = yield* PerplexitySearch.PerplexitySearch
  const response = yield* search.search({
    query: "latest research on attention mechanisms",
    maxResults: 5,
    recencyFilter: "month"
  })
  for (const result of response.results) {
    console.log(result.title, result.url)
  }
})

const SearchLayer = PerplexitySearch.layerConfig().pipe(
  Layer.provide(NodeHttpClient.layerUndici)
)

Effect.runPromise(program.pipe(Effect.provide(SearchLayer)))
```

### Search options

`PerplexitySearch.search` accepts the following options (all but `query` are
optional):

| Option              | Type                                                 | Description                                                                                                       |
| ------------------- | ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `query`             | `string`                                             | The search query.                                                                                                 |
| `maxResults`        | `number`                                             | Maximum results to return. Server default is 10.                                                                  |
| `maxTokensPerPage`  | `number`                                             | Maximum tokens per result snippet.                                                                                |
| `domainFilter`      | `ReadonlyArray<string>`                              | Allowlist (`"nytimes.com"`) **or** denylist (`"-pinterest.com"`). Cannot be mixed.                                |
| `recencyFilter`     | `"hour" \| "day" \| "week" \| "month" \| "year"`     | Restrict results to a recency window.                                                                             |
| `afterDateFilter`   | `string`                                             | Only return results published on or after this date (`m/d/yyyy`).                                                 |
| `beforeDateFilter`  | `string`                                             | Only return results published on or before this date (`m/d/yyyy`).                                                |

The response is decoded into `SearchResponse`, which exposes a `results`
array of `{ title, url, snippet, date? }` items.

### Domain filter caveat

The Perplexity API does not accept a `search_domain_filter` array that mixes
allowed and excluded domains. `PerplexitySearch.search` enforces this by
failing fast with an `AiError.MalformedInput` if you pass an array containing
both positive (`"nytimes.com"`) and negative (`"-pinterest.com"`) entries.

### Manual layer composition

If you want to provide the API key explicitly:

```ts
import { PerplexityClient, PerplexitySearch } from "@effect/ai-perplexity"
import { NodeHttpClient } from "@effect/platform-node"
import { Layer, Redacted } from "effect"

const SearchLayer = PerplexitySearch.layer.pipe(
  Layer.provide(PerplexityClient.layer({
    apiKey: Redacted.make(process.env.PERPLEXITY_API_KEY!)
  })),
  Layer.provide(NodeHttpClient.layerUndici)
)
```

## Documentation

- [Search API quickstart](https://docs.perplexity.ai/docs/search/quickstart)
- [Search API reference](https://docs.perplexity.ai/api-reference/search-post)
- [Domain filters](https://docs.perplexity.ai/docs/search/filters/domain-filter)
- [Date / recency filters](https://docs.perplexity.ai/docs/search/filters/date-time-filters)
