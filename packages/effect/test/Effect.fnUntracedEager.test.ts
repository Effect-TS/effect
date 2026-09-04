import { assert, describe, it } from "@effect/vitest"
import { Context, Effect, Exit } from "effect"

describe("fnUntracedEager transform arguments", () => {
  it.effect("one original argument", () =>
    Effect.gen(function*() {
      const fn = Effect.fnUntracedEager(
        function*(value: string) {
          return yield* Effect.succeed(value.length)
        },
        (effect, value) => Effect.map(effect, (length) => `${value}:${length}`)
      )
      assert.strictEqual(yield* fn("hello"), "hello:5")
    }))

  it.effect("two original arguments in order", () =>
    Effect.gen(function*() {
      const fn = Effect.fnUntracedEager(
        function*(value: string, count: number) {
          return yield* Effect.succeed(value.repeat(count))
        },
        (effect, value, count) => Effect.map(effect, (result) => [result, value, count])
      )
      assert.deepStrictEqual(yield* fn("ab", 2), ["abab", "ab", 2])
    }))

  it.effect("each transform receives original arguments and previous result", () =>
    Effect.gen(function*() {
      const observed: Array<unknown> = []
      let previous: unknown
      const fn = Effect.fnUntracedEager(
        function*(_value: string, count: number) {
          return yield* Effect.succeed(count)
        },
        (effect, value, count) => {
          observed.push(["first", value, count])
          const next = Effect.map(effect, (n) => n + 10)
          previous = next
          return next
        },
        (effect, value, count) => {
          observed.push(["second", value, count, effect === previous])
          return Effect.map(effect, (n) => `${value}:${count}:${n}`)
        }
      )
      const result = yield* fn("item", 2)
      assert.deepStrictEqual([observed, result], [
        [["first", "item", 2], ["second", "item", 2, true]],
        "item:2:12"
      ])
    }))

  it("final transform can return a plain value", () => {
    const fn = Effect.fnUntracedEager(
      function*(value: string) {
        return yield* Effect.succeed(value)
      },
      (_effect, value) => ({ value }),
      (previous, value) => `${previous.value}:${value}`
    )
    assert.strictEqual(fn("plain"), "plain:plain")
  })

  it.effect("arguments survive a deferred sync effect and replay", () =>
    Effect.gen(function*() {
      let bodyCalls = 0
      let syncCalls = 0
      let transformCalls = 0
      const fn = Effect.fnUntracedEager(
        function*(value: string) {
          bodyCalls++
          const count = yield* Effect.sync(() => ++syncCalls)
          return `${value}:${count}`
        },
        (effect, value) => {
          transformCalls++
          return Effect.map(effect, (result) => `${value}/${result}`)
        }
      )
      const effect = fn("later")
      const before = [bodyCalls, syncCalls, transformCalls]
      const first = yield* effect
      const second = yield* effect
      assert.deepStrictEqual([before, first, second, bodyCalls, syncCalls, transformCalls], [
        [1, 0, 1],
        "later/later:1",
        "later/later:2",
        2,
        2,
        1
      ])
    }))

  it.effect("transform uses an original argument to provide a body dependency", () =>
    Effect.gen(function*() {
      class Prefix extends Context.Service<Prefix, string>()("fnUntracedEager/Prefix") {}
      const fn = Effect.fnUntracedEager(
        function*(_prefix: string, value: string) {
          const provided = yield* Prefix
          return `${provided}:${value}`
        },
        (effect, prefix) => Effect.provideService(effect, Prefix, prefix)
      )
      assert.strictEqual(yield* fn("provided", "item"), "provided:item")
    }))

  it.effect("failing body still supplies arguments to its transform", () =>
    Effect.gen(function*() {
      const fn = Effect.fnUntracedEager(
        function*(value: string) {
          return yield* Effect.fail(`body:${value}`)
        },
        (effect, value) => Effect.mapError(effect, (error) => `${value}/${error}`)
      )
      assert.strictEqual(yield* Effect.flip(fn("bad")), "bad/body:bad")
    }))

  it.effect("transform failure can depend on original arguments", () =>
    Effect.gen(function*() {
      const fn = Effect.fnUntracedEager(
        function*(value: string) {
          return yield* Effect.succeed(value.length)
        },
        (effect, value) => Effect.flatMap(effect, (length) => Effect.fail(`${value}:${length}`))
      )
      assert.strictEqual(yield* Effect.flip(fn("bad")), "bad:3")
    }))

  it.effect("object argument identity reaches the body and every transform", () =>
    Effect.gen(function*() {
      const input = { name: "original" }
      const seen: Array<unknown> = []
      const fn = Effect.fnUntracedEager(
        function*(value: typeof input) {
          seen.push(value)
          return yield* Effect.succeed(value)
        },
        (effect, value) => {
          seen.push(value)
          return effect
        },
        (effect, value) => {
          seen.push(value)
          return effect
        }
      )
      const result = yield* fn(input)
      assert.deepStrictEqual([seen.length, seen[0] === input, seen[1] === input, seen[2] === input, result === input], [
        3,
        true,
        true,
        true,
        true
      ])
    }))

  it.effect("control: ordinary fn forwards arguments", () =>
    Effect.gen(function*() {
      const fn = Effect.fn(
        function*(_value: string, count: number) {
          return yield* Effect.succeed(count)
        },
        (effect, value, count) => Effect.map(effect, (n) => `${value}:${count}:${n}`)
      )
      assert.strictEqual(yield* fn("ordinary", 2), "ordinary:2:2")
    }))

  it.effect("control: fnUntraced forwards arguments", () =>
    Effect.gen(function*() {
      const fn = Effect.fnUntraced(
        function*(_value: string, count: number) {
          return yield* Effect.succeed(count)
        },
        (effect, value, count) => Effect.map(effect, (n) => `${value}:${count}:${n}`)
      )
      assert.strictEqual(yield* fn("untraced", 2), "untraced:2:2")
    }))

  it.effect("control: zero input arguments", () =>
    Effect.gen(function*() {
      let received: unknown
      const fn = Effect.fnUntracedEager(
        function*() {
          return yield* Effect.succeed(5)
        },
        (effect, ...args) => {
          received = args
          return Effect.map(effect, (n) => n + 1)
        }
      )
      const result = yield* fn()
      assert.deepStrictEqual([received, result], [[], 6])
    }))

  it.effect("control: unary transform with two input arguments", () =>
    Effect.gen(function*() {
      const fn = Effect.fnUntracedEager(
        function*(value: string, count: number) {
          return yield* Effect.succeed(value.length + count)
        },
        Effect.map((n) => n * 2)
      )
      assert.strictEqual(yield* fn("abc", 2), 10)
    }))

  it.effect("control: eager body and transforms execute once before consumption", () =>
    Effect.gen(function*() {
      const order: Array<string> = []
      const fn = Effect.fnUntracedEager(
        function*() {
          order.push("body")
          return yield* Effect.succeed(5)
        },
        (effect) => {
          order.push("first")
          return Effect.map(effect, (n) => n + 1)
        },
        (effect) => {
          order.push("second")
          return Effect.map(effect, (n) => n * 2)
        }
      )
      const effect = fn()
      const before = order.slice()
      const first = yield* effect
      const second = yield* effect
      assert.deepStrictEqual([before, order, first, second], [
        ["body", "first", "second"],
        ["body", "first", "second"],
        12,
        12
      ])
    }))

  it.effect("control: deferred body replays without replaying transforms", () =>
    Effect.gen(function*() {
      let bodyCalls = 0
      let syncCalls = 0
      let transformCalls = 0
      const fn = Effect.fnUntracedEager(
        function*() {
          bodyCalls++
          return yield* Effect.sync(() => ++syncCalls)
        },
        (effect) => {
          transformCalls++
          return effect
        }
      )
      const effect = fn()
      const before = [bodyCalls, syncCalls, transformCalls]
      const first = yield* effect
      const second = yield* effect
      assert.deepStrictEqual([before, first, second, bodyCalls, syncCalls, transformCalls], [[1, 0, 1], 1, 2, 2, 2, 1])
    }))

  it.effect("control: body receiver and function length are preserved", () =>
    Effect.gen(function*() {
      const object = {
        value: 10,
        fn: Effect.fnUntracedEager(
          function*(this: { value: number }, value: string, count: number) {
            return yield* Effect.succeed(this.value + value.length + count)
          },
          Effect.map((n) => n * 2)
        )
      }
      const result = yield* object.fn("abc", 2)
      assert.deepStrictEqual([object.fn.length, result], [2, 30])
    }))

  it.effect("control: local transform call receiver is unchanged", () =>
    Effect.gen(function*() {
      const receivers: Array<unknown> = []
      const fn = Effect.fnUntracedEager(
        function*() {
          return yield* Effect.succeed(5)
        },
        function(this: unknown, effect) {
          receivers.push(this)
          return effect
        }
      )
      const result = yield* fn()
      assert.deepStrictEqual([receivers, result], [[undefined], 5])
    }))

  it.effect("control: thrown body defect is preserved", () =>
    Effect.gen(function*() {
      const error = new Error("body defect")
      const fn = Effect.fnUntracedEager(
        function*() {
          yield* Effect.succeed(1)
          throw error
        },
        (effect) => effect
      )
      assert.deepStrictEqual(yield* Effect.exit(fn()), Exit.die(error))
    }))

  it("control: thrown transform stops the chain synchronously", () => {
    const error = new Error("transform defect")
    const calls: Array<string> = []
    const fn = Effect.fnUntracedEager(
      function*() {
        calls.push("body")
        return yield* Effect.succeed(1)
      },
      () => {
        calls.push("transform")
        throw error
      },
      () => calls.push("unreachable")
    )
    let caught: unknown
    try {
      fn()
    } catch (cause) {
      caught = cause
    }
    assert.deepStrictEqual([caught === error, calls], [true, ["body", "transform"]])
  })
})
