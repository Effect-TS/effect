import { assert, describe, it } from "@effect/vitest"
import { Cause, ConfigProvider, Effect, Exit, Layer, Tracer } from "effect"
import { HttpClient, HttpClientResponse } from "effect/http"
import type { HttpClientError } from "effect/http"
import { OtlpExporter, OtlpSerialization, OtlpTracer } from "effect/observability"
import * as Version from "effect/Version"

const url = "http://localhost:4318/v1/traces"

const tracerLayer = (sampler?: Parameters<typeof OtlpTracer.layer>[0]["sampler"]) =>
  OtlpTracer.layer({
    url,
    resource: { serviceName: "test", serviceVersion: "service-version" },
    exportInterval: "1 hour",
    sampler
  })

const capture = (tracer = tracerLayer()) => {
  const exports: Array<{
    scope: { name: string; version: string }
    spans: Array<{ name: string; traceId: string; links: Array<{ traceId: string }> }>
  }> = []
  const httpClient = HttpClient.makeWith(
    Effect.fnUntraced(function*(requestEffect) {
      const request = yield* requestEffect
      assert(request.body._tag === "Uint8Array")
      const body = JSON.parse(new TextDecoder().decode(request.body.body))
      exports.push(body.resourceSpans[0].scopeSpans[0])
      return HttpClientResponse.fromWeb(request, new Response())
    }),
    Effect.succeed as HttpClient.HttpClient.Preprocess<HttpClientError.HttpClientError, never>
  )
  const layer = tracer.pipe(
    Layer.provide(OtlpSerialization.layerJson),
    Layer.provide(Layer.succeed(HttpClient.HttpClient, httpClient))
  )
  const exportedNames = (): ReadonlyArray<string> => exports.flatMap((_) => _.spans.map((span) => span.name))
  return { exports, exportedNames, layer }
}

const layerFromEnv = (env: Record<string, string>) =>
  OtlpTracer.layerFromConfig().pipe(
    Layer.provide(ConfigProvider.layer(ConfigProvider.fromEnv({
      env: {
        OTEL_SERVICE_NAME: "test",
        OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: url,
        OTEL_TRACES_EXPORTER: "otlp",
        OTEL_BSP_SCHEDULE_DELAY: "3600000",
        ...env
      }
    })))
  )

// Ends a root span with a local child, and a span continued from a sampled
// remote parent.
const emitSpans = Effect.gen(function*() {
  const parent = Tracer.externalSpan({ traceId: "0af7651916cd43dd8448eb211c80319c", spanId: "b7ad6b7169203331" })
  yield* Effect.void.pipe(Effect.withSpan("local"), Effect.withSpan("root"))
  yield* Effect.void.pipe(Effect.withSpan("remote", { parent }))
  yield* (yield* OtlpExporter.Flusher).flush
})

describe("OtlpTracer", () => {
  it.effect("uses effect as the instrumentation scope, not the service name", () => {
    const { exports, layer } = capture()
    return Effect.gen(function*() {
      yield* Effect.void.pipe(Effect.withSpan("test"))
      yield* (yield* OtlpExporter.Flusher).flush
      assert.deepStrictEqual(exports[0].scope, { name: "effect", version: Version.getCurrentVersion() })
    }).pipe(Effect.provide(layer))
  })

  it.effect("pads 64-bit trace ids in spans and links", () => {
    const { exports, layer } = capture()
    const parent = Tracer.externalSpan({ traceId: "463ac35c9f6413ad", spanId: "0020000000000001" })
    return Effect.gen(function*() {
      yield* Effect.void.pipe(Effect.withSpan("test", { parent, links: [{ span: parent, attributes: {} }] }))
      yield* (yield* OtlpExporter.Flusher).flush
      assert.strictEqual(exports[0].spans[0].traceId, "0000000000000000463ac35c9f6413ad")
      assert.strictEqual(exports[0].spans[0].links[0].traceId, "0000000000000000463ac35c9f6413ad")
    }).pipe(Effect.provide(layer))
  })

  describe("sampler", () => {
    it.effect("samples by the last 56 bits of the trace ID", () => {
      const { exportedNames, layer } = capture(tracerLayer({ ratio: 0.5, parentBased: false }))
      return Effect.gen(function*() {
        for (
          const [name, traceId] of [
            ["below", "ffffffffffffffffff7fffffffffffff"],
            ["at", "00000000000000000080000000000000"]
          ]
        ) {
          const parent = Tracer.externalSpan({ traceId, spanId: "0000000000000001" })
          yield* Effect.void.pipe(Effect.withSpan(name, { parent }))
        }
        yield* (yield* OtlpExporter.Flusher).flush
        assert.deepStrictEqual(exportedNames(), ["at"])
      }).pipe(Effect.provide(layer))
    })

    const all = ["local", "root", "remote"]
    for (
      const [env, expected] of [
        [{ OTEL_TRACES_SAMPLER: "always_on" }, all],
        [{ OTEL_TRACES_SAMPLER: "always_off" }, []],
        [{ OTEL_TRACES_SAMPLER: "traceidratio" }, all],
        [{ OTEL_TRACES_SAMPLER: "traceidratio", OTEL_TRACES_SAMPLER_ARG: "0" }, []],
        [{ OTEL_TRACES_SAMPLER: "parentbased_always_on" }, all],
        [{ OTEL_TRACES_SAMPLER: "parentbased_always_off" }, ["remote"]],
        [{ OTEL_TRACES_SAMPLER: "parentbased_traceidratio", OTEL_TRACES_SAMPLER_ARG: "0" }, ["remote"]]
      ] as const
    ) {
      const name = Object.entries(env).map(([key, value]) => `${key}=${value}`).join(" ")
      it.effect(`follows ${name}`, () => {
        const { exportedNames, layer } = capture(layerFromEnv(env))
        return Effect.gen(function*() {
          yield* emitSpans
          assert.deepStrictEqual(exportedNames(), expected)
        }).pipe(Effect.provide(layer))
      })
    }

    for (
      const [variable, env] of [
        ["OTEL_TRACES_SAMPLER", { OTEL_TRACES_SAMPLER: "jaeger_remote" }],
        ["OTEL_TRACES_SAMPLER_ARG", { OTEL_TRACES_SAMPLER: "traceidratio", OTEL_TRACES_SAMPLER_ARG: "1.5" }]
      ] as const
    ) {
      it.effect(`fails on an unsupported ${variable}`, () =>
        Effect.gen(function*() {
          const exit = yield* Effect.exit(Layer.build(capture(layerFromEnv(env)).layer))
          assert(Exit.isFailure(exit))
          assert.include(Cause.pretty(exit.cause), `at ["${variable}"]`)
        }))
    }
  })
})
