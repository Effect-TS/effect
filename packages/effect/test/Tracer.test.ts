import { describe, it } from "@effect/vitest"
import { assertInclude, assertNone, assertTrue, deepStrictEqual, strictEqual } from "@effect/vitest/utils"
import { Cause, Context, Duration, Effect, Fiber, FiberId, Layer, Option, pipe, TestClock, Tracer } from "effect"
import type { Span } from "effect/Tracer"
import type { NativeSpan } from "../src/internal/tracer.js"

describe("Tracer", () => {
  it.effect("includes trace when errored", () =>
    Effect.gen(function*() {
      let maybeSpan: undefined | Span
      const getSpan = Effect.functionWithSpan({
        body: (_id: string) =>
          Effect.currentSpan.pipe(Effect.flatMap((span) => {
            maybeSpan = span
            return Effect.fail("error")
          })),
        options: (id) => ({
          name: `span-${id}`,
          attributes: { id }
        })
      })
      yield* Effect.flip(getSpan("fail"))
      assertTrue(maybeSpan !== undefined)
      assertInclude(maybeSpan!.attributes.get("code.stacktrace") as string, "Tracer.test.ts:22:26")
    }))

  it.effect("captures stack", () =>
    Effect.gen(function*() {
      const cause = yield* Effect.die(new Error("boom")).pipe(
        Effect.withSpan("C", { context: Tracer.DisablePropagation.context(true) }),
        Effect.sandbox,
        Effect.flip
      )
      assertInclude(Cause.pretty(cause), "Tracer.test.ts:29:39")
    }))

  describe("withSpan", () => {
    it.effect("no parent", () =>
      Effect.gen(function*() {
        const span = yield* Effect.withSpan("A")(Effect.currentSpan)
        deepStrictEqual(span.name, "A")
        assertNone(span.parent)
        strictEqual(span.attributes.get("code.stacktrace"), undefined)
      }))

    it.effect("parent", () =>
      Effect.gen(function*() {
        const span = yield* (
          Effect.withSpan("B")(
            Effect.withSpan("A")(Effect.currentSpan)
          )
        )

        deepStrictEqual(span.name, "A")
        deepStrictEqual(Option.map(span.parent, (span) => (span as Span).name), Option.some("B"))
      }))

    it.effect("parent when root is set", () =>
      Effect.gen(function*() {
        const span = yield* (
          Effect.withSpan("B")(Effect.withSpan("A", { root: true })(Effect.currentSpan))
        )

        deepStrictEqual(span.name, "A")
        assertNone(span.parent)
      }))

    it.effect("external parent", () =>
      Effect.gen(function*() {
        const span = yield* (
          Effect.withSpan("A", {
            parent: {
              _tag: "ExternalSpan",
              spanId: "000",
              traceId: "111",
              sampled: true,
              context: Context.empty()
            }
          })(Effect.currentSpan)
        )
        deepStrictEqual(span.name, "A")
        deepStrictEqual(Option.map(span.parent, (span) => span.spanId), Option.some("000"))
      }))

    it.effect("correct time", () =>
      Effect.gen(function*() {
        const spanFiber = yield* (
          Effect.fork(Effect.withSpan("A")(Effect.delay(Duration.seconds(1))(Effect.currentSpan)))
        )

        yield* (TestClock.adjust(Duration.seconds(2)))

        const span = yield* (Fiber.join(spanFiber))

        deepStrictEqual(span.name, "A")
        deepStrictEqual(span.status.startTime, 0n)
        deepStrictEqual((span.status as any)["endTime"], 1000000000n)
        deepStrictEqual(span.status._tag, "Ended")
      }))
  })

  it.effect("annotateSpans", () =>
    Effect.gen(function*() {
      const span = yield* (
        Effect.annotateSpans(
          Effect.withSpan("A")(Effect.currentSpan),
          "key",
          "value"
        )
      )

      deepStrictEqual(span.name, "A")
      assertNone(span.parent)
      deepStrictEqual(span.attributes.get("key"), "value")
    }))

  it.effect("annotateSpans record", () =>
    Effect.gen(function*() {
      const span = yield* (
        Effect.annotateSpans(
          Effect.withSpan("A")(Effect.currentSpan),
          { key: "value", key2: "value2" }
        )
      )

      deepStrictEqual(span.attributes.get("key"), "value")
      deepStrictEqual(span.attributes.get("key2"), "value2")
    }))

  it.effect("logger", () =>
    Effect.gen(function*() {
      yield* (TestClock.adjust(Duration.millis(0.01)))

      const [span, fiberId] = yield* pipe(
        Effect.log("event"),
        Effect.zipRight(Effect.all([Effect.currentSpan, Effect.fiberId])),
        Effect.withSpan("A")
      )

      deepStrictEqual(span.name, "A")
      assertNone(span.parent)
      deepStrictEqual((span as NativeSpan).events, [["event", 10000n, {
        "effect.fiberId": FiberId.threadName(fiberId),
        "effect.logLevel": "INFO"
      }]])
    }))

  it.effect("withTracerTiming false", () =>
    Effect.gen(function*() {
      yield* (TestClock.adjust(Duration.millis(1)))

      const span = yield* pipe(
        Effect.withSpan("A")(Effect.currentSpan),
        Effect.withTracerTiming(false)
      )

      deepStrictEqual(span.status.startTime, 0n)
    }))

  it.effect("useSpanScoped", () =>
    Effect.gen(function*() {
      const span = yield* Effect.scoped(Effect.makeSpanScoped("A"))
      deepStrictEqual(span.status._tag, "Ended")
      strictEqual(span.attributes.get("code.stacktrace"), undefined)
    }))

  it.effect("annotateCurrentSpan", () =>
    Effect.gen(function*() {
      yield* (Effect.annotateCurrentSpan("key", "value"))
      const span = yield* (Effect.currentSpan)
      deepStrictEqual(span.attributes.get("key"), "value")
    }).pipe(
      Effect.withSpan("A")
    ))

  it.effect("withParentSpan", () =>
    Effect.gen(function*() {
      const span = yield* (Effect.currentSpan)
      deepStrictEqual(
        span.parent.pipe(
          Option.map((_) => _.spanId)
        ),
        Option.some("456")
      )
    }).pipe(
      Effect.withSpan("A"),
      Effect.withParentSpan({
        _tag: "ExternalSpan",
        traceId: "123",
        spanId: "456",
        sampled: true,
        context: Context.empty()
      })
    ))

  it.effect("Layer.parentSpan", () =>
    Effect.gen(function*() {
      const span = yield* Effect.makeSpan("child")
      const parent = yield* Option.filter(span.parent, (span): span is Span => span._tag === "Span")
      deepStrictEqual(parent.name, "parent")
      strictEqual(span.attributes.get("code.stacktrace"), undefined)
      strictEqual(parent.attributes.get("code.stacktrace"), undefined)
    }).pipe(
      Effect.provide(Layer.unwrapScoped(
        Effect.map(
          Effect.makeSpanScoped("parent"),
          (span) => Layer.parentSpan(span)
        )
      ))
    ))

  it.effect("Layer.span", () =>
    Effect.gen(function*() {
      const span = yield* Effect.makeSpan("child")
      const parent = span.parent.pipe(
        Option.filter((span): span is Span => span._tag === "Span"),
        Option.getOrThrow
      )
      strictEqual(parent.name, "parent")
      strictEqual(parent.attributes.get("code.stacktrace"), undefined)
    }).pipe(
      Effect.provide(Layer.span("parent"))
    ))

  it.effect("Layer.span onEnd", () =>
    Effect.gen(function*() {
      let onEndCalled = false
      const span = yield* pipe(
        Effect.currentSpan,
        Effect.provide(Layer.span("span", {
          onEnd: (span, _exit) =>
            Effect.sync(() => {
              strictEqual(span.name, "span")
              onEndCalled = true
            })
        }))
      )
      strictEqual(span.name, "span")
      strictEqual(onEndCalled, true)
    }))

  it.effect("linkSpans", () =>
    Effect.gen(function*() {
      const childA = yield* (Effect.makeSpan("childA"))
      const childB = yield* (Effect.makeSpan("childB"))
      const currentSpan = yield* pipe(
        Effect.currentSpan,
        Effect.withSpan("A", { links: [{ _tag: "SpanLink", span: childB, attributes: {} }] }),
        Effect.linkSpans(childA)
      )
      deepStrictEqual(
        currentSpan.links.map((_) => _.span),
        [childA, childB]
      )
    }))

  it.effect("Layer.withSpan", () =>
    Effect.gen(function*() {
      let onEndCalled = false
      const layer = Layer.effectDiscard(Effect.gen(function*() {
        const span = yield* Effect.currentSpan
        strictEqual(span.name, "span")
        strictEqual(span.attributes.get("code.stacktrace"), undefined)
      })).pipe(
        Layer.withSpan("span", {
          onEnd: (span, _exit) =>
            Effect.sync(() => {
              strictEqual(span.name, "span")
              onEndCalled = true
            })
        })
      )

      const span = yield* pipe(Effect.currentSpan, Effect.provide(layer), Effect.option)

      assertNone(span)
      strictEqual(onEndCalled, true)
    }))
})

it.effect("withTracerEnabled", () =>
  Effect.gen(function*() {
    const span = yield* pipe(
      Effect.currentSpan,
      Effect.withSpan("A"),
      Effect.withTracerEnabled(false)
    )
    const spanB = yield* pipe(
      Effect.currentSpan,
      Effect.withSpan("B"),
      Effect.withTracerEnabled(true)
    )

    deepStrictEqual(span.name, "A")
    deepStrictEqual(span.spanId, "noop")
    deepStrictEqual(spanB.name, "B")
  }))

describe("Tracer.DisablePropagation", () => {
  it.effect("creates noop span", () =>
    Effect.gen(function*() {
      const span = yield* Effect.currentSpan.pipe(
        Effect.withSpan("A", { context: Tracer.DisablePropagation.context(true) })
      )
      const spanB = yield* Effect.currentSpan.pipe(
        Effect.withSpan("B")
      )

      deepStrictEqual(span.name, "A")
      deepStrictEqual(span.spanId, "noop")
      deepStrictEqual(spanB.name, "B")
    }))

  it.effect("isnt used as parent span", () =>
    Effect.gen(function*() {
      const span = yield* Effect.currentSpan.pipe(
        Effect.withSpan("child"),
        Effect.withSpan("disabled", { context: Tracer.DisablePropagation.context(true) }),
        Effect.withSpan("parent")
      )
      strictEqual(span.name, "child")
      assertTrue(span.parent._tag === "Some" && span.parent.value._tag === "Span")
      strictEqual(span.parent.value.name, "parent")
    }))
})

describe("functionWithSpan", () => {
  const getSpan = Effect.functionWithSpan({
    body: (_id: string) => Effect.currentSpan,
    options: (id) => ({
      name: `span-${id}`,
      attributes: { id }
    })
  })

  it.effect("no parent", () =>
    Effect.gen(function*() {
      const span = yield* getSpan("A")
      deepStrictEqual(span.name, "span-A")
      assertNone(span.parent)
      strictEqual(span.attributes.get("code.stacktrace"), undefined)
    }))

  it.effect("parent", () =>
    Effect.gen(function*() {
      const span = yield* Effect.withSpan("B")(getSpan("A"))
      deepStrictEqual(span.name, "span-A")
      deepStrictEqual(Option.map(span.parent, (span) => (span as Span).name), Option.some("B"))
    }))
})
