export const NumberServiceId = Symbol.for("@effect/core/test/stream/Stream/NumberService")
export type NumberServiceId = typeof NumberServiceId

export interface NumberService {
  readonly n: number
}

export const NumberService = Tag<NumberService>()

export class NumberServiceImpl implements NumberService, Equals {
  readonly [NumberServiceId]: NumberServiceId = NumberServiceId

  constructor(readonly n: number) {}

  [Hash.sym](): number {
    return Hash.number(this.n)
  }

  [Equals.sym](u: unknown): boolean {
    return isNumberService(u) && u.n === this.n
  }
}

export function isNumberService(u: unknown): u is NumberService {
  return typeof u === "object" && u != null && NumberServiceId in u
}

export interface ChunkCoordination<A> {
  readonly queue: Queue<Exit<Maybe<never>, Chunk<A>>>
  readonly offer: Effect.UIO<boolean>
  readonly proceed: Effect.UIO<void>
  readonly awaitNext: Effect.UIO<void>
}

export function chunkCoordination<A>(
  chunks: List<Chunk<A>>
): Effect.UIO<ChunkCoordination<A>> {
  return Effect.Do()
    .bind("queue", () => Queue.unbounded<Exit<Maybe<never>, Chunk<A>>>())
    .bind("ps", () => Queue.unbounded<void>())
    .bind("ref", () =>
      Ref.make<List<List<Exit<Maybe<never>, Chunk<A>>>>>(
        List.from(chunks.take(chunks.length - 1)).map((chunk) => List(Exit.succeed(chunk))).concat(
          chunks.last.fold(List.empty(), (chunk) =>
            List(List(Exit.succeed(chunk), Exit.fail(Maybe.none))))
        )
      ))
    .map(({ ps, queue, ref }) => ({
      queue,
      offer: ref.modify((list) =>
        list.isNil()
          ? Tuple(List.nil(), List.nil())
          : Tuple(list.head, list.tail)
      ).flatMap((list) => queue.offerAll(list)),
      proceed: ps.offer(undefined).unit,
      awaitNext: ps.take
    }))
}
