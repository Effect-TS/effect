import * as Chunk from "effect/Chunk"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import { pipe } from "effect/Function"
import * as Option from "effect/Option"
import * as Queue from "effect/Queue"
import * as Ref from "effect/Ref"

export interface ChunkCoordination<A> {
  readonly queue: Queue.Queue<Exit.Exit<Option.Option<never>, Chunk.Chunk<A>>>
  readonly offer: Effect.Effect<never, never, void>
  readonly proceed: Effect.Effect<never, never, void>
  readonly awaitNext: Effect.Effect<never, never, void>
}

export const chunkCoordination = <A>(
  _chunks: Iterable<Chunk.Chunk<A>>
): Effect.Effect<never, never, ChunkCoordination<A>> =>
  Effect.gen(function*($) {
    const chunks = Chunk.fromIterable(_chunks)
    const queue = yield* $(Queue.unbounded<Exit.Exit<Option.Option<never>, Chunk.Chunk<A>>>())
    const ps = yield* $(Queue.unbounded<void>())
    const ref = yield* $(Ref.make<Chunk.Chunk<Chunk.Chunk<Exit.Exit<Option.Option<never>, Chunk.Chunk<A>>>>>(
      pipe(
        chunks,
        Chunk.dropRight(1),
        Chunk.map((chunk) => Chunk.of(Exit.succeed(chunk))),
        Chunk.appendAll(
          pipe(
            Chunk.last(chunks),
            Option.map((chunk) =>
              Chunk.unsafeFromArray<Exit.Exit<Option.Option<never>, Chunk.Chunk<A>>>([
                Exit.succeed(chunk),
                Exit.fail(Option.none())
              ])
            ),
            Option.match({
              onNone: () => Chunk.empty<Chunk.Chunk<Exit.Exit<Option.Option<never>, Chunk.Chunk<A>>>>(),
              onSome: Chunk.of
            })
          )
        )
      )
    ))
    return {
      queue,
      offer: pipe(
        Ref.modify(ref, (chunk) => {
          if (Chunk.isEmpty(chunk)) {
            return [Chunk.empty(), Chunk.empty()]
          }
          return [Chunk.unsafeHead(chunk), Chunk.drop(1)(chunk)]
        }),
        Effect.flatMap((chunks) => pipe(Queue.offerAll(queue, chunks))),
        Effect.asUnit
      ),
      proceed: pipe(Queue.offer(ps, void 0), Effect.asUnit),
      awaitNext: Queue.take(ps)
    }
  })
