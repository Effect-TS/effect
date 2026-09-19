import { assert, describe, it } from "@effect/vitest"
import { ConfigProvider, Effect, Layer, Option, type Tracer } from "effect"
import { TestClock } from "effect/testing"
import { HttpClient, HttpClientResponse } from "effect/unstable/http"
import { Otlp, OtlpExporter, OtlpSerialization, OtlpTracer } from "effect/unstable/observability"

describe("OtlpTracer", () => {
  it.effect.each(["traces", "combined"] as const)(
    "filters completed spans before buffering through the %s configuration layer",
    (kind) =>
      Effect.gen(function*() {
        const requests: Array<string> = []
        const seen: Array<{ name: string; status: Tracer.SpanStatus["_tag"] }> = []
        const filter = (span: Tracer.Span) => {
          seen.push({ name: span.name, status: span.status._tag })
          if (span.name === "filter-failure") throw new Error("filter failed")
          return span.name !== "discard"
        }
        const client = HttpClient.make((request) =>
          Effect.sync(() => {
            if (request.body._tag === "Uint8Array") {
              requests.push(new TextDecoder().decode(request.body.body))
            }
            return HttpClientResponse.fromWeb(request, new Response())
          })
        )
        const tracing = kind === "traces"
          ? OtlpTracer.layerFromConfig({ spanFilter: filter })
          : Otlp.layerFromConfig({ tracerSpanFilter: filter })

        yield* Effect.gen(function*() {
          const flusher = yield* OtlpExporter.Flusher
          const discarded = yield* Effect.currentSpan.pipe(Effect.withSpan("discard", { sampled: true }))
          yield* Effect.void.pipe(Effect.withSpan("unsampled", { sampled: false }))
          yield* flusher.flush
          yield* TestClock.adjust("1 second")

          assert.deepStrictEqual(requests, [])
          assert.deepStrictEqual(seen.map((span) => span.name), ["discard"])
          assert.strictEqual(discarded.status._tag, "Ended")
          assert.isTrue(discarded.sampled)

          const parent = yield* Effect.gen(function*() {
            const parent = yield* Effect.currentSpan
            const child = yield* Effect.currentSpan.pipe(Effect.withSpan("retained-child"))
            assert.strictEqual(child.traceId, parent.traceId)
            assert.strictEqual(Option.getOrThrow(child.parent).spanId, parent.spanId)
            assert.isTrue(child.sampled)
            yield* Effect.fail("failure").pipe(Effect.withSpan("retained-failure"), Effect.exit)
            yield* Effect.void.pipe(Effect.withSpan("filter-failure"))
            return parent
          }).pipe(Effect.withSpan("discard", { sampled: true }))
          yield* flusher.flush

          assert.strictEqual(parent.status._tag, "Ended")
          assert.isTrue(parent.sampled)
          assert.isTrue(seen.every((span) => span.status === "Ended"))
          assert.strictEqual(requests.length, 1)
          assert.notInclude(requests[0], "\"name\":\"discard\"")
          assert.notInclude(requests[0], "\"name\":\"unsampled\"")
          assert.include(requests[0], "\"name\":\"retained-child\"")
          assert.include(requests[0], "\"name\":\"retained-failure\"")
          assert.include(requests[0], "\"name\":\"filter-failure\"")
          assert.include(requests[0], "\"code\":2")
          assert.include(requests[0], `"parentSpanId":"${parent.spanId}"`)
        }).pipe(
          Effect.provide(tracing.pipe(
            Layer.provideMerge(OtlpExporter.layerFlusher),
            Layer.provide(OtlpSerialization.layerJson),
            Layer.provide(Layer.succeed(HttpClient.HttpClient, client)),
            Layer.provide(ConfigProvider.layer(ConfigProvider.fromUnknown({
              OTEL_SERVICE_NAME: "span-filter-test",
              OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: "http://collector.example/v1/traces",
              OTEL_TRACES_EXPORTER: "otlp",
              OTEL_BSP_SCHEDULE_DELAY: "1000"
            })))
          ))
        )
      })
  )
})
