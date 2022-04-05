export const NumberServiceId = Symbol.for("@effect-ts/core/test/stream/Stream/NumberService");
export type NumberServiceId = typeof NumberServiceId;

export interface NumberService {
  readonly n: number;
}

export const NumberService = Service<NumberService>(NumberServiceId);

export interface ChunkCoordination<A> {
  readonly queue: Queue<Exit<Option<never>, Chunk<A>>>;
  readonly offer: UIO<boolean>;
  readonly proceed: UIO<void>;
  readonly awaitNext: UIO<void>;
}

export function chunkCoordination<A>(
  chunks: Chunk<Chunk<A>>
): UIO<ChunkCoordination<A>> {
  return Effect.Do()
    .bind("queue", () => Queue.unbounded<Exit<Option<never>, Chunk<A>>>())
    .bind("ps", () => Queue.unbounded<void>())
    .bind("ref", () =>
      Ref.make<Chunk<Chunk<Exit<Option<never>, Chunk<A>>>>>(
        chunks.dropRight(1).map((chunk) => Chunk(Exit.succeed(chunk))) +
          chunks.last
            .map((chunk) =>
              Chunk.from<Exit<Option<never>, Chunk<A>>>([
                Exit.succeed(chunk),
                Exit.fail(Option.emptyOf<never>())
              ])
            )
            .fold(Chunk.empty<Chunk<Exit<Option<never>, Chunk<A>>>>(), (chunk) => Chunk(chunk))
      ))
    .map(({ ps, queue, ref }) => ({
      queue,
      offer: ref
        .modify((chunk) => {
          if (chunk.isEmpty()) {
            return Tuple(
              Chunk.empty<Exit<Option<never>, Chunk<A>>>(),
              Chunk.empty<Chunk<Exit<Option<never>, Chunk<A>>>>()
            );
          }
          const head = chunk.unsafeHead()!;
          const tail = chunk.size === 1 ? Chunk.empty<Chunk<Exit<Option<never>, Chunk<A>>>>() : chunk.unsafeTail()!;
          return Tuple(head, tail);
        })
        .flatMap((list) => queue.offerAll(list)),
      proceed: ps.offer(undefined).asUnit(),
      awaitNext: ps.take
    }));
}
