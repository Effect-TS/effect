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
  readonly offer: Effect<never, never, void>
  readonly proceed: Effect<never, never, void>
  readonly awaitNext: Effect<never, never, void>
}

export function chunkCoordination<A>(
  chunks: List<Chunk<A>>
): Effect<never, never, ChunkCoordination<A>> {
  return Do(($) => {
    const queue = $(Queue.unbounded<Exit<Maybe<never>, Chunk<A>>>())
    const ps = $(Queue.unbounded<void>())
    const list = List.from(chunks.take(chunks.length - 1))
      .map((chunk) => List(Exit.succeed(chunk)))
      .concat(
        chunks.last
          .map((chunk) => List(Exit.succeed(chunk), Exit.fail(Maybe.none)))
          .fold(List.empty<List<Exit<Maybe<never>, Chunk<A>>>>(), (a) => List(a))
      )
    const ref = $(Ref.make(list))
    return {
      queue,
      offer: ref.modify((list) =>
        list.isNil()
          ? [List.nil(), List.nil()] as const
          : [list.head, list.tail] as const
      ).flatMap((list) => queue.offerAll(list)).unit,
      proceed: ps.offer(undefined).unit,
      awaitNext: ps.take
    }
  })
}
