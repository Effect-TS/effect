import { afterAll, assert, describe, describeWrapped, expect, it, layer } from "@effect/rstest"
import * as testAssert from "@effect/rstest/utils"
import { Clock, Context, Duration, Effect, Fiber, Layer, Schema } from "effect"
import { TestClock } from "effect/testing"
import * as Arbitrary from "effect/unstable/arbitrary/Arbitrary"

it.effect(
  "effect",
  () => Effect.acquireRelease(Effect.sync(() => expect(1).toEqual(1)), () => Effect.void)
)
it.live(
  "live",
  () => Effect.acquireRelease(Effect.sync(() => expect(1).toEqual(1)), () => Effect.void)
)

describeWrapped("describeWrapped", (it) => {
  it.effect("provides test services", () =>
    Effect.gen(function*() {
      assert.strictEqual(yield* Clock.currentTimeMillis, 0)
    }))
})

it("throws fails when the thunk does not throw", () => {
  expect(() => testAssert.throws(() => {})).toThrow()
})

it("throwsAsync fails when the promise resolves", async () => {
  await expect(testAssert.throwsAsync(() => Promise.resolve())).rejects.toThrow()
})

// each

it.effect.each([1, 2, 3])(
  "effect each %s",
  (n) => Effect.acquireRelease(Effect.sync(() => expect(n).toEqual(n)), () => Effect.void)
)
it.live.each([1, 2, 3])(
  "live each %s",
  (n) => Effect.acquireRelease(Effect.sync(() => expect(n).toEqual(n)), () => Effect.void)
)

// skip

it.live.skip(
  "live skipped",
  () => Effect.die("skipped anyway")
)
it.effect.skip(
  "effect skipped",
  () => Effect.die("skipped anyway")
)

// skipIf

it.effect.skipIf(true)("effect skipIf (true)", () => Effect.die("skipped anyway"))
it.effect.skipIf(false)("effect skipIf (false)", () => Effect.sync(() => expect(1).toEqual(1)))

// runIf

it.effect.runIf(true)("effect runIf (true)", () => Effect.sync(() => expect(1).toEqual(1)))
it.effect.runIf(false)("effect runIf (false)", () => Effect.die("not run anyway"))

// chained helpers

it.describe.each(["foo", "bar"] as const)("describe.each %s", (text) => {
  it.effect("runs an Effect test", () =>
    Effect.sync(() => {
      assert.include(["foo", "bar"], text)
    }))
})

it.skip.each([1])("skip.each %s", () => assert.fail("skipped anyway"))

describe("timeout", () => {
  const events: Array<string> = []
  const resource = Layer.effectDiscard(Effect.acquireRelease(
    Effect.void,
    () => Effect.sync(() => events.push("layer released"))
  ))

  layer(resource, { excludeTestServices: true })("layer", (it) => {
    it.effect.fails("interrupts the test", () =>
      Effect.gen(function*() {
        yield* Effect.acquireRelease(
          Effect.sync(() => events.push("acquired")),
          () => Effect.sleep(100).pipe(Effect.andThen(Effect.sync(() => events.push("released"))))
        )
        return yield* Effect.never
      }), 10)

    it.effect("waits for finalizers before the next test", () =>
      Effect.sync(() => assert.deepStrictEqual(events, ["acquired", "released"])))
  })

  it("waits for finalizers before releasing the layer", () => {
    assert.deepStrictEqual(events, ["acquired", "released", "layer released"])
  })
})

class Foo extends Context.Service<Foo, "foo">()("Foo") {
  static layer = Layer.succeed(Foo)("foo")
}

class Bar extends Context.Service<Bar, "bar">()("Bar") {
  static layer = Layer.effect(Bar)(Effect.map(Foo, () => "bar" as const))
}

class Sleeper extends Context.Service<Sleeper, {
  readonly sleep: (ms: number) => Effect.Effect<void>
}>()("Sleeper") {
  static readonly layer = Layer.effect(Sleeper)(
    Effect.gen(function*() {
      const clock = yield* Clock.Clock

      return {
        sleep: (ms: number) => clock.sleep(Duration.millis(ms))
      }
    })
  )
}

describe("layer", () => {
  layer(Foo.layer)((it) => {
    it.effect("adds context", () =>
      Effect.gen(function*() {
        const foo = yield* Foo
        expect(foo).toEqual("foo")
      }))

    it.layer(Bar.layer)("nested", (it) => {
      it.effect("adds context", () =>
        Effect.gen(function*() {
          const foo = yield* Foo
          const bar = yield* Bar
          expect(foo).toEqual("foo")
          expect(bar).toEqual("bar")
        }))
    })

    it.layer(Bar.layer)((it) => {
      it.effect("without name", () =>
        Effect.gen(function*() {
          const foo = yield* Foo
          const bar = yield* Bar
          expect(foo).toEqual("foo")
          expect(bar).toEqual("bar")
        }))
    })

    describe("release", () => {
      let released = false
      afterAll(() => {
        expect(released).toEqual(true)
      })

      class Scoped extends Context.Service<Scoped, "scoped">()("Scoped") {
        static layer = Layer.effect(Scoped)(
          Effect.acquireRelease(
            Effect.succeed("scoped" as const),
            () => Effect.sync(() => released = true)
          )
        )
      }

      it.layer(Scoped.layer)((it) => {
        it.effect("adds context", () =>
          Effect.gen(function*() {
            const foo = yield* Foo
            const scoped = yield* Scoped
            expect(foo).toEqual("foo")
            expect(scoped).toEqual("scoped")
          }))
      })

      it.effect.prop(
        "adds context",
        [realNumber],
        ([num]) =>
          Effect.gen(function*() {
            const foo = yield* Foo
            expect(foo).toEqual("foo")
            return num === num
          }),
        { arbitrary: { runs: 200 } }
      )

      it.effect.prop(
        "adds context with a Schema property",
        [Schema.Int],
        ([value]) =>
          Effect.gen(function*() {
            const foo = yield* Foo
            assert.strictEqual(foo, "foo")
            assert.isTrue(Number.isInteger(value))
          }),
        { arbitrary: { runs: 5, seed: "rstest-arbitrary-layer" } }
      )
    })
  })

  layer(Sleeper.layer)("test services", (it) => {
    it.effect("TestClock", () =>
      Effect.gen(function*() {
        const sleeper = yield* Sleeper
        const fiber = yield* Effect.forkChild(sleeper.sleep(100_000))
        yield* Effect.yieldNow
        yield* TestClock.adjust(100_000)
        yield* Fiber.join(fiber)
      }))
  })

  layer(Foo.layer)("with a name", (it) => {
    describe("with a nested describe", () => {
      it.effect("adds context", () =>
        Effect.gen(function*() {
          const foo = yield* Foo
          expect(foo).toEqual("foo")
        }))
    })
    it.effect("adds context", () =>
      Effect.gen(function*() {
        const foo = yield* Foo
        expect(foo).toEqual("foo")
      }))
  })

  layer(Sleeper.layer, { excludeTestServices: true })("live services", (it) => {
    it.effect("Clock", () =>
      Effect.gen(function*() {
        const sleeper = yield* Sleeper
        yield* sleeper.sleep(1)
      }))
  })
})

// property testing

const realNumber = Schema.Finite
const textArbitrary = Arbitrary.schema(Schema.Literals(["a", "b"]))

it.prop(
  "schema with array",
  [Schema.String, Schema.Int],
  ([text, count]) => typeof text === "string" && Number.isInteger(count)
)

it.prop(
  "schema with object",
  { text: Schema.String, count: Schema.Int },
  ({ text, count }) => typeof text === "string" && Number.isInteger(count)
)

let mixedTupleRuns = 0
let mixedRecordRuns = 0
afterAll(() => {
  assert.strictEqual(mixedTupleRuns, 5)
  assert.strictEqual(mixedRecordRuns, 5)
})

it.prop(
  "Schema and Arbitrary with array",
  [Schema.Int, textArbitrary],
  ([count, text]) => {
    mixedTupleRuns++
    assert.isTrue(Number.isInteger(count))
    assert.include(["a", "b"], text)
  },
  { arbitrary: { runs: 5, maxDiscards: 0, seed: "rstest-mixed-tuple" } }
)

it.effect.prop(
  "Schema and Arbitrary with object",
  { count: Schema.Int, text: textArbitrary },
  ({ count, text }) =>
    Effect.sync(() => {
      mixedRecordRuns++
      assert.isTrue(Number.isInteger(count))
      assert.include(["a", "b"], text)
    }),
  { arbitrary: { runs: 5, maxDiscards: 0, seed: "rstest-mixed-record" } }
)

it.prop("symmetry", [realNumber, Schema.Int], ([a, b]) => a + b === b + a)

it.prop(
  "symmetry with object",
  { a: realNumber, b: Schema.Int },
  ({ a, b }) => a + b === b + a
)

it.live.prop(
  "schema with object",
  { value: Schema.Int },
  ({ value }) => Effect.sync(() => assert.isTrue(Number.isInteger(value)))
)

let arbitraryEffectRuns = 0
afterAll(() => assert.strictEqual(arbitraryEffectRuns, 5))

it.effect.prop(
  "schema with Arbitrary options",
  [Schema.String, Schema.Int],
  ([text, count]) =>
    Effect.sync(() => {
      arbitraryEffectRuns++
      assert.strictEqual(typeof text, "string")
      assert.isTrue(Number.isInteger(count))
    }),
  { arbitrary: { runs: 5, maxDiscards: 0, seed: "rstest-arbitrary" } }
)

it.effect.prop("symmetry", [realNumber, Schema.Int], ([a, b]) =>
  Effect.gen(function*() {
    yield* Effect.void
    assert.isTrue(a + b === b + a)
  }))

it.effect.prop("symmetry with object", { a: realNumber, b: Schema.Int }, ({ a, b }) =>
  Effect.gen(function*() {
    yield* Effect.void
    assert.strictEqual(a + b, b + a)
  }))

it.effect.prop(
  "should detect the substring",
  { a: Schema.String, b: Schema.String, c: Schema.String },
  ({ a, b, c }) =>
    Effect.gen(function*() {
      yield* Effect.scope
      assert.include(a + b + c, b)
    })
)

describe("property failures", () => {
  const Input = Schema.Int.check(Schema.isBetween({ minimum: 1, maximum: 1_000 }))
  const pureDefectValues: Array<number> = []
  const effectDefectValues: Array<number> = []
  let interruptedRuns = 0
  let timeoutPropertyStarted = false
  let timeoutPropertyReleased = false

  afterAll(() => {
    assert.deepStrictEqual(pureDefectValues, [8, 1])
    assert.deepStrictEqual(effectDefectValues, [8, 1])
    assert.strictEqual(interruptedRuns, 1)
    assert.isTrue(timeoutPropertyStarted)
    assert.isTrue(timeoutPropertyReleased)
  })

  it.prop(
    "shrinks synchronous defects",
    [Input],
    ([value]) => {
      pureDefectValues.push(value)
      throw new Error("property defect")
    },
    { fails: true, arbitrary: { runs: 1, seed: "assertion-shrink" } }
  )

  it.effect.prop(
    "shrinks Effect defects",
    [Input],
    ([value]) =>
      Effect.sync(() => {
        effectDefectValues.push(value)
        assert.strictEqual(value, 0)
      }),
    { fails: true, arbitrary: { runs: 1, seed: "assertion-shrink" } }
  )

  it.effect.prop(
    "preserves interruption",
    [Input],
    () => {
      interruptedRuns++
      return Effect.interrupt
    },
    { fails: true, arbitrary: { runs: 1, seed: "assertion-shrink" } }
  )

  it.effect.prop(
    "interrupts property checking on timeout",
    [Schema.Literal("value")],
    () =>
      Effect.acquireUseRelease(
        Effect.sync(() => {
          timeoutPropertyStarted = true
        }),
        () => Effect.never,
        () =>
          Effect.sync(() => {
            timeoutPropertyReleased = true
          })
      ),
    { fails: true, timeout: 10, arbitrary: { runs: 1, maxDiscards: 0, seed: "property-timeout" } }
  )
})

// options

it.effect("fails option", () => Effect.fail("expected"), { fails: true })
it.effect.each([1])("each fails option", () => Effect.fail("expected"), { fails: true })
it.effect("skip option", () => Effect.die("must be skipped"), { skip: true })
it.effect.each([1])("each skip option", () => Effect.die("must be skipped"), { skip: true })
it.live("todo option", () => Effect.die("must not run"), { todo: true })
it.effect("false options", () => Effect.void, { skip: false, only: false, todo: false, fails: false })

for (const [name, test] of [["effect", it.effect], ["live", it.live]] as const) {
  describe(`${name} modifier precedence`, () => {
    test.skip("skip overrides skip: false", () => Effect.die("must be skipped"), { skip: false })
    test.fails("fails overrides fails: false", () => Effect.fail("expected"), { fails: false })
    test.skipIf(true)("skipIf(true) overrides skip: false", () => Effect.die("must be skipped"), { skip: false })
    test.runIf(false)("runIf(false) overrides skip: false", () => Effect.die("must be skipped"), { skip: false })
    test.skipIf(false)("skipIf(false) preserves skip: true", () => Effect.die("must be skipped"), { skip: true })
    test.runIf(true)("runIf(true) preserves skip: true", () => Effect.die("must be skipped"), { skip: true })
  })
}
