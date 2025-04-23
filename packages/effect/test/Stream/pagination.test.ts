import { describe, it } from "@effect/vitest"
import { deepStrictEqual } from "@effect/vitest/utils"
import * as Chunk from "effect/Chunk"
import * as Effect from "effect/Effect"
import { pipe } from "effect/Function"
import * as Option from "effect/Option"
import * as Stream from "effect/Stream"

describe("Stream", () => {
  it.effect("paginate", () =>
    Effect.gen(function*() {
      const s: readonly [number, Array<number>] = [0, [1, 2, 3]]
      const result = yield* pipe(
        Stream.paginate(s, ([n, nums]) =>
          nums.length === 0 ?
            [n, Option.none()] as const :
            [n, Option.some([nums[0], nums.slice(1)] as const)] as const),
        Stream.runCollect
      )
      deepStrictEqual(Array.from(result), [0, 1, 2, 3])
    }))

  it.effect("paginateEffect", () =>
    Effect.gen(function*() {
      const s: readonly [number, Array<number>] = [0, [1, 2, 3]]
      const result = yield* pipe(
        Stream.paginateEffect(
          s,
          (
            [n, nums]
          ): Effect.Effect<readonly [number, Option.Option<readonly [number, Array<number>]>]> =>
            nums.length === 0 ?
              Effect.succeed([n, Option.none()]) :
              Effect.succeed([n, Option.some([nums[0], nums.slice(1)])])
        ),
        Stream.runCollect
      )
      deepStrictEqual(Array.from(result), [0, 1, 2, 3])
    }))

  it.effect("paginateChunk", () =>
    Effect.gen(function*() {
      const s: readonly [Chunk.Chunk<number>, Array<number>] = [Chunk.of(0), [1, 2, 3, 4, 5]]
      const pageSize = 2
      const result = yield* pipe(
        Stream.paginateChunk(s, ([chunk, nums]) =>
          nums.length === 0 ?
            [chunk, Option.none()] as const :
            [
              chunk,
              Option.some(
                [
                  Chunk.fromIterable(nums.slice(0, pageSize)),
                  nums.slice(pageSize)
                ] as const
              )
            ] as const),
        Stream.runCollect
      )
      deepStrictEqual(Array.from(result), [0, 1, 2, 3, 4, 5])
    }))

  it.effect("paginateChunkEffect", () =>
    Effect.gen(function*() {
      const s: readonly [Chunk.Chunk<number>, Array<number>] = [Chunk.of(0), [1, 2, 3, 4, 5]]
      const pageSize = 2
      const result = yield* pipe(
        Stream.paginateChunkEffect(s, ([chunk, nums]) =>
          nums.length === 0 ?
            Effect.succeed([chunk, Option.none<readonly [Chunk.Chunk<number>, Array<number>]>()] as const) :
            Effect.succeed(
              [
                chunk,
                Option.some(
                  [
                    Chunk.fromIterable(nums.slice(0, pageSize)),
                    nums.slice(pageSize)
                  ] as const
                )
              ] as const
            )),
        Stream.runCollect
      )
      deepStrictEqual(Array.from(result), [0, 1, 2, 3, 4, 5])
    }))
})
