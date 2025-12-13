import * as NodeSdk from "@effect/opentelemetry/NodeSdk"
import * as OtlpTracer from "@effect/opentelemetry/OtlpTracer"
import * as Tracer from "@effect/opentelemetry/Tracer"
import { HttpClient } from "@effect/platform"
import { assert, describe, expect, it } from "@effect/vitest"
import * as OtelApi from "@opentelemetry/api"
import { AsyncHooksContextManager } from "@opentelemetry/context-async-hooks"
import { InMemorySpanExporter, SimpleSpanProcessor } from "@opentelemetry/sdk-trace-base"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Runtime from "effect/Runtime"
import { OtelSpan } from "../src/internal/tracer.js"

const TracingLive = NodeSdk.layer(Effect.sync(() => ({
  resource: {
    serviceName: "test"
  },
  spanProcessor: [new SimpleSpanProcessor(new InMemorySpanExporter())]
})))

// needed to test context propagation
const contextManager = new AsyncHooksContextManager()
OtelApi.context.setGlobalContextManager(contextManager)

describe("Tracer", () => {
  describe("provided", () => {
    it.effect("withSpan", () =>
      Effect.provide(
        Effect.withSpan("ok")(
          Effect.gen(function*() {
            const span = yield* Effect.currentSpan
            expect(span).instanceOf(OtelSpan)
          })
        ),
        TracingLive
      ))

    it.effect("withSpan links", () =>
      Effect.gen(function*() {
        const linkedSpan = yield* Effect.makeSpanScoped("B")
        const span = yield* Effect.currentSpan.pipe(
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
      Effect.gen(function*() {
        yield* Effect.yieldNow()
        expect(OtelApi.trace.getSpan(OtelApi.context.active())).toBeDefined()
      }).pipe(
        Effect.withSpan("ok"),
        Effect.provide(TracingLive)
      ))

    it.effect("currentOtelSpan", () =>
      Effect.provide(
        Effect.withSpan("ok")(
          Effect.gen(function*() {
            const span = yield* Effect.currentSpan
            const otelSpan = yield* Tracer.currentOtelSpan
            expect((span as OtelSpan).span).toBe(otelSpan)
          })
        ),
        TracingLive
      ))

    it.scoped("withSpanContext", () =>
      Effect.gen(function*() {
        const effect = Effect.gen(function*() {
          const span = yield* Effect.currentParentSpan
          assert(span._tag === "Span")
          const parent = yield* span.parent
          return parent
        }).pipe(Effect.withSpan("child"))

        const runtime = yield* Effect.runtime()

        yield* Effect.promise(async () => {
          await OtelApi.trace.getTracer("test").startActiveSpan("otel-span", {
            root: true,
            attributes: { "root": "yes" }
          }, async (span) => {
            try {
              const parent = await Runtime.runPromise(
                runtime,
                Tracer.withSpanContext(
                  effect,
                  span.spanContext()
                )
              )
              const { spanId, traceId } = span.spanContext()
              expect(parent).toMatchObject({
                spanId,
                traceId
              })
            } finally {
              span.end()
            }
          })
        })
      }).pipe(Effect.provide(TracingLive)))
  })

  describe("not provided", () => {
    it.effect("withSpan", () =>
      Effect.withSpan("ok")(
        Effect.gen(function*() {
          const span = yield* Effect.currentSpan
          expect(span).not.instanceOf(OtelSpan)
        })
      ))
  })

  describe("OTLP tracer", () => {
    const MockHttpClient = Layer.succeed(
      HttpClient.HttpClient,
      HttpClient.make(() => Effect.die("mock http client"))
    )
    const OtlpTracingLive = OtlpTracer.layer({
      url: "http://localhost:4318/v1/traces",
      resource: {
        serviceName: "test-otlp"
      }
    }).pipe(Layer.provide(MockHttpClient))

    it.effect("currentOtelSpan works with OTLP tracer", () =>
      Effect.provide(
        Effect.withSpan("ok")(
          Effect.gen(function*() {
            const span = yield* Effect.currentSpan
            const otelSpan = yield* Tracer.currentOtelSpan
            const spanContext = otelSpan.spanContext()
            expect(spanContext.traceId).toBe(span.traceId)
            expect(spanContext.spanId).toBe(span.spanId)
            expect(spanContext.traceFlags).toBe(OtelApi.TraceFlags.SAMPLED)
            expect(spanContext.isRemote).toBe(false)
            expect(otelSpan.isRecording()).toBe(true)

            // it should proxy attribute changes
            otelSpan.setAttribute("key", "value")
            expect(span.attributes.get("key")).toEqual("value")
          })
        ),
        OtlpTracingLive
      ))
  })
})
