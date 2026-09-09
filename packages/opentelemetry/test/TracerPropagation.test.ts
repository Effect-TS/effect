import * as Resource from "@effect/opentelemetry/Resource"
import * as Tracer from "@effect/opentelemetry/Tracer"
import { assert, describe, it } from "@effect/vitest"
import * as OtelApi from "@opentelemetry/api"
import { AsyncHooksContextManager } from "@opentelemetry/context-async-hooks"
import { InMemorySpanExporter, SimpleSpanProcessor } from "@opentelemetry/sdk-trace-base"
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as EffectTracer from "effect/Tracer"
import { afterEach, beforeEach } from "vitest"

const TracingLive = Tracer.layerGlobal.pipe(
  Layer.provide(Resource.layer({ serviceName: "propagation-test" }))
)

const unnamed = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  Effect.fn(function*() {
    return yield* effect
  })()

const disabled = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  effect.pipe(Effect.withSpan("disabled", { context: EffectTracer.DisablePropagation.context(true) }))

const tracerDisabled = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  effect.pipe(Effect.withSpan("tracer-disabled"), Effect.withTracerEnabled(false))

const skipped = [
  ["unnamed Effect.fn", unnamed],
  ["DisablePropagation", disabled],
  ["withTracerEnabled(false)", tracerDisabled],
  [
    "nested skipped spans",
    <A, E, R>(effect: Effect.Effect<A, E, R>) => unnamed(disabled(tracerDisabled(unnamed(effect))))
  ]
] as const

// These tests own the global OTel registrations and must not run concurrently.
describe.sequential("Tracer propagation", () => {
  let exporter: InMemorySpanExporter
  let provider: NodeTracerProvider

  beforeEach(() => {
    OtelApi.trace.disable()
    OtelApi.context.disable()
    OtelApi.propagation.disable()
    exporter = new InMemorySpanExporter()
    provider = new NodeTracerProvider({ spanProcessors: [new SimpleSpanProcessor(exporter)] })
    provider.register({ contextManager: new AsyncHooksContextManager() })
  })

  afterEach(async () => {
    try {
      await provider.shutdown()
    } finally {
      OtelApi.trace.disable()
      OtelApi.context.disable()
      OtelApi.propagation.disable()
    }
  })

  const rawChild = Effect.gen(function*() {
    yield* Effect.yieldNow()
    const child = OtelApi.trace.getTracer("third-party").startSpan("query")
    child.end()
    return child.spanContext()
  })

  for (
    const [name, wrap] of [
      ["Effect.fnUntraced", <A, E, R>(effect: Effect.Effect<A, E, R>) =>
        Effect.fnUntraced(function*() {
          return yield* effect
        })()],
      ...skipped
    ] as const
  ) {
    it.effect(`raw OTel child uses propagated parent through ${name}`, () =>
      Effect.gen(function*() {
        const parent = yield* Effect.currentSpan
        const child = yield* wrap(rawChild)
        const exported = exporter.getFinishedSpans()
        assert.lengthOf(exported, 1)
        assert.strictEqual(exported[0].name, "query")
        assert.strictEqual(child.traceId, parent.traceId)
        assert.strictEqual(exported[0].parentSpanContext?.spanId, parent.spanId)
      }).pipe(Effect.withSpan("parent"), Effect.provide(TracingLive)))

    it.effect(`currentOtelSpan uses propagated parent through ${name}`, () =>
      Effect.gen(function*() {
        const parent = yield* Tracer.currentOtelSpan
        const current = yield* wrap(Tracer.currentOtelSpan)
        assert.deepStrictEqual(current.spanContext(), parent.spanContext())
        assert.strictEqual(current, parent)
      }).pipe(Effect.withSpan("parent"), Effect.provide(TracingLive)))
  }

  for (const [name, wrap] of skipped) {
    it.effect(`raw OTel child starts a root with no propagated parent through ${name}`, () =>
      Effect.gen(function*() {
        const { active, child } = yield* wrap(Effect.gen(function*() {
          yield* Effect.yieldNow()
          const active = OtelApi.trace.getSpanContext(OtelApi.context.active())
          const child = yield* rawChild
          return { active, child }
        }))
        assert.isTrue(OtelApi.isSpanContextValid(child))
        const exported = exporter.getFinishedSpans()
        assert.lengthOf(exported, 1)
        assert.isUndefined(exported[0].parentSpanContext)
        assert.isUndefined(active)
      }).pipe(Effect.provide(TracingLive)))

    it.effect(`currentOtelSpan fails with no propagated parent through ${name}`, () =>
      Effect.gen(function*() {
        const result = yield* wrap(Tracer.currentOtelSpan).pipe(Effect.either)
        assert.strictEqual(result._tag, "Left")
        if (result._tag === "Left") {
          assert.strictEqual(result.left._tag, "NoSuchElementException")
        }
      }).pipe(Effect.provide(TracingLive)))
  }

  it.effect("named Effect.fn remains the parent of raw OTel children and currentOtelSpan", () =>
    Effect.gen(function*() {
      const outer = yield* Effect.currentSpan
      yield* Effect.fn("named")(function*() {
        const parent = yield* Effect.currentSpan
        const current = yield* Tracer.currentOtelSpan
        const child = yield* rawChild
        assert.notStrictEqual(parent.spanId, outer.spanId)
        assert.strictEqual(parent.traceId, outer.traceId)
        assert.strictEqual(current.spanContext().spanId, parent.spanId)
        assert.strictEqual(child.traceId, parent.traceId)
        assert.strictEqual(exporter.getFinishedSpans()[0].parentSpanContext?.spanId, parent.spanId)
      })()
    }).pipe(Effect.withSpan("parent"), Effect.provide(TracingLive)))
})
