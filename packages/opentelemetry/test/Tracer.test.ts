import { identity } from "@effect/data/Function"
import * as Effect from "@effect/io/Effect"
import * as Layer from "@effect/io/Layer"
import { OtelSpan } from "@effect/opentelemetry/internal/tracer"
import * as NodeSdk from "@effect/opentelemetry/NodeSdk"
import * as Resource from "@effect/opentelemetry/Resource"
import * as it from "@effect/opentelemetry/test/utils/extend"
import * as Tracer from "@effect/opentelemetry/Tracer"
import * as OtelApi from "@opentelemetry/api"
import { InMemorySpanExporter } from "@opentelemetry/sdk-trace-base"

const TracingLive = Layer.provide(
  Resource.layer({ serviceName: "test" }),
  Layer.merge(
    Tracer.layer,
    NodeSdk.layer(Effect.sync(() =>
      NodeSdk.config({
        traceExporter: new InMemorySpanExporter()
      })
    ))
  )
)

describe("Tracer", () => {
  describe("provided", () => {
    it.effect("withSpan", () =>
      Effect.provideLayer(
        Effect.withSpan("ok")(
          Effect.gen(function*(_) {
            const span = yield* _(Effect.flatMap(Effect.currentSpan, identity))
            expect(span).instanceOf(OtelSpan)
          })
        ),
        TracingLive
      ))

    it.effect("withSpan links", () =>
      Effect.gen(function*(_) {
        const linkedSpan = yield* _(Effect.useSpanScoped("B"))
        const span = yield* _(
          Effect.currentSpan,
          Effect.flatten,
          Effect.withSpan("A"),
          Effect.linkSpans(linkedSpan)
        )
        expect(span).instanceOf(OtelSpan)
        const otelSpan = span as OtelSpan
        expect(otelSpan.links.length).toBe(1)
      }).pipe(
        Effect.scoped,
        Effect.provideLayer(TracingLive)
      ))

    it.effect("supervisor sets context", () =>
      Effect.provideLayer(
        Effect.withSpan("ok")(
          Effect.sync(() => {
            expect(OtelApi.trace.getSpan(OtelApi.context.active())).toBeDefined()
          })
        ),
        TracingLive
      ))

    it.effect("supervisor sets context generator", () =>
      Effect.gen(function*(_) {
        yield* _(Effect.yieldNow())
        expect(OtelApi.trace.getSpan(OtelApi.context.active())).toBeDefined()
      }).pipe(
        Effect.withSpan("ok"),
        Effect.provideLayer(TracingLive)
      ))
  })

  describe("not provided", () => {
    it.effect("withSpan", () =>
      Effect.withSpan("ok")(
        Effect.gen(function*(_) {
          const span = yield* _(Effect.flatMap(Effect.currentSpan, identity))
          expect(span).not.instanceOf(OtelSpan)
        })
      ))
  })
})
