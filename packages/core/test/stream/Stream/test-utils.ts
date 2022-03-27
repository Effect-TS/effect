import type { Chunk } from "../../../src/collection/immutable/Chunk"
import { List } from "../../../src/collection/immutable/List"
import { Tuple } from "../../../src/collection/immutable/Tuple"
import { tag } from "../../../src/data/Has"
import { Option } from "../../../src/data/Option"
import type { UIO } from "../../../src/io/Effect"
import { Effect } from "../../../src/io/Effect"
import { Exit } from "../../../src/io/Exit"
import { Queue } from "../../../src/io/Queue"
import { Ref } from "../../../src/io/Ref"

export const NumberServiceId = Symbol.for("@effect-ts/core/test/stream/NumberService")
export type NumberServiceId = typeof NumberServiceId

export interface NumberService {
  readonly n: number
}

export const NumberService = tag<NumberService>()

export interface ChunkCoordination<A> {
  readonly queue: Queue<Exit<Option<never>, Chunk<A>>>
  readonly offer: UIO<boolean>
  readonly proceed: UIO<void>
  readonly awaitNext: UIO<void>
}

export function chunkCoordination<A>(
  chunks: List<Chunk<A>>
): UIO<ChunkCoordination<A>> {
  return Effect.Do()
    .bind("queue", () => Queue.unbounded<Exit<Option<never>, Chunk<A>>>())
    .bind("ps", () => Queue.unbounded<void>())
    .bind("ref", () =>
      Ref.make<List<List<Exit<Option<never>, Chunk<A>>>>>(
        chunks.dropLast(1).map((chunk) => List(Exit.succeed(chunk))) +
          chunks.last
            .map((chunk) =>
              List<Exit<Option<never>, Chunk<A>>>(
                Exit.succeed(chunk),
                Exit.fail(Option.emptyOf<never>())
              )
            )
            .fold(List.empty<List<Exit<Option<never>, Chunk<A>>>>(), (list) =>
              List(list)
            )
      )
    )
    .map(({ ps, queue, ref }) => ({
      queue,
      offer: ref
        .modify((list) =>
          list.foldLeft(
            Tuple(
              List.empty<Exit<Option<never>, Chunk<A>>>(),
              List.empty<List<Exit<Option<never>, Chunk<A>>>>()
            ),
            (x, xs) => Tuple(x, xs)
          )
        )
        .flatMap((list) => queue.offerAll(list)),
      proceed: ps.offer(undefined).asUnit(),
      awaitNext: ps.take()
    }))
}
