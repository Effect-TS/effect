import { Cause, Tracer } from "effect"
import * as Context from "effect/Context"
import { millis, seconds } from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Fiber from "effect/Fiber"
import * as FiberId from "effect/FiberId"
import type { NativeSpan } from "effect/internal/tracer"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as it from "effect/test/utils/extend"
import * as TestClock from "effect/TestClock"
import type { Span } from "effect/Tracer"
import { assert, describe } from "vitest"

describe("Tracer", () => {
  describe("withSpan", () => {
    it.effect("no parent", () =>
      Effect.gen(function*() {
        const span = yield* Effect.withSpan("A")(Effect.currentSpan)
        assert.deepEqual(span.name, "A")
        assert.deepEqual(span.parent, Option.none())
        assert.strictEqual(span.attributes.get("code.stacktrace"), undefined)
      }))

    it.effect("parent", () =>
      Effect.gen(function*($) {
        const span = yield* $(
          Effect.withSpan("B")(
            Effect.withSpan("A")(Effect.currentSpan)
          )
        )

        assert.deepEqual(span.name, "A")
        assert.deepEqual(Option.map(span.parent, (span) => (span as Span).name), Option.some("B"))
      }))

    it.effect("parent when root is set", () =>
      Effect.gen(function*($) {
        const span = yield* $(
          Effect.withSpan("B")(Effect.withSpan("A", { root: true })(Effect.currentSpan))
        )

        assert.deepEqual(span.name, "A")
        assert.deepEqual(span.parent, Option.none())
      }))

    it.effect("external parent", () =>
      Effect.gen(function*($) {
        const span = yield* $(
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
        assert.deepEqual(span.name, "A")
        assert.deepEqual(Option.map(span.parent, (span) => span.spanId), Option.some("000"))
      }))

    it.effect("correct time", () =>
      Effect.gen(function*($) {
        const spanFiber = yield* $(
          Effect.fork(Effect.withSpan("A")(Effect.delay(seconds(1))(Effect.currentSpan)))
        )

        yield* $(TestClock.adjust(seconds(2)))

        const span = yield* $(Fiber.join(spanFiber))

        assert.deepEqual(span.name, "A")
        assert.deepEqual(span.status.startTime, 0n)
        assert.deepEqual((span.status as any)["endTime"], 1000000000n)
        assert.deepEqual(span.status._tag, "Ended")
      }))
  })

  it.effect("annotateSpans", () =>
    Effect.gen(function*($) {
      const span = yield* $(
        Effect.annotateSpans(
          Effect.withSpan("A")(Effect.currentSpan),
          "key",
          "value"
        )
      )

      assert.deepEqual(span.name, "A")
      assert.deepEqual(span.parent, Option.none())
      assert.deepEqual(span.attributes.get("key"), "value")
    }))

  it.effect("annotateSpans record", () =>
    Effect.gen(function*($) {
      const span = yield* $(
        Effect.annotateSpans(
          Effect.withSpan("A")(Effect.currentSpan),
          { key: "value", key2: "value2" }
        )
      )

      assert.deepEqual(span.attributes.get("key"), "value")
      assert.deepEqual(span.attributes.get("key2"), "value2")
    }))

  it.effect("logger", () =>
    Effect.gen(function*($) {
      yield* $(TestClock.adjust(millis(0.01)))

      const [span, fiberId] = yield* $(
        Effect.log("event"),
        Effect.zipRight(Effect.all([Effect.currentSpan, Effect.fiberId])),
        Effect.withSpan("A")
      )

      assert.deepEqual(span.name, "A")
      assert.deepEqual(span.parent, Option.none())
      assert.deepEqual((span as NativeSpan).events, [["event", 10000n, {
        "effect.fiberId": FiberId.threadName(fiberId),
        "effect.logLevel": "INFO"
      }]])
    }))

  it.effect("withTracerTiming false", () =>
    Effect.gen(function*($) {
      yield* $(TestClock.adjust(millis(1)))

      const span = yield* $(
        Effect.withSpan("A")(Effect.currentSpan),
        Effect.withTracerTiming(false)
      )

      assert.deepEqual(span.status.startTime, 0n)
    }))

  it.effect("useSpanScoped", () =>
    Effect.gen(function*() {
      const span = yield* Effect.scoped(Effect.makeSpanScoped("A"))
      assert.deepEqual(span.status._tag, "Ended")
      assert.strictEqual(span.attributes.get("code.stacktrace"), undefined)
    }))

  it.effect("annotateCurrentSpan", () =>
    Effect.gen(function*(_) {
      yield* _(Effect.annotateCurrentSpan("key", "value"))
      const span = yield* _(Effect.currentSpan)
      assert.deepEqual(span.attributes.get("key"), "value")
    }).pipe(
      Effect.withSpan("A")
    ))

  it.effect("withParentSpan", () =>
    Effect.gen(function*(_) {
      const span = yield* _(Effect.currentSpan)
      assert.deepEqual(
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
      assert.deepEqual(parent.name, "parent")
      assert.strictEqual(span.attributes.get("code.stacktrace"), undefined)
      assert.strictEqual(parent.attributes.get("code.stacktrace"), undefined)
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
      assert.strictEqual(parent.name, "parent")
      assert.strictEqual(parent.attributes.get("code.stacktrace"), undefined)
    }).pipe(
      Effect.provide(Layer.span("parent"))
    ))

  it.effect("Layer.span onEnd", () =>
    Effect.gen(function*(_) {
      let onEndCalled = false
      const span = yield* _(
        Effect.currentSpan,
        Effect.provide(Layer.span("span", {
          onEnd: (span, _exit) =>
            Effect.sync(() => {
              assert.strictEqual(span.name, "span")
              onEndCalled = true
            })
        }))
      )
      assert.strictEqual(span.name, "span")
      assert.strictEqual(onEndCalled, true)
    }))

  it.effect("linkSpans", () =>
    Effect.gen(function*(_) {
      const childA = yield* _(Effect.makeSpan("childA"))
      const childB = yield* _(Effect.makeSpan("childB"))
      const currentSpan = yield* _(
        Effect.currentSpan,
        Effect.withSpan("A", { links: [{ _tag: "SpanLink", span: childB, attributes: {} }] }),
        Effect.linkSpans(childA)
      )
      assert.includeMembers(
        currentSpan.links.map((_) => _.span),
        [childB, childA]
      )
    }))

  it.effect("Layer.withSpan", () =>
    Effect.gen(function*(_) {
      let onEndCalled = false
      const layer = Layer.effectDiscard(Effect.gen(function*() {
        const span = yield* Effect.currentSpan
        assert.strictEqual(span.name, "span")
        assert.strictEqual(span.attributes.get("code.stacktrace"), undefined)
      })).pipe(
        Layer.withSpan("span", {
          onEnd: (span, _exit) =>
            Effect.sync(() => {
              assert.strictEqual(span.name, "span")
              onEndCalled = true
            })
        })
      )

      const span = yield* _(Effect.currentSpan, Effect.provide(layer), Effect.option)

      assert.deepEqual(span, Option.none())
      assert.strictEqual(onEndCalled, true)
    }))
})

it.effect("withTracerEnabled", () =>
  Effect.gen(function*($) {
    const span = yield* $(
      Effect.currentSpan,
      Effect.withSpan("A"),
      Effect.withTracerEnabled(false)
    )
    const spanB = yield* $(
      Effect.currentSpan,
      Effect.withSpan("B"),
      Effect.withTracerEnabled(true)
    )

    assert.deepEqual(span.name, "A")
    assert.deepEqual(span.spanId, "noop")
    assert.deepEqual(spanB.name, "B")
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

      assert.deepEqual(span.name, "A")
      assert.deepEqual(span.spanId, "noop")
      assert.deepEqual(spanB.name, "B")
    }))

  it.effect("captures stack", () =>
    Effect.gen(function*() {
      const cause = yield* Effect.die(new Error("boom")).pipe(
        Effect.withSpan("C", { context: Tracer.DisablePropagation.context(true) }),
        Effect.sandbox,
        Effect.flip
      )
      assert.include(Cause.pretty(cause), "Tracer.test.ts:295")
    }))

  it.effect("isnt used as parent span", () =>
    Effect.gen(function*() {
      const span = yield* Effect.currentSpan.pipe(
        Effect.withSpan("child"),
        Effect.withSpan("disabled", { context: Tracer.DisablePropagation.context(true) }),
        Effect.withSpan("parent")
      )
      assert.strictEqual(span.name, "child")
      assert(span.parent._tag === "Some" && span.parent.value._tag === "Span")
      assert.strictEqual(span.parent.value.name, "parent")
    }))
})

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
    assert.isDefined(maybeSpan)
    assert.include(maybeSpan!.attributes.get("code.stacktrace"), "Tracer.test.ts:330:24")
  }))

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
      assert.deepEqual(span.name, "span-A")
      assert.deepEqual(span.parent, Option.none())
      assert.strictEqual(span.attributes.get("code.stacktrace"), undefined)
    }))

  it.effect("parent", () =>
    Effect.gen(function*() {
      const span = yield* Effect.withSpan("B")(getSpan("A"))
      assert.deepEqual(span.name, "span-A")
      assert.deepEqual(Option.map(span.parent, (span) => (span as Span).name), Option.some("B"))
    }))
})
