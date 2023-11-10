import { Chunk, Effect, Exit, Option, Queue, Ref } from "effect"
import { pipe } from "effect/Function"

export interface ChunkCoordination<A> {
  readonly queue: Queue<Exit<Option<never>, Chunk<A>>>
  readonly offer: Effect<never, never, void>
  readonly proceed: Effect<never, never, void>
  readonly awaitNext: Effect<never, never, void>
}

export const chunkCoordination = <A>(
  _chunks: Iterable<Chunk<A>>
): Effect<never, never, ChunkCoordination<A>> =>
  Effect.gen(function*($) {
    const chunks = Chunk.fromIterable(_chunks)
    const queue = yield* $(Queue.unbounded<Exit<Option<never>, Chunk<A>>>())
    const ps = yield* $(Queue.unbounded<void>())
    const ref = yield* $(Ref.make<Chunk<Chunk<Exit<Option<never>, Chunk<A>>>>>(
      pipe(
        chunks,
        Chunk.dropRight(1),
        Chunk.map((chunk) => Chunk.of(Exit.succeed(chunk))),
        Chunk.appendAll(
          pipe(
            Chunk.last(chunks),
            Option.map((chunk) =>
              Chunk.unsafeFromArray<Exit<Option<never>, Chunk<A>>>([
                Exit.succeed(chunk),
                Exit.fail(Option.none())
              ])
            ),
            Option.match({
              onNone: () => Chunk.empty<Chunk<Exit<Option<never>, Chunk<A>>>>(),
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
