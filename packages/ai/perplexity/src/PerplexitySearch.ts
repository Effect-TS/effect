/**
 * @since 1.0.0
 */
import * as AiError from "@effect/ai/AiError"
import type * as HttpClient from "@effect/platform/HttpClient"
import * as HttpClientRequest from "@effect/platform/HttpClientRequest"
import type * as Config from "effect/Config"
import type { ConfigError } from "effect/ConfigError"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import type * as Redacted from "effect/Redacted"
import * as Schema from "effect/Schema"
import * as PerplexityClient from "./PerplexityClient.js"

/**
 * @since 1.0.0
 * @category Schemas
 */
export class SearchResult extends Schema.Class<SearchResult>(
  "@effect/ai-perplexity/SearchResult"
)({
  title: Schema.String,
  url: Schema.String,
  snippet: Schema.String,
  date: Schema.optional(Schema.NullOr(Schema.String))
}) {}

/**
 * @since 1.0.0
 * @category Schemas
 */
export class SearchResponse extends Schema.Class<SearchResponse>(
  "@effect/ai-perplexity/SearchResponse"
)({
  id: Schema.optional(Schema.String),
  results: Schema.Array(SearchResult)
}) {}

/**
 * Recency window for search results. Maps to the `search_recency_filter`
 * request parameter.
 *
 * @since 1.0.0
 * @category Models
 */
export type RecencyFilter = "hour" | "day" | "week" | "month" | "year"

/**
 * Options accepted by `PerplexitySearch.search`.
 *
 * Matches the Perplexity Search API request body
 * (https://docs.perplexity.ai/api-reference/search-post).
 *
 * @since 1.0.0
 * @category Models
 */
export interface SearchOptions {
  readonly query: string
  /**
   * Maximum number of results to return. The Perplexity default is 10.
   */
  readonly maxResults?: number | undefined
  /**
   * Maximum tokens returned per page snippet.
   */
  readonly maxTokensPerPage?: number | undefined
  /**
   * Domain allowlist or denylist. Prefix a domain with `-` to exclude it.
   * Do **not** mix allowed and excluded domains in the same array — the API
   * expects one mode at a time.
   */
  readonly domainFilter?: ReadonlyArray<string> | undefined
  /**
   * Restrict results to a recency window.
   */
  readonly recencyFilter?: RecencyFilter | undefined
  /**
   * Only return results published on or after this date. Format: `m/d/yyyy`.
   */
  readonly afterDateFilter?: string | undefined
  /**
   * Only return results published on or before this date. Format: `m/d/yyyy`.
   */
  readonly beforeDateFilter?: string | undefined
}

/**
 * @since 1.0.0
 * @category Context
 */
export class PerplexitySearch extends Context.Tag(
  "@effect/ai-perplexity/PerplexitySearch"
)<PerplexitySearch, Service>() {}

/**
 * @since 1.0.0
 * @category Models
 */
export interface Service {
  /**
   * Run a Perplexity Search API query and return the decoded results.
   */
  readonly search: (
    options: SearchOptions
  ) => Effect.Effect<SearchResponse, AiError.AiError>
}

const validateDomainFilter = (filter: ReadonlyArray<string>): void => {
  const hasAllow = filter.some((d) => !d.startsWith("-"))
  const hasDeny = filter.some((d) => d.startsWith("-"))
  if (hasAllow && hasDeny) {
    throw new Error(
      "PerplexitySearch: domainFilter cannot mix allowlist and denylist entries. " +
        "Use either positive entries (e.g. 'nytimes.com') or negative entries (e.g. '-pinterest.com'), not both."
    )
  }
}

const buildBody = (options: SearchOptions): Record<string, unknown> => {
  if (options.domainFilter && options.domainFilter.length > 0) {
    validateDomainFilter(options.domainFilter)
  }
  const body: Record<string, unknown> = { query: options.query }
  if (options.maxResults !== undefined) body.max_results = options.maxResults
  if (options.maxTokensPerPage !== undefined) body.max_tokens_per_page = options.maxTokensPerPage
  if (options.domainFilter !== undefined) body.search_domain_filter = options.domainFilter
  if (options.recencyFilter !== undefined) body.search_recency_filter = options.recencyFilter
  if (options.afterDateFilter !== undefined) body.search_after_date_filter = options.afterDateFilter
  if (options.beforeDateFilter !== undefined) body.search_before_date_filter = options.beforeDateFilter
  return body
}

/**
 * Build the request body sent to the Perplexity Search API.
 *
 * Exposed mainly for testing — most callers should use
 * `PerplexitySearch.search` instead.
 *
 * @since 1.0.0
 * @category Utilities
 */
export const buildRequestBody = (options: SearchOptions): Record<string, unknown> => buildBody(options)

/**
 * @since 1.0.0
 * @category Constructors
 */
export const make: Effect.Effect<Service, never, PerplexityClient.PerplexityClient> = Effect.gen(function*() {
  const client = yield* PerplexityClient.PerplexityClient

  const search = (options: SearchOptions): Effect.Effect<SearchResponse, AiError.AiError> =>
    Effect.suspend(() => {
      let body: Record<string, unknown>
      try {
        body = buildBody(options)
      } catch (error) {
        return Effect.fail(
          new AiError.MalformedInput({
            module: "PerplexitySearch",
            method: "search",
            description: error instanceof Error ? error.message : String(error),
            cause: error
          })
        )
      }
      const request = HttpClientRequest.post("/search").pipe(
        HttpClientRequest.bodyUnsafeJson(body)
      )
      return client.executeRequest(request, SearchResponse, "search")
    })

  return { search }
})

/**
 * Layer that builds the `PerplexitySearch` service from a `PerplexityClient`.
 *
 * @since 1.0.0
 * @category Layers
 */
export const layer: Layer.Layer<PerplexitySearch, never, PerplexityClient.PerplexityClient> = Layer.effect(
  PerplexitySearch,
  make
)

/**
 * Convenience layer that wires the `PerplexitySearch` service together with
 * a `PerplexityClient` configured from environment variables. Reads the API
 * key from `PERPLEXITY_API_KEY` (falling back to `PPLX_API_KEY`).
 *
 * @since 1.0.0
 * @category Layers
 */
export const layerConfig = (
  options?: {
    readonly apiKey?: Config.Config<Redacted.Redacted> | undefined
    readonly apiUrl?: Config.Config<string> | undefined
  }
): Layer.Layer<PerplexitySearch, ConfigError, HttpClient.HttpClient> =>
  layer.pipe(Layer.provide(PerplexityClient.layerConfig(options)))
