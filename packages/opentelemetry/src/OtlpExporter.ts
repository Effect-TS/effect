/**
 * OTLP Exporter
 *
 * A generic OTLP exporter that can be used to build custom tracers, metrics exporters,
 * or loggers that send data to OTLP-compatible backends.
 *
 * This exporter handles:
 * - Batching of data with configurable batch size
 * - Automatic retry with backoff on transient errors
 * - Rate limiting with 429 Retry-After header support
 * - Graceful shutdown with timeout
 * - Automatic disabling for 60 seconds on persistent failures
 *
 * @since 1.0.0
 * @example
 * ```typescript
 * import { OtlpExporter } from "@effect/opentelemetry"
 * import { BunHttpClient } from "@effect/platform-bun"
 * import { Effect, Layer } from "effect"
 *
 * const program = Effect.gen(function*() {
 *   const exporter = yield* OtlpExporter.make({
 *     url: "https://api.honeycomb.io/v1/traces",
 *     headers: { "x-honeycomb-team": "your-api-key" },
 *     label: "honeycomb",
 *     exportInterval: "5 seconds",
 *     maxBatchSize: 100,
 *     body: (spans) => ({ resourceSpans: [{ scopeSpans: [{ spans }] }] }),
 *     shutdownTimeout: "3 seconds"
 *   })
 *
 *   // Push data to be exported
 *   exporter.push({ traceId: "...", spanId: "...", name: "my-span" })
 * })
 *
 * program.pipe(
 *   Effect.scoped,
 *   Effect.provide(BunHttpClient.layer),
 *   Effect.runPromise
 * )
 * ```
 */
import type * as Headers from "@effect/platform/Headers"
import type * as HttpClient from "@effect/platform/HttpClient"
import type * as Duration from "effect/Duration"
import type * as Effect from "effect/Effect"
import type * as Scope from "effect/Scope"
import * as internal from "./internal/otlpExporter.js"

/**
 * @since 1.0.0
 * @category Models
 */
export interface Exporter {
  /**
   * Push data to be exported. The data will be batched and sent according
   * to the configured export interval and batch size.
   */
  readonly push: (data: unknown) => void
}

/**
 * @since 1.0.0
 * @category Models
 */
export interface MakeOptions {
  /**
   * The OTLP endpoint URL to send data to.
   */
  readonly url: string
  /**
   * Optional HTTP headers to include in requests (e.g., authentication).
   */
  readonly headers?: Headers.Input | undefined
  /**
   * A label for this exporter, used in log messages and User-Agent header.
   */
  readonly label: string
  /**
   * How often to flush the buffer and send data.
   * @default "5 seconds"
   */
  readonly exportInterval: Duration.DurationInput
  /**
   * Maximum number of items to batch before triggering an immediate export.
   * Set to "disabled" to only export on interval.
   * @default 1000
   */
  readonly maxBatchSize: number | "disabled"
  /**
   * Function to transform buffered items into the request body.
   * This allows customizing the OTLP payload format.
   */
  readonly body: (data: Array<unknown>) => unknown
  /**
   * Maximum time to wait for pending exports during shutdown.
   * @default "3 seconds"
   */
  readonly shutdownTimeout: Duration.DurationInput
}

/**
 * Create an OTLP exporter that batches and sends data to an OTLP-compatible endpoint.
 *
 * The exporter automatically handles:
 * - Batching based on interval and max batch size
 * - Retry with exponential backoff on transient errors
 * - 429 rate limiting with Retry-After header support
 * - Graceful shutdown ensuring pending data is flushed
 * - Auto-disable for 60 seconds on persistent failures (logged via Effect.logDebug)
 *
 * @since 1.0.0
 * @category Constructors
 */
export const make: (
  options: MakeOptions
) => Effect.Effect<Exporter, never, HttpClient.HttpClient | Scope.Scope> = internal.make as any
