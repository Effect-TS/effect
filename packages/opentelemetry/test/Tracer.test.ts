import { currentOtelSpan, OtelSpan } from "@effect/opentelemetry/internal/tracer"
import * as NodeSdk from "@effect/opentelemetry/NodeSdk"
import * as it from "@effect/opentelemetry/test/utils/extend"
import * as OtelApi from "@opentelemetry/api"
import { AsyncHooksContextManager } from "@opentelemetry/context-async-hooks"
import { InMemorySpanExporter, SimpleSpanProcessor } from "@opentelemetry/sdk-trace-base"
import * as Effect from "effect/Effect"
import { assert, describe, expect } from "vitest"

const TracingLive = NodeSdk.layer(Effect.sync(() => ({
  resource: {
    serviceName: "test"
  },
  spanProcessor: new SimpleSpanProcessor(new InMemorySpanExporter())
})))

// needed to test context propagation
const contextManager = new AsyncHooksContextManager()
OtelApi.context.setGlobalContextManager(contextManager)

describe("Tracer", () => {
  describe("provided", () => {
    it.effect("withSpan", () =>
      Effect.provide(
        Effect.withSpan("ok")(
          Effect.gen(function*(_) {
            const span = yield* _(Effect.currentSpan)
            expect(span).instanceOf(OtelSpan)
          })
        ),
        TracingLive
      ))

    it.effect("withSpan links", () =>
      Effect.gen(function*(_) {
        const linkedSpan = yield* _(Effect.makeSpanScoped("B"))
        const span = yield* _(
          Effect.currentSpan,
          Effect.withSpan("A"),
          Effect.linkSpans(linkedSpan)
        )
        assert(span instanceof OtelSpan)
        expect(span.links.length).toBe(1)
      }).pipe(
        Effect.scoped,
        Effect.provide(TracingLive)
      ))

    it.effect("supervisor sets context", () =>
      Effect.provide(
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
        Effect.provide(TracingLive)
      ))

    it.effect("currentOtelSpan", () =>
      Effect.provide(
        Effect.withSpan("ok")(
          Effect.gen(function*(_) {
            const span = yield* _(Effect.currentSpan)
            const otelSpan = yield* _(currentOtelSpan)
            expect((span as OtelSpan).span).toBe(otelSpan)
          })
        ),
        TracingLive
      ))
  })

  describe("not provided", () => {
    it.effect("withSpan", () =>
      Effect.withSpan("ok")(
        Effect.gen(function*(_) {
          const span = yield* _(Effect.currentSpan)
          expect(span).not.instanceOf(OtelSpan)
        })
      ))
  })
})
