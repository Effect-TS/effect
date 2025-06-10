import { describe, it } from "@effect/vitest"
import * as Util from "@effect/vitest/utils"
import * as Chunk from "effect/Chunk"
import * as Effect from "effect/Effect"
import * as Either from "effect/Either"
import { pipe } from "effect/Function"
import * as Stream from "effect/Stream"

const expectRight = <R, L>(s: Stream.Stream<R, L>, expected: R) => {
  Util.deepStrictEqual(Chunk.toArray(Effect.runSync(Stream.runCollect(Stream.either(s)))), [Either.right(expected)])
}

const expectLeft = <R, L>(s: Stream.Stream<R, L>, expected: L) => {
  Util.deepStrictEqual(Chunk.toArray(Effect.runSync(Stream.runCollect(Stream.either(s)))), [Either.left(expected)])
}

describe("do notation", () => {
  it("Do", () => {
    expectRight(Stream.Do, {})
  })

  it("bindTo", () => {
    expectRight(pipe(Stream.succeed(1), Stream.bindTo("a")), { a: 1 })
    expectLeft(pipe(Stream.fail("left"), Stream.bindTo("a")), "left")
    expectRight(
      pipe(
        Stream.succeed(1),
        Stream.bindTo("__proto__"),
        Stream.let("x", () => 2)
      ),
      { x: 2, ["__proto__"]: 1 }
    )
  })

  it("bind", () => {
    expectRight(pipe(Stream.succeed(1), Stream.bindTo("a"), Stream.bind("b", ({ a }) => Stream.succeed(a + 1))), {
      a: 1,
      b: 2
    })
    expectLeft(
      pipe(Stream.succeed(1), Stream.bindTo("a"), Stream.bind("b", () => Stream.fail("left"))),
      "left"
    )
    expectLeft(
      pipe(Stream.fail("left"), Stream.bindTo("a"), Stream.bind("b", () => Stream.succeed(2))),
      "left"
    )
    expectRight(
      pipe(
        Stream.succeed(1),
        Stream.bindTo("a"),
        (x) =>
          pipe(
            x,
            Stream.bind("__proto__", ({ a }) => Stream.succeed(a + 1))
          ) as Stream.Stream<{ a: number; __proto__: number }, unknown, never>,
        Stream.bind("x", () => Stream.succeed(2))
      ),
      { a: 1, x: 2, ["__proto__"]: 2 }
    )
  })

  it("let", () => {
    expectRight(pipe(Stream.succeed(1), Stream.bindTo("a"), Stream.let("b", ({ a }) => a + 1)), { a: 1, b: 2 })
    expectLeft(
      pipe(Stream.fail("left"), Stream.bindTo("a"), Stream.let("b", () => 2)),
      "left"
    )
    expectRight(
      pipe(
        Stream.succeed(1),
        Stream.bindTo("a"),
        Stream.let("__proto__", ({ a }) => a + 1),
        Stream.let("x", ({ a }) => a + 2)
      ),
      { a: 1, x: 3, ["__proto__"]: 2 }
    )
  })
})
