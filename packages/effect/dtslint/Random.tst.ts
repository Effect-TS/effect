import type { Array, Cause, Chunk, Effect } from "effect"
import { Random } from "effect"
import { describe, expect, it } from "tstyche"

declare const array: Array<number>
declare const nonEmptyArray: Array.NonEmptyArray<number>

declare const readonlyArray: Array<number>
declare const nonEmptyReadonlyArray: Array.NonEmptyArray<number>

declare const chunk: Chunk.Chunk<number>
declare const nonEmptyChunk: Chunk.NonEmptyChunk<number>

describe("Random", () => {
  it("choice", () => {
    expect(Random.choice(array)).type.toBe<Effect.Effect<number, Cause.NoSuchElementException, never>>()
    expect(Random.choice(nonEmptyArray)).type.toBe<Effect.Effect<number, never, never>>()
    expect(Random.choice(readonlyArray)).type.toBe<Effect.Effect<number, Cause.NoSuchElementException, never>>()
    expect(Random.choice(nonEmptyReadonlyArray)).type.toBe<Effect.Effect<number, never, never>>()
    expect(Random.choice(chunk)).type.toBe<Effect.Effect<number, Cause.NoSuchElementException, never>>()
    expect(Random.choice(nonEmptyChunk)).type.toBe<Effect.Effect<number, never, never>>()
  })
})
