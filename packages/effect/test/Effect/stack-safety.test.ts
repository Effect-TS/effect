import { describe, it } from "@effect/vitest"
import { assertTrue, deepStrictEqual, strictEqual } from "@effect/vitest/utils"
import * as Effect from "effect/Effect"
import { constVoid, identity, pipe } from "effect/Function"
import * as Ref from "effect/Ref"

const deepMapEffect = (n: number): Effect.Effect<number> => {
  const loop = (n: number, acc: Effect.Effect<number>): Effect.Effect<number> => {
    if (n <= 0) {
      return acc
    }
    return Effect.suspend(() => loop(n - 1, pipe(acc, Effect.map((n) => n + 1))))
  }
  return loop(n, Effect.succeed(0))
}

describe("Effect", () => {
  it.effect("deep map of sync effect", () =>
    Effect.gen(function*() {
      const result = yield* (deepMapEffect(10000))
      strictEqual(result, 10000)
    }))
  it.effect("deep attempt", () =>
    Effect.gen(function*() {
      const array = Array.from({ length: 10000 }, (_, i) => i)
      const result = yield* (array.reduce(
        (acc, _) => pipe(Effect.orDie(acc), Effect.either, Effect.asVoid),
        Effect.orDie(Effect.try(constVoid))
      ))
      strictEqual(result, undefined)
    }))
  it.effect("deep flatMap", () =>
    Effect.gen(function*() {
      const fib = (
        n: number,
        a: BigInt = BigInt("0"),
        b: BigInt = BigInt("1")
      ): Effect.Effect<BigInt, Error> => {
        return pipe(
          Effect.sync(() => ((a as any) + (b as any)) as BigInt),
          Effect.flatMap((b2) => n > 0 ? fib(n - 1, b, b2) : Effect.succeed(b2))
        )
      }
      const result = yield* (fib(1000))
      const expected = BigInt(
        "113796925398360272257523782552224175572745930353730513145086634176691092536145985470146129334641866902783673042322088625863396052888690096969577173696370562180400527049497109023054114771394568040040412172632376"
      )
      deepStrictEqual(result, expected)
    }))
  it.effect("deep absolve/attempt is identity", () =>
    Effect.gen(function*() {
      const array = Array.from({ length: 100 }, (_, i) => i)
      const result = yield* (
        array.reduce((acc, _) => Effect.flatMap(Effect.either(acc), identity), Effect.succeed(42))
      )
      strictEqual(result, 42)
    }))
  it.effect("deep async absolve/attempt is identity", () =>
    Effect.gen(function*() {
      const array = Array.from({ length: 1000 }, (_, i) => i)
      const result = yield* (array.reduce(
        (acc, _) => Effect.flatMap(Effect.either(acc), identity),
        Effect.async<unknown, unknown, never>((cb) => {
          cb(Effect.succeed(42))
        })
      ))
      strictEqual(result, 42)
    }))
  it.effect("deep effects", () =>
    Effect.gen(function*() {
      const incLeft = (n: number, ref: Ref.Ref<number>): Effect.Effect<number> => {
        if (n <= 0) {
          return Ref.get(ref)
        }
        return pipe(incLeft(n - 1, ref), Effect.zipLeft(Ref.update(ref, (n) => n + 1)))
      }
      const incRight = (n: number, ref: Ref.Ref<number>): Effect.Effect<number> => {
        if (n <= 0) {
          return Ref.get(ref)
        }
        return pipe(Ref.update(ref, (n) => n + 1), Effect.zipRight(incRight(n - 1, ref)))
      }
      const left = pipe(Ref.make(0), Effect.flatMap((ref) => incLeft(100, ref)), Effect.map((n) => n === 0))
      const right = pipe(Ref.make(0), Effect.flatMap((ref) => incRight(1000, ref)), Effect.map((n) => n === 1000))
      const result = yield* pipe(left, Effect.zipWith(right, (a, b) => a && b))
      assertTrue(result)
    }))
})
