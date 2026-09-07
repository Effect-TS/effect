import { assert, describe, it } from "@effect/vitest"
import { Cause, Context, Effect, Exit, Layer, LayerMap, LayerRef, References, Schema } from "effect"
import { HttpApiMiddleware } from "effect/unstable/httpapi"
import { Atom, AtomRegistry } from "effect/unstable/reactivity"
import { RpcMiddleware } from "effect/unstable/rpc"

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

      it("captures an invocation after a definition with stack capture disabled", () => {
        const fn = withStackTraceLimit(0, () => {
          const body = function*() {
            return yield* References.CurrentStackFrame
          }
          return named ? Effect.fn("traced")(body) : Effect.fn(body)
        })
        const frame = withStackTraceLimit(10, () => {
          const effect = fn()
          assert.strictEqual(Error.stackTraceLimit, 10)
          return Effect.runSync(effect)
        })
        assert.isDefined(frame)
        assert.strictEqual(frame!.name, named ? "traced" : "Effect.fn")
        assert.match(frame!.stack()!, /StackCapture\.test\.ts:\d+:\d+/)
        assert.strictEqual(frame!.parent!.name, `${named ? "traced" : "Effect.fn"} (definition)`)
        assert.isUndefined(frame!.parent!.stack())
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

  for (
    const [name, wrap] of [
      [
        "withSpan data-first",
        (effect: Effect.Effect<References.StackFrame | undefined>) =>
          Effect.withSpan(effect, "explicit span", { captureStackTrace: true })
      ],
      [
        "withSpan data-last",
        (effect: Effect.Effect<References.StackFrame | undefined>) =>
          effect.pipe(Effect.withSpan("explicit span", {}, { captureStackTrace: true }))
      ],
      [
        "withSpanScoped",
        (effect: Effect.Effect<References.StackFrame | undefined>) =>
          Effect.scoped(Effect.withSpanScoped(effect, "explicit span", { captureStackTrace: true }))
      ]
    ] as const
  ) {
    it(`${name} honors captureStackTrace true when the global limit is zero`, () => {
      const frame = withStackTraceLimit(0, () => {
        const effect = wrap(References.CurrentStackFrame)
        const frame = Effect.runSync(effect)
        assert.strictEqual(Error.stackTraceLimit, 0)
        return frame
      })
      assert.isDefined(frame)
      assert.strictEqual(frame!.name, "explicit span")
      assert.match(frame!.stack()!, /StackCapture\.test\.ts:\d+:\d+/)
    })
  }

  describe("service definitions", () => {
    for (
      const [name, define] of [
        ["LayerMap", () => {
          class Value extends Context.Service<Value, { readonly value: number }>()("StackCapture/Value") {}
          class Service extends LayerMap.Service<Service>()("LayerMap", {
            lookup: (_key: string) => Layer.succeed(Value, { value: 42 })
          }) {}
          return Service
        }],
        ["LayerRef", () => {
          class Service extends LayerRef.Service<Service>()("LayerRef", { layer: Layer.empty }) {}
          return Service
        }],
        ["HttpApiMiddleware", () => {
          class Service extends HttpApiMiddleware.Service<Service>()("HttpApiMiddleware") {}
          return Service
        }],
        ["RpcMiddleware", () => {
          class Service extends RpcMiddleware.Service<Service>()("RpcMiddleware") {}
          return Service
        }]
      ] as const
    ) {
      it(`${name}.Service skips Error allocation and has no stack at limit zero`, () => {
        const observed = withStackTraceLimit(0, () => observeErrors(() => define()))
        assert.strictEqual(observed.constructions, 0)
        assert.deepStrictEqual(observed.limits, [])
        assert.strictEqual(observed.value.key, name)
        assert.isUndefined(Reflect.get(observed.value, "stack"))
      })

      it(`${name}.Service captures its definition location at a positive limit`, () => {
        const service = withStackTraceLimit(10, () => {
          const service = define()
          assert.strictEqual(Error.stackTraceLimit, 10)
          return service
        })
        assert.strictEqual(service.key, name)
        const stack = Reflect.get(service, "stack") as string | undefined
        assert.isString(stack)
        assert.match(stack!.split("\n").at(-1)!, /StackCapture\.test\.ts:\d+:\d+/)
      })
    }
  })

  describe("cause formatting", () => {
    for (const [name, cause] of [["failure", Cause.fail("boom")], ["defect", Cause.die("boom")]] as const) {
      for (const limit of [0, 10]) {
        it(`formats a ${name} while stackTraceLimit is ${limit}`, () => {
          const observed = withStackTraceLimit(limit, () =>
            observeErrors(() => {
              const rendered = Cause.pretty(cause)
              const errors = Cause.prettyErrors(cause)
              return { rendered, errors, limit: Error.stackTraceLimit }
            }))
          assert.strictEqual(observed.value.limit, limit)
          assert.strictEqual(observed.value.errors.length, 1)
          assert.instanceOf(observed.value.errors[0], Error)
          assert.strictEqual(observed.value.errors[0].message, "boom")
          if (limit === 0) {
            assert.strictEqual(observed.value.rendered, "Error: boom")
            assert.strictEqual(observed.value.errors[0].stack, "Error: boom")
            assert.isTrue(observed.limits.every((value) => value === 0))
          } else {
            assert.include(observed.value.rendered, "Error: boom")
            assert.match(observed.value.errors[0].stack!, /\n\s+at /)
          }
        })
      }
    }

    it("preserves an existing error stack while formatting at limit zero", () => {
      const error = new Error("boom")
      error.stack = "Error: boom\n    at original.ts:1:1"
      const observed = withStackTraceLimit(0, () => observeErrors(() => Cause.pretty(Cause.fail(error))))
      assert.include(observed.value, "Error: boom")
      assert.include(observed.value, "at original.ts:1:1")
      assert.isTrue(observed.limits.every((value) => value === 0))
    })

    it("formats interruption details while the limit is zero", () => {
      const observed = withStackTraceLimit(0, () => observeErrors(() => Cause.pretty(Cause.interrupt(42))))
      assert.include(observed.value, "All fibers interrupted without error")
      assert.include(observed.value, "at fiber (#42)")
      assert.isTrue(observed.limits.every((value) => value === 0))
    })
  })

  describe("Atom labels", () => {
    for (
      const [name, label] of [
        ["withLabel", (atom: Atom.Atom<number>) => Atom.withLabel(atom, "counter")],
        [
          "serializable",
          (atom: Atom.Atom<number>) => Atom.serializable(atom, { key: "counter", schema: Schema.Number })
        ]
      ] as const
    ) {
      it(`${name} skips Error allocation at limit zero and preserves the atom value`, () => {
        const atom = Atom.make(42)
        const observed = withStackTraceLimit(0, () => observeErrors(() => label(atom)))
        assert.strictEqual(observed.constructions, 0)
        assert.deepStrictEqual(observed.value.label, ["counter", ""])
        const registry = AtomRegistry.make()
        try {
          assert.strictEqual(registry.get(observed.value), 42)
        } finally {
          registry.dispose()
        }
      })
    }

    it("serializable preserves an existing label without allocating another Error", () => {
      const atom = withStackTraceLimit(10, () => Atom.withLabel(Atom.make(42), "original"))
      const observed = withStackTraceLimit(
        0,
        () => observeErrors(() => Atom.serializable(atom, { key: "counter", schema: Schema.Number }))
      )
      assert.strictEqual(observed.constructions, 0)
      assert.strictEqual(observed.value.label, atom.label)
    })
  })
})
