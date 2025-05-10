import { describe, it } from "@effect/vitest"
import { assertSome, assertTrue, strictEqual } from "@effect/vitest/utils"
import * as Chunk from "effect/Chunk"
import * as Effect from "effect/Effect"
import * as Either from "effect/Either"
import { constVoid, pipe } from "effect/Function"
import * as Option from "effect/Option"
import * as Random from "effect/Random"
import * as Sink from "effect/Sink"
import * as Stream from "effect/Stream"
import { unfoldEffect } from "../utils/unfoldEffect.js"

const findSink = <A>(a: A): Sink.Sink<A, A, A, void> =>
  pipe(
    Sink.fold<Option.Option<A>, A>(
      Option.none(),
      Option.isNone,
      (_, v) => (a === v ? Option.some(a) : Option.none())
    ),
    Sink.mapEffect(Option.match({
      onNone: () => Effect.failSync(constVoid),
      onSome: Effect.succeed
    }))
  )

const zipParLaw = <A, B, C, E>(
  stream: Stream.Stream<A>,
  sink1: Sink.Sink<B, A, A, E>,
  sink2: Sink.Sink<C, A, A, E>
): Effect.Effect<boolean> =>
  pipe(
    Effect.all({
      zb: pipe(stream, Stream.run(sink1), Effect.either),
      zc: pipe(stream, Stream.run(sink2), Effect.either),
      zbc: pipe(stream, Stream.run(pipe(sink1, Sink.zip(sink2, { concurrent: true }))), Effect.either)
    }),
    Effect.map(({ zb, zbc, zc }) =>
      Either.match(zbc, {
        onLeft: (e) => (Either.isLeft(zb) && zb.left === e) || (Either.isLeft(zc) && zc.left === e),
        onRight: ([b, c]) => Either.isRight(zb) && zb.right === b && Either.isRight(zc) && zc.right === c
      })
    )
  )

describe("Sink", () => {
  it.effect("zipParLeft", () =>
    Effect.gen(function*() {
      const result = yield* pipe(
        Stream.make(1, 2, 3),
        Stream.run(pipe(
          Sink.head(),
          Sink.zipLeft(Sink.succeed("hello"), { concurrent: true })
        ))
      )
      assertSome(result, 1)
    }))

  it.effect("zipParRight", () =>
    Effect.gen(function*() {
      const result = yield* pipe(
        Stream.make(1, 2, 3),
        Stream.run(pipe(
          Sink.head(),
          Sink.zipRight(Sink.succeed("hello"), { concurrent: true })
        ))
      )
      strictEqual(result, "hello")
    }))

  it.effect("zipWithPar - coherence", () =>
    Effect.gen(function*() {
      const ints = yield* (unfoldEffect(0, (n) =>
        pipe(
          Random.nextIntBetween(0, 10),
          Effect.map((i) => n < 20 ? Option.some([i, n + 1] as const) : Option.none())
        )))
      const success1 = yield* (Random.nextBoolean)
      const success2 = yield* (Random.nextBoolean)
      const chunk = pipe(
        Chunk.unsafeFromArray(ints),
        Chunk.appendAll(success1 ? Chunk.of(20) : Chunk.empty<number>()),
        Chunk.appendAll(success2 ? Chunk.of(40) : Chunk.empty<number>())
      )
      const result = yield* (
        zipParLaw(
          Stream.fromIterableEffect(Random.shuffle(chunk)),
          findSink(20),
          findSink(40)
        )
      )
      assertTrue(result)
    }))
})
