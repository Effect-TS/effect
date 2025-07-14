import * as Chunk from "effect/Chunk"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import { pipe } from "effect/Function"
import * as Option from "effect/Option"
import * as Queue from "effect/Queue"
import * as Ref from "effect/Ref"

export interface ChunkCoordination<A> {
  readonly queue: Queue.Queue<Exit.Exit<Chunk.Chunk<A>, Option.Option<never>>>
  readonly offer: Effect.Effect<void>
  readonly proceed: Effect.Effect<void>
  readonly awaitNext: Effect.Effect<void>
}

export const chunkCoordination = <A>(
  _chunks: Iterable<Chunk.Chunk<A>>
): Effect.Effect<ChunkCoordination<A>> =>
  Effect.gen(function*() {
    const chunks = Chunk.fromIterable(_chunks)
    const queue = yield* Queue.unbounded<Exit.Exit<Chunk.Chunk<A>, Option.Option<never>>>()
    const ps = yield* Queue.unbounded<void>()
    const ref = yield* Ref.make<Chunk.Chunk<Chunk.Chunk<Exit.Exit<Chunk.Chunk<A>, Option.Option<never>>>>>(
      pipe(
        chunks,
        Chunk.dropRight(1),
        Chunk.map((chunk) => Chunk.of(Exit.succeed(chunk))),
        Chunk.appendAll(
          pipe(
            Chunk.last(chunks),
            Option.map((chunk) =>
              Chunk.unsafeFromArray<Exit.Exit<Chunk.Chunk<A>, Option.Option<never>>>([
                Exit.succeed(chunk),
                Exit.fail(Option.none())
              ])
            ),
            Option.match({
              onNone: () => Chunk.empty<Chunk.Chunk<Exit.Exit<Chunk.Chunk<A>, Option.Option<never>>>>(),
              onSome: Chunk.of
            })
          )
        )
      )
    )
    return {
      queue,
      offer: pipe(
        Ref.modify(ref, (chunk) => {
          if (Chunk.isEmpty(chunk)) {
            return [Chunk.empty(), Chunk.empty()]
          }
          return [Chunk.unsafeHead(chunk), Chunk.drop(1)(chunk)]
        }),
        Effect.flatMap((chunks) => Queue.offerAll(queue, chunks)),
        Effect.asVoid
      ),
      proceed: pipe(Queue.offer(ps, void 0), Effect.asVoid),
      awaitNext: Queue.take(ps)
    }
  })
