/**
 * Proxies OTLP HTTP exports from browsers through an application's own HTTP
 * server to an OpenTelemetry Collector or vendor endpoint.
 *
 * A browser exporting OTLP directly would need the vendor credentials in its
 * bundle and a cross-origin collector. `OtlpProxy` mounts `POST /v1/traces`,
 * `/v1/logs`, and `/v1/metrics` on an `HttpRouter`, adds the configured
 * headers on the server, and forwards the payload unchanged. The browser can
 * then use `Otlp.layer({ baseUrl: "/otlp" })` against its own origin.
 *
 * **Details**
 *
 * - The upstream URL comes only from configuration. The request path and query
 *   string never reach it.
 * - Only `application/json` and `application/x-protobuf` bodies are accepted;
 *   other content types get `415`. Payloads are not decoded or validated.
 * - Only `content-type` and `content-encoding`, plus any `forwardHeaders`, are
 *   forwarded from the client. Configured `headers` are applied last, so a
 *   client cannot override them.
 * - Bodies are buffered up to `maxBodySize` and rejected with `413` beyond it.
 * - The upstream status and body are returned with only the `content-type` and
 *   `retry-after` headers, so client SDK back-off keeps working and upstream
 *   cookies are dropped. Transport failures return `502` and timeouts `504`.
 *   The proxy does not retry or batch.
 *
 * **Gotchas**
 *
 * Anyone who can reach the routes can send telemetry with the configured
 * credentials. Compose authentication, CORS, and rate limiting around the
 * layer as the application requires.
 *
 * @stability unstable
 * @since 4.0.7
 */
import * as ByteSize from "../ByteSize.ts"
import * as Duration from "../Duration.ts"
import * as Effect from "../Effect.ts"
import * as Headers from "../http/Headers.ts"
import * as HttpClient from "../http/HttpClient.ts"
import * as HttpClientRequest from "../http/HttpClientRequest.ts"
import type * as HttpClientResponse from "../http/HttpClientResponse.ts"
import * as HttpIncomingMessage from "../http/HttpIncomingMessage.ts"
import * as HttpRouter from "../http/HttpRouter.ts"
import * as HttpServerRequest from "../http/HttpServerRequest.ts"
import * as HttpServerRespondable from "../http/HttpServerRespondable.ts"
import * as HttpServerResponse from "../http/HttpServerResponse.ts"
import * as Layer from "../Layer.ts"
import * as Stream from "../Stream.ts"
import * as OtlpEnv from "./internal/otlpEnv.ts"

/**
 * OTLP signal type served by the proxy.
 *
 * @stability unstable
 * @category models
 * @since 4.0.7
 */
export type Signal = "traces" | "logs" | "metrics"

/**
 * Creates a request handler for each OTLP signal that forwards to the
 * configured upstream.
 *
 * **When to use**
 *
 * Use to mount the proxy on routes or a router other than the ones `layer`
 * registers, such as an `HttpApi` endpoint.
 *
 * **Details**
 *
 * Each signal is sent to `urls[signal]` when set, otherwise to
 * `/v1/<signal>` below `baseUrl`. `maxBodySize` defaults to the
 * `HttpIncomingMessage.MaxBodySize` reference, then 10 MiB. `timeout` defaults
 * to 10 seconds.
 *
 * @see {@link layer} for mounting the handlers on an `HttpRouter`.
 * @stability unstable
 * @category constructors
 * @since 4.0.7
 */
export const make = (options: {
  readonly baseUrl: string
  readonly urls?: Partial<Record<Signal, string>> | undefined
  readonly headers?: Headers.Input | undefined
  readonly forwardHeaders?: ReadonlyArray<string> | undefined
  readonly maxBodySize?: ByteSize.Input | undefined
  readonly timeout?: Duration.Input | undefined
}): Effect.Effect<
  (signal: Signal) => Effect.Effect<
    HttpServerResponse.HttpServerResponse,
    never,
    HttpServerRequest.HttpServerRequest
  >,
  never,
  HttpClient.HttpClient
> =>
  Effect.gen(function*() {
    const client = yield* HttpClient.HttpClient
    const base = HttpClientRequest.post(options.baseUrl)
    const handlers = {} as Record<Signal, ReturnType<typeof makeHandler>>
    for (const signal of allSignals) {
      handlers[signal] = makeHandler(client, {
        ...options,
        url: options.urls?.[signal] ?? HttpClientRequest.appendUrl(base, `/v1/${signal}`).url
      })
    }
    return (signal: Signal) => handlers[signal]
  })

/**
 * Creates a layer that mounts the OTLP proxy routes on an `HttpRouter`.
 *
 * **Details**
 *
 * Registers `POST <prefix>/v1/<signal>` for each of `signals`, which defaults
 * to traces, logs, and metrics. Without a `prefix` the routes are mounted at
 * the router root.
 *
 * **Example** (Proxying browser telemetry to a vendor)
 *
 * ```ts import.meta.vitest
 * import { Layer } from "effect"
 * import { FetchHttpClient } from "effect/http"
 * import { OtlpProxy } from "effect/observability"
 *
 * const OtlpProxyLayer = OtlpProxy.layer({
 *   baseUrl: "https://otlp.vendor.example",
 *   headers: { authorization: "Bearer server-side-key" },
 *   prefix: "/otlp"
 * }).pipe(Layer.provide(FetchHttpClient.layer))
 *
 * Layer.isLayer(OtlpProxyLayer) // => true
 * ```
 *
 * @see {@link layerFromConfig} for reading the upstream from OpenTelemetry environment variables.
 * @stability unstable
 * @category layers
 * @since 4.0.7
 */
export const layer = (options: {
  readonly baseUrl: string
  readonly urls?: Partial<Record<Signal, string>> | undefined
  readonly headers?: Headers.Input | undefined
  readonly forwardHeaders?: ReadonlyArray<string> | undefined
  readonly maxBodySize?: ByteSize.Input | undefined
  readonly timeout?: Duration.Input | undefined
  readonly prefix?: string | undefined
  readonly signals?: ReadonlyArray<Signal> | undefined
}): Layer.Layer<never, never, HttpRouter.HttpRouter | HttpClient.HttpClient> =>
  Layer.effectDiscard(Effect.gen(function*() {
    const handler = yield* make(options)
    yield* addRoutes(options, handler)
  }))

/**
 * Creates a layer that mounts the OTLP proxy routes using the upstream from
 * OpenTelemetry environment configuration.
 *
 * **Details**
 *
 * Each signal is sent to `OTEL_EXPORTER_OTLP_<SIGNAL>_ENDPOINT`, falling back
 * to `/v1/<signal>` below `OTEL_EXPORTER_OTLP_ENDPOINT`, with headers from
 * `OTEL_EXPORTER_OTLP_<SIGNAL>_HEADERS` or `OTEL_EXPORTER_OTLP_HEADERS`. The
 * `headers` option replaces the configured headers. Signals without an
 * endpoint get no route.
 *
 * @see {@link layer} for configuring the upstream directly.
 * @stability unstable
 * @category layers
 * @since 4.0.7
 */
export const layerFromConfig = (options?: {
  readonly headers?: Headers.Input | undefined
  readonly forwardHeaders?: ReadonlyArray<string> | undefined
  readonly maxBodySize?: ByteSize.Input | undefined
  readonly timeout?: Duration.Input | undefined
  readonly prefix?: string | undefined
  readonly signals?: ReadonlyArray<Signal> | undefined
}): Layer.Layer<never, never, HttpRouter.HttpRouter | HttpClient.HttpClient> =>
  Layer.effectDiscard(
    Effect.gen(function*() {
      const client = yield* HttpClient.HttpClient
      const handlers = new Map<Signal, ReturnType<typeof makeHandler>>()
      for (const signal of options?.signals ?? allSignals) {
        const envSignal = signal.toUpperCase() as OtlpEnv.Signal
        const url = yield* OtlpEnv.endpoint(envSignal)
        if (url === undefined) continue
        handlers.set(
          signal,
          makeHandler(client, {
            ...options,
            url: url.toString(),
            headers: options?.headers ?? (yield* OtlpEnv.headers(envSignal))
          })
        )
      }
      yield* addRoutes({ prefix: options?.prefix, signals: [...handlers.keys()] }, (signal) => handlers.get(signal)!)
    }).pipe(Effect.orDie)
  )

// internal

const allSignals: ReadonlyArray<Signal> = ["traces", "logs", "metrics"]

const contentTypes = new Set(["application/json", "application/x-protobuf"])

const defaultMaxBodySize = ByteSize.mebibytes(10)

const addRoutes = Effect.fnUntraced(function*(
  options: { readonly prefix?: string | undefined; readonly signals?: ReadonlyArray<Signal> | undefined },
  handler: (signal: Signal) => ReturnType<typeof makeHandler>
) {
  const router = yield* HttpRouter.HttpRouter
  const target = options.prefix === undefined ? router : router.prefixed(options.prefix)
  for (const signal of options.signals ?? allSignals) {
    yield* target.add("POST", `/v1/${signal}`, handler(signal))
  }
})

const makeHandler = (client: HttpClient.HttpClient, options: {
  readonly url: string
  readonly headers?: Headers.Input | undefined
  readonly forwardHeaders?: ReadonlyArray<string> | undefined
  readonly maxBodySize?: ByteSize.Input | undefined
  readonly timeout?: Duration.Input | undefined
}): Effect.Effect<HttpServerResponse.HttpServerResponse, never, HttpServerRequest.HttpServerRequest> => {
  const upstream = client.pipe(
    HttpClient.transformResponse(Effect.provideService(HttpClient.TracerPropagationEnabled, false))
  )
  const headers = Headers.fromInput(options.headers)
  const forwardHeaders = ["content-encoding", ...(options.forwardHeaders ?? []).map((name) => name.toLowerCase())]
  const maxBodySize = options.maxBodySize === undefined ? undefined : ByteSize.fromInputUnsafe(options.maxBodySize)
  const timeout = options.timeout ?? Duration.seconds(10)

  return Effect.gen(function*() {
    const request = yield* HttpServerRequest.HttpServerRequest
    const contentType = request.headers["content-type"]
    if (contentType === undefined || !contentTypes.has(contentType.split(";")[0].trim().toLowerCase())) {
      return HttpServerResponse.empty({ status: 415 })
    }
    const limit = Number(maxBodySize ?? (yield* HttpIncomingMessage.MaxBodySize) ?? defaultMaxBodySize)
    if (Number(request.headers["content-length"]) > limit) {
      return HttpServerResponse.empty({ status: 413 })
    }
    const body = yield* readBody(request, limit)
    if (HttpServerResponse.isHttpServerResponse(body)) {
      return body
    }

    let outbound = HttpClientRequest.bodyUint8Array(HttpClientRequest.post(options.url), body, contentType)
    for (const name of forwardHeaders) {
      const value = request.headers[name]
      if (value !== undefined) {
        outbound = HttpClientRequest.setHeader(outbound, name, value)
      }
    }
    return yield* upstream.execute(HttpClientRequest.setHeaders(outbound, headers)).pipe(
      Effect.flatMap((response) => Effect.map(response.arrayBuffer, (body) => toServerResponse(response, body))),
      Effect.timeout(timeout),
      Effect.catchTags({
        TimeoutError: () => Effect.succeed(HttpServerResponse.empty({ status: 504 })),
        HttpClientError: () => Effect.succeed(HttpServerResponse.empty({ status: 502 }))
      }),
      Effect.withTracerEnabled(false)
    )
  })
}

const toServerResponse = (
  response: HttpClientResponse.HttpClientResponse,
  body: ArrayBuffer
): HttpServerResponse.HttpServerResponse => {
  const headers: Record<string, string> = {}
  if (response.headers["retry-after"] !== undefined) {
    headers["retry-after"] = response.headers["retry-after"]
  }
  return body.byteLength === 0
    ? HttpServerResponse.empty({ status: response.status, headers })
    : HttpServerResponse.uint8Array(new Uint8Array(body), {
      status: response.status,
      headers,
      contentType: response.headers["content-type"]
    })
}

// Counts bytes on the stream because only some platforms apply MaxBodySize to
// buffered reads.
const readBody = (
  request: HttpServerRequest.HttpServerRequest,
  limit: number
): Effect.Effect<Uint8Array | HttpServerResponse.HttpServerResponse> =>
  Effect.suspend(() => {
    const chunks: Array<Uint8Array> = []
    let size = 0
    return Stream.runForEachWhile(request.stream, (chunk) => {
      size += chunk.length
      if (size > limit) return Effect.succeed(false)
      chunks.push(chunk)
      return Effect.succeed(true)
    }).pipe(
      Effect.map(() => {
        if (size > limit) return HttpServerResponse.empty({ status: 413 })
        const body = new Uint8Array(size)
        let offset = 0
        for (const chunk of chunks) {
          body.set(chunk, offset)
          offset += chunk.length
        }
        return body
      }),
      Effect.catch(HttpServerRespondable.toResponse)
    )
  })
