export const NumberServiceId = Symbol.for("@effect/core/test/stream/Stream/NumberService");
export type NumberServiceId = typeof NumberServiceId;

export interface NumberService {
  readonly n: number;
}

export const NumberService = Tag<NumberService>();

export class NumberServiceImpl implements NumberService, Equals {
  readonly [NumberServiceId]: NumberServiceId = NumberServiceId;

  constructor(readonly n: number) {}

  [Hash.sym](): number {
    return Hash.number(this.n);
  }

  [Equals.sym](u: unknown): boolean {
    return isNumberService(u) && u.n === this.n;
  }
}

export function isNumberService(u: unknown): u is NumberService {
  return typeof u === "object" && u != null && NumberServiceId in u;
}

export interface ChunkCoordination<A> {
  readonly queue: Queue<Exit<Option<never>, Chunk<A>>>;
  readonly offer: UIO<boolean>;
  readonly proceed: UIO<void>;
  readonly awaitNext: UIO<void>;
}

export function chunkCoordination<A>(
  chunks: List<Chunk<A>>
): UIO<ChunkCoordination<A>> {
  return Effect.Do()
    .bind("queue", () => Queue.unbounded<Exit<Option<never>, Chunk<A>>>())
    .bind("ps", () => Queue.unbounded<void>())
    .bind("ref", () =>
      Ref.make<List<List<Exit<Option<never>, Chunk<A>>>>>(
        List.from(chunks.take(chunks.length() - 1)).map((chunk) => List(Exit.succeed(chunk))).concat(
          chunks.last().fold(List.empty(), (chunk) => List(List(Exit.succeed(chunk), Exit.fail(Option.none))))
        )
      ))
    .map(({ ps, queue, ref }) => ({
      queue,
      offer: ref.modify((list) =>
        list.isNil()
          ? Tuple(List.nil(), List.nil())
          : Tuple(list.head, list.tail)
      ).flatMap((list) => queue.offerAll(list)),
      proceed: ps.offer(undefined).asUnit(),
      awaitNext: ps.take
    }));
}
