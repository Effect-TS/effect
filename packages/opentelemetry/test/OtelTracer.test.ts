import * as NodeSdk from "@effect/opentelemetry/NodeSdk"
import * as OtelTracer from "@effect/opentelemetry/OtelTracer"
import { assert, describe, it } from "@effect/vitest"
import * as OtelApi from "@opentelemetry/api"
import { AsyncHooksContextManager } from "@opentelemetry/context-async-hooks"
import { InMemorySpanExporter, type ReadableSpan, SimpleSpanProcessor } from "@opentelemetry/sdk-trace-base"
import * as Cause from "effect/Cause"
import * as EffectContext from "effect/Context"
import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Fiber from "effect/Fiber"
import * as Option from "effect/Option"
import * as EffectTracer from "effect/Tracer"
import * as Version from "effect/Version"

const TracingLayer = NodeSdk.layer(Effect.sync(() => ({
  resource: {
    serviceName: "test"
  },
  spanProcessor: [new SimpleSpanProcessor(new InMemorySpanExporter())]
})))

// needed to test context propagation
const contextManager = new AsyncHooksContextManager()
OtelApi.context.setGlobalContextManager(contextManager.enable())

describe("Tracer", () => {
  it.effect("uses the shared Effect version as the tracer instrumentation scope", () => {
    const exporter = new InMemorySpanExporter()
    const layer = NodeSdk.layer(Effect.sync(() => ({
      resource: { serviceName: "test", serviceVersion: "service-version" },
      spanProcessor: [new SimpleSpanProcessor(exporter)]
    })))
    return Effect.gen(function*() {
      yield* Effect.void.pipe(Effect.withSpan("test"))
      const scope = exporter.getFinishedSpans()[0]!.instrumentationScope
      assert.strictEqual(scope.name, "effect")
      assert.strictEqual(scope.version, Version.getCurrentVersion())
    }).pipe(Effect.provide(layer))
  })

  describe("provided", () => {
    it.effect("withSpan", () =>
      Effect.gen(function*() {
        const span = yield* Effect.currentSpan
        assert.instanceOf(span, OtelTracer.OtelSpan)
      }).pipe(
        Effect.withSpan("ok"),
        Effect.provide(TracingLayer)
      ))

    it.effect("withSpan links", () =>
      Effect.gen(function*() {
        const linkedSpan = yield* Effect.makeSpanScoped("B")
        const span = yield* Effect.currentSpan.pipe(
          Effect.withSpan("A"),
          Effect.linkSpans(linkedSpan)
        )
        assert.instanceOf(span, OtelTracer.OtelSpan)
        assert.lengthOf(span.links, 1)
      }).pipe(
        Effect.provide(TracingLayer)
      ))

    it.effect("nested withSpan sets correct parent chain", () =>
      Effect.gen(function*() {
        const child = yield* Effect.currentSpan.pipe(
          Effect.withSpan("child"),
          Effect.withSpan("parent")
        )
        assert.instanceOf(child, OtelTracer.OtelSpan)
        assert.strictEqual(child.name, "child")
        assert.isDefined(child.parent)
        assert.strictEqual((child.parent.valueOrUndefined! as OtelTracer.OtelSpan).name, "parent")
      }).pipe(
        Effect.provide(TracingLayer)
      ))

    it.effect.each([undefined, false, true])(
      "withSpan uses the active OpenTelemetry parent with root %s",
      (root) =>
        Effect.gen(function*() {
          const parent: OtelApi.SpanContext = {
            traceId: "1".repeat(32),
            spanId: "2".repeat(16),
            traceFlags: OtelApi.TraceFlags.SAMPLED,
            traceState: OtelApi.createTraceState("vendor=value"),
            isRemote: false
          }
          const active = OtelApi.trace.setSpanContext(OtelApi.ROOT_CONTEXT, parent)
          const services = yield* Effect.context<never>()
          const child = yield* Effect.promise(() =>
            OtelApi.context.with(active, () =>
              Effect.runPromise(
                Effect.currentSpan.pipe(
                  Effect.withSpan("child", { root }),
                  Effect.provideContext(services)
                )
              ))
          )

          assert(child instanceof OtelTracer.OtelSpan)
          if (root === true) {
            assert.isTrue(Option.isNone(child.parent))
            assert.notStrictEqual(child.traceId, parent.traceId)
          } else {
            assert.strictEqual(child.traceId, parent.traceId)
            assert.isTrue(Option.isSome(child.parent))
            assert.strictEqual(Option.getOrThrow(child.parent).spanId, parent.spanId)
            assert.strictEqual(child.span.spanContext().traceState?.serialize(), "vendor=value")
          }
        }).pipe(Effect.provide(TracingLayer))
    )

    it.effect("withSpan uses an OpenTelemetry span started inside an Effect span as parent", () =>
      Effect.gen(function*() {
        const services = yield* Effect.context<never>()
        const [otelSpan, child] = yield* Effect.sync(() =>
          OtelApi.trace.getTracer("test").startActiveSpan("otel-span", (span) => {
            try {
              const child = Effect.runSync(
                Effect.currentSpan.pipe(
                  Effect.withSpan("child"),
                  Effect.provideContext(services)
                )
              )
              return [span.spanContext(), child] as const
            } finally {
              span.end()
            }
          })
        ).pipe(Effect.withSpan("outer"))

        assert(child instanceof OtelTracer.OtelSpan)
        assert.isTrue(Option.isSome(child.parent))
        assert.strictEqual(Option.getOrThrow(child.parent).spanId, otelSpan.spanId)
        assert.strictEqual(child.traceId, otelSpan.traceId)
      }).pipe(Effect.provide(TracingLayer)))

    it.effect("withSpan below a propagation-disabled span has no parent", () =>
      Effect.gen(function*() {
        const child = yield* Effect.currentSpan.pipe(
          Effect.withSpan("child"),
          Effect.withSpan("disabled", {
            annotations: EffectTracer.DisablePropagation.context(true)
          })
        )

        assert(child instanceof OtelTracer.OtelSpan)
        assert.isTrue(Option.isNone(child.parent))
      }).pipe(Effect.provide(TracingLayer)))

    it.effect("withSpan below a tracer-disabled span has no parent", () =>
      Effect.gen(function*() {
        const child = yield* Effect.currentSpan.pipe(
          Effect.withSpan("child"),
          Effect.withTracerEnabled(true),
          Effect.withSpan("disabled"),
          Effect.withTracerEnabled(false)
        )

        assert(child instanceof OtelTracer.OtelSpan)
        assert.isTrue(Option.isNone(child.parent))
      }).pipe(Effect.provide(TracingLayer)))

    it.effect("withSpan does not inherit the span of the fiber that resumed it", () =>
      Effect.gen(function*() {
        const deferred = yield* Deferred.make<void>()
        const worker = yield* Deferred.await(deferred).pipe(
          Effect.andThen(Effect.currentSpan.pipe(Effect.withSpan("worker"))),
          Effect.forkChild({ startImmediately: true })
        )
        const waker = yield* Deferred.succeed(deferred, void 0).pipe(
          Effect.andThen(Effect.currentSpan),
          Effect.withSpan("waker")
        )
        const child = yield* Fiber.join(worker)

        assert(child instanceof OtelTracer.OtelSpan)
        assert.isTrue(Option.isNone(child.parent))
        assert.notStrictEqual(child.traceId, waker.traceId)
      }).pipe(Effect.provide(TracingLayer)))

    it.effect("withSpan in an Effect run started inside a traced effect has no parent", () =>
      Effect.gen(function*() {
        const services = yield* Effect.context<never>()
        const [outer, child] = yield* Effect.gen(function*() {
          const outer = yield* Effect.currentSpan
          const child = yield* Effect.promise(() =>
            Effect.runPromise(
              Effect.currentSpan.pipe(
                Effect.withSpan("child"),
                Effect.provideContext(services)
              )
            )
          )
          return [outer, child] as const
        }).pipe(Effect.withSpan("outer"))

        assert(child instanceof OtelTracer.OtelSpan)
        assert.isTrue(Option.isNone(child.parent))
        assert.notStrictEqual(child.traceId, outer.traceId)
      }).pipe(Effect.provide(TracingLayer)))

    it.effect("withSpan in an Effect run started from a timer set inside a span has no parent", () =>
      Effect.gen(function*() {
        const services = yield* Effect.context<never>()
        const [outer, child] = yield* Effect.gen(function*() {
          const outer = yield* Effect.currentSpan
          const child = yield* Effect.promise(() =>
            new Promise<EffectTracer.Span>((resolve, reject) => {
              setTimeout(() => {
                Effect.runPromise(
                  Effect.currentSpan.pipe(
                    Effect.withSpan("child"),
                    Effect.provideContext(services)
                  )
                ).then(resolve, reject)
              }, 0)
            })
          )
          return [outer, child] as const
        }).pipe(Effect.withSpan("outer"))

        assert(child instanceof OtelTracer.OtelSpan)
        assert.isTrue(Option.isNone(child.parent))
        assert.notStrictEqual(child.traceId, outer.traceId)
      }).pipe(Effect.provide(TracingLayer)))

    it.effect.each([
      {
        name: "DisablePropagation",
        disable: Effect.withSpan("disabled", {
          annotations: EffectTracer.DisablePropagation.context(true)
        })
      },
      {
        name: "withTracerEnabled(false)",
        disable: <A, E, R>(self: Effect.Effect<A, E, R>) =>
          self.pipe(Effect.withSpan("disabled"), Effect.withTracerEnabled(false))
      }
    ])(
      "raw OpenTelemetry span below a $name span uses the nearest propagated parent",
      ({ disable }) =>
        Effect.gen(function*() {
          const parent = yield* Effect.currentSpan
          const tracer = yield* OtelTracer.OtelTracer
          const raw = yield* Effect.sync(() => {
            const span = tracer.startSpan("raw")
            span.end()
            return span as unknown as ReadableSpan
          }).pipe(disable)

          assert.strictEqual(raw.spanContext().traceId, parent.traceId)
          assert.strictEqual(raw.parentSpanContext?.spanId, parent.spanId)
        }).pipe(Effect.withSpan("parent"), Effect.provide(TracingLayer))
    )

    it.effect("supervisor sets context", () =>
      Effect.sync(() => {
        const context = OtelApi.context.active()
        assert.isDefined(OtelApi.trace.getSpan(context))
      }).pipe(
        Effect.withSpan("ok"),
        Effect.provide(TracingLayer)
      ))

    it.effect("supervisor sets context generator", () =>
      Effect.gen(function*() {
        yield* Effect.yieldNow
        const context = OtelApi.context.active()
        assert.isDefined(OtelApi.trace.getSpan(context))
      }).pipe(
        Effect.withSpan("ok"),
        Effect.provide(TracingLayer)
      ))

    it.effect("currentOtelSpan", () =>
      Effect.gen(function*() {
        const span = yield* Effect.currentSpan
        const otelSpan = yield* OtelTracer.currentOtelSpan
        assert.strictEqual((span as OtelTracer.OtelSpan).span, otelSpan)
      }).pipe(
        Effect.withSpan("ok"),
        Effect.provide(TracingLayer)
      ))

    it.effect.each([OtelApi.SpanStatusCode.UNSET, OtelApi.SpanStatusCode.OK])(
      "honors non-error wrapper status %s",
      (status) =>
        Effect.gen(function*() {
          const span = yield* Effect.currentSpan
          const wrapper = yield* OtelTracer.currentOtelSpan
          wrapper.setStatus({ code: status })
          wrapper.end()
          assert.strictEqual(span.status._tag, "Ended")
          if (span.status._tag === "Ended") {
            assert.strictEqual(span.status.exit._tag, "Success")
          }
        }).pipe(Effect.withSpan("repro"))
    )

    it.effect("honors an error wrapper status", () =>
      Effect.gen(function*() {
        const span = yield* Effect.currentSpan
        const wrapper = yield* OtelTracer.currentOtelSpan
        wrapper.setStatus({ code: OtelApi.SpanStatusCode.ERROR })
        wrapper.end()
        assert.strictEqual(span.status._tag, "Ended")
        if (span.status._tag === "Ended") {
          assert.strictEqual(span.status.exit._tag, "Failure")
        }
      }).pipe(Effect.withSpan("repro")))

    it.effect("preserves the sampling decision of generic external spans", () =>
      Effect.gen(function*() {
        const span = yield* Effect.currentSpan
        assert.instanceOf(span, OtelTracer.OtelSpan)
        assert.strictEqual(span.span.spanContext().traceFlags, OtelApi.TraceFlags.NONE)
      }).pipe(
        Effect.withSpan("child"),
        Effect.withParentSpan(EffectTracer.externalSpan({
          traceId: "1".repeat(32),
          spanId: "2".repeat(16),
          sampled: false
        })),
        Effect.provide(TracingLayer)
      ))

    it("preserves trace state and locality on an active OpenTelemetry parent", () => {
      const parent: OtelApi.SpanContext = {
        traceId: "1".repeat(32),
        spanId: "2".repeat(16),
        traceFlags: OtelApi.TraceFlags.SAMPLED,
        traceState: OtelApi.createTraceState("vendor=value"),
        isRemote: false
      }
      const active = OtelApi.trace.setSpanContext(OtelApi.ROOT_CONTEXT, parent)
      let receivedParent: OtelApi.SpanContext | undefined
      const tracer = {
        startSpan(_name: string, _options: unknown, context: OtelApi.Context) {
          receivedParent = OtelApi.trace.getSpanContext(context)
          return {
            spanContext: () => ({
              traceId: "3".repeat(32),
              spanId: "4".repeat(16),
              traceFlags: OtelApi.TraceFlags.SAMPLED
            })
          } as OtelApi.Span
        }
      } as OtelApi.Tracer

      const child = new OtelTracer.OtelSpan(
        { active: () => active } as OtelApi.ContextAPI,
        OtelApi.trace,
        tracer,
        {
          name: "child",
          parent: Option.none(),
          annotations: EffectContext.empty(),
          links: [],
          startTime: 0n,
          kind: "internal",
          root: false,
          sampled: true
        }
      )

      assert.instanceOf(child, OtelTracer.OtelSpan)
      assert.deepStrictEqual(
        [receivedParent?.traceState?.serialize(), receivedParent?.isRemote],
        ["vendor=value", false]
      )
    })

    it.effect("records every pretty error", () =>
      Effect.gen(function*() {
        const exporter = new InMemorySpanExporter()
        const spanProcessor = new SimpleSpanProcessor(exporter)
        const firstFailure = Cause.fail(new Error("first"))
        const secondFailure = Cause.fail(new Error("second"))
        const cause = Cause.combine(firstFailure, secondFailure)

        yield* Effect.failCause(cause).pipe(
          Effect.withSpan("error-span"),
          Effect.andThen(Effect.never), // keep the exporter alive
          Effect.provide(NodeSdk.layer(() => ({
            resource: {
              serviceName: "test"
            },
            spanProcessor: [spanProcessor]
          }))),
          Effect.forkChild({ startImmediately: true })
        )

        const spanData = exporter.getFinishedSpans()[0]
        if (spanData === undefined) {
          return yield* Effect.die("Missing span data")
        }
        const exceptionEvents = spanData.events.filter((event) => event.name === "exception")
        assert.lengthOf(exceptionEvents, 2)
        assert.strictEqual(spanData.status.message, "first")
      }))

    it.effect("renders nested error causes in the stacktrace", () =>
      Effect.gen(function*() {
        const exporter = new InMemorySpanExporter()
        const spanProcessor = new SimpleSpanProcessor(exporter)
        const error = new Error("outer failure", { cause: new Error("inner cause") })

        yield* Effect.die(error).pipe(
          Effect.withSpan("error-span"),
          Effect.andThen(Effect.never), // keep the exporter alive
          Effect.provide(NodeSdk.layer(() => ({
            resource: {
              serviceName: "test"
            },
            spanProcessor: [spanProcessor]
          }))),
          Effect.forkChild({ startImmediately: true })
        )

        const spanData = exporter.getFinishedSpans()[0]
        if (spanData === undefined) {
          return yield* Effect.die("Missing span data")
        }
        const exceptionEvent = spanData.events.find((event) => event.name === "exception")
        assert(exceptionEvent !== undefined)
        const stacktrace = exceptionEvent.attributes?.["exception.stacktrace"]
        assert.isString(stacktrace)
        assert.include(stacktrace as string, "[cause]: Error: inner cause")
      }))

    it.effect("leaves interruption Unset with effect.fiber.interrupted", () => {
      const exporter = new InMemorySpanExporter()
      return Effect.gen(function*() {
        const span = yield* Effect.makeSpan("test")
        span.end(span.status.startTime + 1n, Exit.interrupt())
        const spans = exporter.getFinishedSpans()
        assert.lengthOf(spans, 1)
        assert.deepStrictEqual(spans[0].status, { code: OtelApi.SpanStatusCode.UNSET })
        assert.deepStrictEqual(spans[0].events, [])
        assert.deepStrictEqual(spans[0].attributes, { "effect.fiber.interrupted": true })
      }).pipe(Effect.provide(NodeSdk.layer(() => ({
        resource: { serviceName: "test" },
        spanProcessor: [new SimpleSpanProcessor(exporter)]
      }))))
    })
    it.effect("exports homogeneous primitive arrays as array attributes", () =>
      Effect.gen(function*() {
        const exporter = new InMemorySpanExporter()
        const spanProcessor = new SimpleSpanProcessor(exporter)

        yield* Effect.void.pipe(
          Effect.withSpan("array-span", {
            attributes: {
              strings: ["a", "b"],
              numbers: [1, 2],
              booleans: [true, false],
              mixed: [1, "a"]
            }
          }),
          Effect.andThen(Effect.never), // keep the exporter alive
          Effect.provide(NodeSdk.layer(() => ({
            resource: {
              serviceName: "test"
            },
            spanProcessor: [spanProcessor]
          }))),
          Effect.forkChild({ startImmediately: true })
        )

        const spanData = exporter.getFinishedSpans()[0]
        if (spanData === undefined) {
          return yield* Effect.die("Missing span data")
        }
        assert.deepStrictEqual(spanData.attributes.strings, ["a", "b"])
        assert.deepStrictEqual(spanData.attributes.numbers, [1, 2])
        assert.deepStrictEqual(spanData.attributes.booleans, [true, false])
        assert.isString(spanData.attributes.mixed)
      }))

    it.effect("withSpanContext", () =>
      Effect.gen(function*() {
        const effect = Effect.gen(function*() {
          const span = yield* Effect.currentParentSpan
          assert(span._tag === "Span")
          if (span.parent._tag === "None") {
            return yield* Effect.die("No parent span")
          }
          return span.parent.value
        }).pipe(Effect.withSpan("child"))

        const services = yield* Effect.context<never>()

        yield* Effect.promise(async () => {
          await OtelApi.trace.getTracer("test").startActiveSpan("otel-span", {
            root: true,
            attributes: { "root": "yes" }
          }, async (span) => {
            try {
              const parent = await effect.pipe(
                OtelTracer.withSpanContext(span.spanContext()),
                Effect.provideContext(services),
                Effect.runPromise
              )
              const { spanId, traceId } = span.spanContext()
              assert.containsSubset(parent, {
                spanId,
                traceId
              })
            } finally {
              span.end()
            }
          })
        })
      }).pipe(
        Effect.provide(TracingLayer)
      ))
  })

  describe("not provided", () => {
    it.effect("withSpan", () =>
      Effect.gen(function*() {
        const span = yield* Effect.currentSpan
        assert.notInstanceOf(span, OtelTracer.OtelSpan)
      }).pipe(
        Effect.withSpan("ok")
      ))
  })
})
