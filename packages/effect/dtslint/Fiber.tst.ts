import type { Effect, Exit } from "effect"
import { Fiber } from "effect"
import { describe, expect, it } from "tstyche"

declare const string: Fiber.Fiber<string>
declare const number: Fiber.Fiber<number>
declare const arrayOfStringOrNumber: Array<Fiber.Fiber<string> | Fiber.Fiber<number>>

describe("Fiber", () => {
  it("awaitAll", () => {
    expect(Fiber.awaitAll([string, number])).type.toBe<
      Effect.Effect<[Exit.Exit<string>, Exit.Exit<number>]>
    >()
    expect(Fiber.awaitAll(new Set([string, number]))).type.toBe<
      Effect.Effect<Array<Exit.Exit<string> | Exit.Exit<number>>>
    >()
    expect(Fiber.awaitAll(arrayOfStringOrNumber)).type.toBe<
      Effect.Effect<Array<Exit.Exit<string> | Exit.Exit<number>>>
    >()
  })
})
