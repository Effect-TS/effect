import { assert, describe, it } from "@effect/vitest"
import { Context, Effect, Exit, Option, Scope } from "effect"

describe("updateServiceScoped provider lifetime", () => {
  class Counter extends Context.Service<Counter, number>()("updateServiceScoped/Counter") {}
  class Cell extends Context.Service<Cell, { readonly value: number } | undefined>()("updateServiceScoped/Cell") {}

  const body = (seen: Array<number>) =>
    Effect.gen(function*() {
      seen.push(yield* Counter)
      yield* Effect.updateServiceScoped(Counter, (value) => value + 1)
      const result = yield* Counter
      seen.push(result)
      return result
    })

  it.effect("inner provideService completes successfully without restoring an expired service", () =>
    Effect.gen(function*() {
      const seen: Array<number> = []
      assert.deepStrictEqual(yield* Effect.serviceOption(Counter), Option.none())
      const exit = yield* Effect.exit(Effect.scoped(Effect.provideService(body(seen), Counter, 1)))
      assert.deepStrictEqual(seen, [1, 2])
      assert.deepStrictEqual(yield* Effect.serviceOption(Counter), Option.none())
      assert.deepStrictEqual(exit, Exit.succeed(2))
    }))

  it.effect("inner provideContext completes successfully without restoring an expired service", () =>
    Effect.gen(function*() {
      const seen: Array<number> = []
      const exit = yield* Effect.exit(Effect.scoped(Effect.provideContext(body(seen), Context.make(Counter, 1))))
      assert.deepStrictEqual(seen, [1, 2])
      assert.deepStrictEqual(yield* Effect.serviceOption(Counter), Option.none())
      assert.deepStrictEqual(exit, Exit.succeed(2))
    }))

  it.effect("inner setContext retains the actual scope and completes successfully", () =>
    Effect.gen(function*() {
      const seen: Array<number> = []
      const exit = yield* Effect.exit(Effect.scoped(Effect.gen(function*() {
        const scope = yield* Effect.scope
        return yield* Effect.setContext(body(seen), Context.make(Counter, 1).pipe(Context.add(Scope.Scope, scope)))
      })))
      assert.deepStrictEqual(seen, [1, 2])
      assert.deepStrictEqual(yield* Effect.serviceOption(Counter), Option.none())
      assert.deepStrictEqual(exit, Exit.succeed(2))
    }))

  it.effect("inner provideServiceEffect completes successfully without restoring an expired service", () =>
    Effect.gen(function*() {
      const seen: Array<number> = []
      const exit = yield* Effect.exit(
        Effect.scoped(Effect.provideServiceEffect(body(seen), Counter, Effect.succeed(1)))
      )
      assert.deepStrictEqual(seen, [1, 2])
      assert.deepStrictEqual(yield* Effect.serviceOption(Counter), Option.none())
      assert.deepStrictEqual(exit, Exit.succeed(2))
    }))

  it.effect("custom reset does not receive a fabricated current value after its provider expires", () =>
    Effect.gen(function*() {
      let calls = 0
      const seen: Array<number> = []
      const exit = yield* Effect.exit(Effect.scoped(
        Effect.gen(function*() {
          yield* Effect.updateServiceScoped(Counter, (value) => value + 1, {
            reset: (original, updated, current) => {
              calls++
              return original + current - updated
            }
          })
          const result = yield* Counter
          seen.push(result)
          return result
        }).pipe(Effect.provideService(Counter, 1))
      ))
      assert.deepStrictEqual(seen, [2])
      assert.strictEqual(calls, 0)
      assert.deepStrictEqual(yield* Effect.serviceOption(Counter), Option.none())
      assert.deepStrictEqual(exit, Exit.succeed(2))
    }))

  it.effect("control: outer provider gives the identical successful body result", () =>
    Effect.gen(function*() {
      const seen: Array<number> = []
      const exit = yield* Effect.exit(Effect.provideService(Effect.scoped(body(seen)), Counter, 1))
      assert.deepStrictEqual(seen, [1, 2])
      assert.deepStrictEqual(yield* Effect.serviceOption(Counter), Option.none())
      assert.deepStrictEqual(exit, Exit.succeed(2))
    }))

  it.effect("control: outer service preserves before during and after values", () =>
    Effect.gen(function*() {
      const before = yield* Counter
      const during = yield* Effect.scoped(body([]))
      const after = yield* Counter
      assert.deepStrictEqual([before, during, after], [1, 2, 1])
    }).pipe(Effect.provideService(Counter, 1)))

  it.effect("control: reference default preserves before during and after values", () =>
    Effect.gen(function*() {
      const Reference = Context.Reference<number>("updateServiceScoped/Default", { defaultValue: () => 1 })
      const before = yield* Reference
      const during = yield* Effect.scoped(Effect.gen(function*() {
        yield* Effect.updateServiceScoped(Reference, (value) => value + 1)
        return yield* Reference
      }))
      const after = yield* Reference
      assert.deepStrictEqual([before, during, after], [1, 2, 1])
      assert.deepStrictEqual(yield* Effect.serviceOption(Reference), Option.some(1))
    }))

  it.effect("control: manual closure restores the original object from a present undefined update", () =>
    Effect.gen(function*() {
      const scope = yield* Scope.make()
      const original = { value: 1 }
      yield* Effect.gen(function*() {
        yield* Effect.updateServiceScoped(Cell, () => undefined)
        assert.deepStrictEqual(yield* Effect.serviceOption(Cell), Option.some(undefined))
        yield* Scope.close(scope, Exit.void)
        assert.strictEqual(yield* Cell, original)
        yield* Scope.close(scope, Exit.void)
        assert.strictEqual(yield* Cell, original)
      }).pipe(Scope.provide(scope), Effect.provideService(Cell, original))
    }))

  it.effect("control: manual closure restores an original undefined as a present value", () =>
    Effect.gen(function*() {
      const scope = yield* Scope.make()
      const updated = { value: 2 }
      yield* Effect.gen(function*() {
        yield* Effect.updateServiceScoped(Cell, () => updated)
        assert.strictEqual(yield* Cell, updated)
        yield* Scope.close(scope, Exit.void)
        assert.deepStrictEqual(yield* Effect.serviceOption(Cell), Option.some(undefined))
      }).pipe(Scope.provide(scope), Effect.provideService(Cell, undefined))
    }))

  it.effect("control: custom reset receives present undefined and preserves object identity", () =>
    Effect.gen(function*() {
      const scope = yield* Scope.make()
      const original = { value: 1 }
      let calls = 0
      yield* Effect.gen(function*() {
        yield* Effect.updateServiceScoped(Cell, () => undefined, {
          reset: (previous, updated, current) => {
            calls++
            assert.strictEqual(previous, original)
            assert.strictEqual(updated, undefined)
            assert.strictEqual(current, undefined)
            return previous
          }
        })
        yield* Scope.close(scope, Exit.void)
        assert.strictEqual(yield* Cell, original)
        assert.strictEqual(calls, 1)
        yield* Scope.close(scope, Exit.void)
        assert.strictEqual(calls, 1)
      }).pipe(Scope.provide(scope), Effect.provideService(Cell, original))
    }))

  it.effect("control: default reset does not replace a different currently provided object", () =>
    Effect.gen(function*() {
      const scope = yield* Scope.make()
      const original = { value: 1 }
      const updated = { value: 2 }
      const current = { value: 3 }
      yield* Effect.gen(function*() {
        yield* Effect.updateServiceScoped(Cell, () => updated)
        assert.strictEqual(yield* Cell, updated)
        const result = yield* Effect.gen(function*() {
          yield* Scope.close(scope, Exit.void)
          return yield* Cell
        }).pipe(Effect.provideService(Cell, current))
        assert.strictEqual(result, current)
      }).pipe(Scope.provide(scope), Effect.provideService(Cell, original))
    }))

  it.effect("control: custom reset merges original updated and current public provider values", () =>
    Effect.gen(function*() {
      const scope = yield* Scope.make()
      class Values extends Context.Service<Values, ReadonlyArray<string>>()("updateServiceScoped/Values") {}
      const original: ReadonlyArray<string> = []
      const updated: ReadonlyArray<string> = ["scoped"]
      const current: ReadonlyArray<string> = ["scoped", "external"]
      let calls = 0
      yield* Effect.gen(function*() {
        yield* Effect.updateServiceScoped(Values, () => updated, {
          reset: (previous, next, latest) => {
            calls++
            assert.strictEqual(previous, original)
            assert.strictEqual(next, updated)
            assert.strictEqual(latest, current)
            return [...previous, ...latest.filter((value) => !next.includes(value))]
          }
        })
        const result = yield* Effect.gen(function*() {
          yield* Scope.close(scope, Exit.void)
          return yield* Values
        }).pipe(Effect.provideService(Values, current))
        assert.strictEqual(calls, 1)
        assert.deepStrictEqual(result, ["external"])
      }).pipe(Scope.provide(scope), Effect.provideService(Values, original))
    }))

  it.effect("control: reference reset receives the fallback default after an inner provider expires", () =>
    Effect.gen(function*() {
      const original = { value: 1 }
      const updated = { value: 2 }
      const fallback = { value: 0 }
      const Reference = Context.Reference("updateServiceScoped/ObjectDefault", { defaultValue: () => fallback })
      let calls = 0
      const during = yield* Effect.scoped(
        Effect.gen(function*() {
          yield* Effect.updateServiceScoped(Reference, () => updated, {
            reset: (previous, next, current) => {
              calls++
              assert.strictEqual(previous, original)
              assert.strictEqual(next, updated)
              assert.strictEqual(current, fallback)
              return current
            }
          })
          return yield* Reference
        }).pipe(Effect.provideService(Reference, original))
      )
      assert.strictEqual(during, updated)
      assert.strictEqual(calls, 1)
      assert.strictEqual(yield* Reference, fallback)
    }))

  it.effect("control: undefined reference default is still a current value for reset", () =>
    Effect.gen(function*() {
      const Reference = Context.Reference<number | undefined>("updateServiceScoped/UndefinedDefault", {
        defaultValue: () => undefined
      })
      let calls = 0
      const during = yield* Effect.scoped(Effect.gen(function*() {
        yield* Effect.updateServiceScoped(Reference, () => 2, {
          reset: (previous, updated, current) => {
            calls++
            assert.deepStrictEqual([previous, updated, current], [undefined, 2, undefined])
            return previous
          }
        })
        return yield* Reference
      }))
      assert.strictEqual(during, 2)
      assert.strictEqual(calls, 1)
      assert.deepStrictEqual(yield* Effect.serviceOption(Reference), Option.some(undefined))
    }))

  it.effect("control: expired inner provider retains a distinct outer value by default", () =>
    Effect.gen(function*() {
      const during = yield* Effect.scoped(Effect.provideService(body([]), Counter, 1))
      assert.strictEqual(during, 2)
      assert.strictEqual(yield* Counter, 100)
    }).pipe(Effect.provideService(Counter, 100)))

  it.effect("control: custom reset still merges a present outer value after an inner provider expires", () =>
    Effect.gen(function*() {
      let calls = 0
      yield* Effect.scoped(
        Effect.gen(function*() {
          yield* Effect.updateServiceScoped(Counter, (value) => value + 1, {
            reset: (original, updated, current) => {
              calls++
              assert.deepStrictEqual([original, updated, current], [1, 2, 100])
              return original + current - updated
            }
          })
        }).pipe(Effect.provideService(Counter, 1))
      )
      assert.strictEqual(yield* Counter, 99)
      assert.strictEqual(calls, 1)
    }).pipe(Effect.provideService(Counter, 100)))

  it.effect("control: normal nested scoped updates unwind in order", () =>
    Effect.gen(function*() {
      const seen = [yield* Counter]
      yield* Effect.scoped(Effect.gen(function*() {
        yield* Effect.updateServiceScoped(Counter, (value) => value + 1)
        seen.push(yield* Counter)
        yield* Effect.scoped(Effect.gen(function*() {
          yield* Effect.updateServiceScoped(Counter, (value) => value + 1)
          seen.push(yield* Counter)
        }))
        seen.push(yield* Counter)
      }))
      seen.push(yield* Counter)
      assert.deepStrictEqual(seen, [1, 2, 3, 2, 1])
    }).pipe(Effect.provideService(Counter, 1)))

  it.effect("control: two same-scope updates restore in reverse order on manual closure", () =>
    Effect.gen(function*() {
      const scope = yield* Scope.make()
      yield* Effect.gen(function*() {
        yield* Effect.updateServiceScoped(Counter, (value) => value + 1)
        yield* Effect.updateServiceScoped(Counter, (value) => value + 1)
        assert.strictEqual(yield* Counter, 3)
        yield* Scope.close(scope, Exit.void)
        assert.strictEqual(yield* Counter, 1)
      }).pipe(Scope.provide(scope), Effect.provideService(Counter, 1))
    }))
})
