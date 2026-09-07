import { assert, describe, it } from "@effect/vitest"
import { Cause, Context, Effect, Exit, References } from "effect"

const withStackTraceLimit = <A>(limit: number, run: () => A): A => {
  const original = Object.getOwnPropertyDescriptor(Error, "stackTraceLimit")
  Object.defineProperty(Error, "stackTraceLimit", { value: limit, writable: true, configurable: true })
  try {
    return run()
  } finally {
    if (original) {
      Object.defineProperty(Error, "stackTraceLimit", original)
    } else {
      Reflect.deleteProperty(Error, "stackTraceLimit")
    }
  }
}

// A zero-length stack still costs a capture in workerd, so inspect construction
// rather than only checking the resulting stack string.
const observeErrors = <A>(run: () => A) => {
  const original = globalThis.Error
  let constructions = 0
  const limits: Array<unknown> = []
  globalThis.Error = new Proxy(original, {
    construct(target, args, newTarget) {
      constructions++
      return Reflect.construct(target, args, newTarget)
    },
    set(target, key, value) {
      if (key === "stackTraceLimit") limits.push(value)
      return Reflect.set(target, key, value)
    }
  })
  try {
    return { value: run(), constructions, limits }
  } finally {
    globalThis.Error = original
  }
}

// These tests mutate Error globally and must not overlap with each other.
describe("stack capture", { concurrent: false }, () => {
  for (const named of [false, true]) {
    describe(named ? "named Effect.fn" : "unnamed Effect.fn", () => {
      const define = () => {
        const body = function*(value: number) {
          return yield* Effect.succeed(value + 1)
        }
        return named ? Effect.fn("increment")(body) : Effect.fn(body)
      }

      it("does not construct an Error at definition when stackTraceLimit is zero", () => {
        const observed = withStackTraceLimit(0, () => observeErrors(define))
        assert.strictEqual(observed.constructions, 0)
        assert.isTrue(observed.limits.every((limit) => limit === 0))
        assert.strictEqual(Effect.runSync(observed.value(1)), 2)
      })

      it("does not construct an Error at invocation when stackTraceLimit is zero", () => {
        const fn = withStackTraceLimit(10, define)
        const observed = withStackTraceLimit(0, () => observeErrors(() => Effect.runSync(fn(1))))
        assert.strictEqual(observed.value, 2)
        assert.strictEqual(observed.constructions, 0)
        assert.isTrue(observed.limits.every((limit) => limit === 0))
      })

      it("preserves failures when stack capture is disabled", () => {
        const exit = withStackTraceLimit(0, () => {
          const body = function*() {
            return yield* Effect.fail("boom")
          }
          const fn = named ? Effect.fn("failure")(body) : Effect.fn(body)
          return Effect.runSyncExit(fn())
        })
        assert.isTrue(Exit.isFailure(exit))
        if (Exit.isFailure(exit)) {
          assert.include(Cause.pretty(exit.cause), "boom")
        }
      })

      it("preserves definition and invocation locations when stack capture is enabled", () => {
        const frame = withStackTraceLimit(10, () => {
          const body = function*() {
            return yield* References.CurrentStackFrame
          }
          const fn = named ? Effect.fn("traced")(body) : Effect.fn(body)
          const effect = fn()
          assert.strictEqual(Error.stackTraceLimit, 10)
          return Effect.runSync(effect)
        })
        assert.isDefined(frame)
        assert.strictEqual(frame!.name, named ? "traced" : "Effect.fn")
        assert.match(frame!.stack()!, /StackCapture\.test\.ts:\d+:\d+/)
        assert.strictEqual(frame!.parent!.name, `${named ? "traced" : "Effect.fn"} (definition)`)
        assert.match(frame!.parent!.stack()!, /StackCapture\.test\.ts:\d+:\d+/)
        assert.notStrictEqual(frame!.stack(), frame!.parent!.stack())
      })
    })
  }

  for (const limit of [0, 10]) {
    it(`named Effect.fn preserves spans and attributes with stackTraceLimit ${limit}`, () => {
      const span = withStackTraceLimit(limit, () => {
        const fn = Effect.fn("named span", { attributes: { operation: "regression" } })(function*() {
          return yield* Effect.currentSpan
        })
        return Effect.runSync(fn())
      })
      assert.strictEqual(span.name, "named span")
      assert.strictEqual(span.attributes.get("operation"), "regression")
    })
  }

  for (
    const [name, wrap] of [
      ["withSpan data-first", (effect: Effect.Effect<string>) => Effect.withSpan(effect, "span")],
      ["withSpan data-last", (effect: Effect.Effect<string>) => effect.pipe(Effect.withSpan("span"))],
      ["withSpanScoped", (effect: Effect.Effect<string>) => Effect.scoped(Effect.withSpanScoped(effect, "span"))]
    ] as const
  ) {
    it(`${name} does not construct an Error when stackTraceLimit is zero`, () => {
      const observed = withStackTraceLimit(
        0,
        () =>
          observeErrors(() => Effect.runSync(wrap(Effect.map(Effect.orDie(Effect.currentSpan), (span) => span.name))))
      )
      assert.strictEqual(observed.value, "span")
      assert.strictEqual(observed.constructions, 0)
      assert.isTrue(observed.limits.every((limit) => limit === 0))
    })
  }

  it("withSpan preserves failure locations when stack capture is enabled", () => {
    const exit = withStackTraceLimit(10, () => {
      const effect = Effect.withSpan(Effect.fail("boom"), "traced span")
      assert.strictEqual(Error.stackTraceLimit, 10)
      return Effect.runSyncExit(effect)
    })
    assert.isTrue(Exit.isFailure(exit))
    if (Exit.isFailure(exit)) {
      const frame = Context.getUnsafe(Cause.annotations(exit.cause), Cause.StackTrace)
      assert.strictEqual(frame.name, "traced span")
      assert.match(frame.stack()!, /StackCapture\.test\.ts:\d+:\d+/)
      assert.include(Cause.pretty(exit.cause), "boom")
    }
  })

  it("withSpan honors captureStackTrace false when the global limit is positive", () => {
    const observed = withStackTraceLimit(
      10,
      () =>
        observeErrors(() =>
          Effect.runSync(Effect.withSpan(References.CurrentStackFrame, "span", { captureStackTrace: false }))
        )
    )
    assert.strictEqual(observed.constructions, 0)
    assert.strictEqual(observed.value!.name, "span")
    assert.isUndefined(observed.value!.stack())
  })

  it("withSpan preserves a supplied stack callback when the global limit is zero", () => {
    const observed = withStackTraceLimit(
      0,
      () =>
        observeErrors(() =>
          Effect.runSync(Effect.withSpan(References.CurrentStackFrame, "span", {
            captureStackTrace: () => "custom location"
          }))
        )
    )
    assert.strictEqual(observed.constructions, 0)
    assert.strictEqual(observed.value!.name, "span")
    assert.strictEqual(observed.value!.stack(), "custom location")
  })
})
