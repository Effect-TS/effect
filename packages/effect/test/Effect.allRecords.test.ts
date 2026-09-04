import { assert, describe, it } from "@effect/vitest"
import { Context, Effect, Exit, Result } from "effect"

class Left extends Context.Service<Left, { readonly n: number }>()("Left") {}
class Right extends Context.Service<Right, { readonly s: string }>()("Right") {}

describe("all union records runtime preservation", () => {
  it.effect("both disjoint branches use provided services", () =>
    Effect.gen(function*() {
      const left = Effect.map(Left, (s) => s.n)
      const right = Effect.map(Right, (s) => s.s)
      const run = (input: { left: typeof left } | { right: typeof right }) =>
        Effect.all(input).pipe(
          Effect.provideService(Left, { n: 2 }),
          Effect.provideService(Right, { s: "r" })
        )
      assert.deepStrictEqual(yield* run({ left }), { left: 2 })
      assert.deepStrictEqual(yield* run({ right }), { right: "r" })
    }))
  it.effect("branch-specific typed failures and result wrapping", () =>
    Effect.gen(function*() {
      const run = (input: { left: Effect.Effect<never, string> } | { right: Effect.Effect<never, string> }) =>
        Effect.all(input)
      assert.deepStrictEqual<unknown>(yield* Effect.exit(run({ left: Effect.fail("left") })), Exit.fail("left"))
      assert.deepStrictEqual<unknown>(yield* Effect.exit(run({ right: Effect.fail("right") })), Exit.fail("right"))
      assert.deepStrictEqual(yield* Effect.all({ left: Effect.fail("left") }, { mode: "result" }), {
        left: Result.fail("left")
      })
    }))
  it.effect("discard still visits each actual entry exactly once", () =>
    Effect.gen(function*() {
      const visits: Array<string> = []
      const entry = (name: string) =>
        Effect.sync(() => {
          visits.push(name)
          return name
        })
      assert.strictEqual(
        yield* Effect.all({ common: entry("common"), left: entry("left") }, { discard: true }),
        undefined
      )
      assert.deepStrictEqual(visits, ["common", "left"])
    }))
})
