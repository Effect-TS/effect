import type { Cause, Effect, NonEmptyIterable } from "effect"
import { Random } from "effect"
import { describe, expect, it } from "tstyche"

declare const nonEmptyIterable: NonEmptyIterable.NonEmptyIterable<string>
declare const readonlyValues: ReadonlyArray<number>

describe("Random", () => {
  it("exposes its service type", () => {
    const service: Random.Random = {
      nextIntUnsafe: () => 1,
      nextDoubleUnsafe: () => 0.5
    }

    expect(service).type.toBe<typeof Random.Random.Service>()
  })

  describe("choice", () => {
    it("returns an infallible effect for non-empty arrays", () => {
      expect(Random.choice([1, 2, 3] as const)).type.toBe<Effect.Effect<1 | 2 | 3>>()
    })

    it("returns an infallible effect for non-empty iterables", () => {
      expect(Random.choice(nonEmptyIterable)).type.toBe<Effect.Effect<string>>()
    })

    it("can fail for iterables not known to be non-empty", () => {
      expect(Random.choice(readonlyValues)).type.toBe<Effect.Effect<number, Cause.NoSuchElementError>>()
    })
  })
})
