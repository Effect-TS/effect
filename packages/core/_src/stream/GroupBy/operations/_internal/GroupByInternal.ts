import type { GroupBy, UniqueKey } from "@effect/core/stream/GroupBy/definition/base";
import { GroupBySym } from "@effect/core/stream/GroupBy/definition/base";
import { _A, _E, _K, _R, _V } from "@effect/core/stream/GroupBy/definition/symbols";
import { mapDequeue } from "@effect/core/stream/GroupBy/operations/_internal/mapDequeue";

export class GroupByInternal<R, E, K, V, A> implements GroupBy<R, E, K, V, A> {
  readonly [GroupBySym]: GroupBySym = GroupBySym;
  readonly [_R]!: (_: R) => void;
  readonly [_E]!: () => E;
  readonly [_K]!: () => K;
  readonly [_V]!: () => V;
  readonly [_A]!: () => A;

  constructor(
    readonly stream: Stream<R, E, A>,
    readonly key: (a: A) => Effect<R, E, Tuple<[K, V]>>,
    readonly buffer: number
  ) {}

  /**
   * Run the function across all groups, collecting the results in an
   * arbitrary order.
   */
  apply<R1, E1, A1>(
    f: (k: K, stream: Stream<unknown, E, V>) => Stream<R1, E1, A1>,
    __tsplusTrace?: string
  ): Stream<R & R1, E | E1, A1> {
    return this.grouped().flatMapPar(
      Number.MAX_SAFE_INTEGER,
      ({ tuple: [key, queue] }) => f(key, Stream.fromQueueWithShutdown(queue).flattenExitOption()),
      this.buffer
    );
  }

  grouped(
    __tsplusTrace?: string
  ): Stream<R, E, Tuple<[K, Dequeue<Exit<Option<E>, V>>]>> {
    return Stream.unwrapScoped(
      Effect.Do()
        .bind("decider", () => Deferred.make<never, (k: K, v: V) => Effect.UIO<Predicate<UniqueKey>>>())
        .bind("out", () =>
          Effect.acquireRelease(
            Queue.bounded<Exit<Option<E>, Tuple<[K, Dequeue<Exit<Option<E>, V>>]>>>(
              this.buffer
            ),
            (queue) => queue.shutdown
          ))
        .bind("ref", () => Ref.make(HashMap.empty<K, UniqueKey>()))
        .bind("add", ({ decider, out }) =>
          this.stream.mapEffect(this.key).distributedWithDynamic(
            this.buffer,
            ({ tuple: [k, v] }) => decider.await().flatMap((f) => f(k, v)),
            (exit) => out.offer(exit)
          ))
        .tap(({ add, decider, out, ref }) =>
          decider.succeed(
            () =>
              (k: K, _: V) =>
                ref
                  .get()
                  .map((map) => map.get(k))
                  .flatMap((option) =>
                    option.fold(
                      add.flatMap(({ tuple: [id, queue] }) =>
                        (
                          ref.update((map) => map.set(k, id)) >
                            out.offer(
                              Exit.succeed(
                                Tuple(
                                  k,
                                  mapDequeue(queue, (exit) => exit.map((_) => _.get(1)))
                                )
                              )
                            )
                        ).as(() => (n: number) => n === id)
                      ),
                      (id) => Effect.succeedNow((n: number) => n === id)
                    )
                  )
          )
        )
        .map(({ out }) => Stream.fromQueueWithShutdown(out).flattenExitOption())
    );
  }

  /**
   * Only consider the first `n` groups found in the stream.
   */
  first(n: number, __tsplusTrace?: string): GroupByInternal<R, E, K, V, A> {
    return new FirstInternal(this.stream, this.key, this.buffer, n);
  }

  /**
   * Filter the groups to be processed.
   */
  filter(f: Predicate<K>, __tsplusTrace?: string): GroupByInternal<R, E, K, V, A> {
    return new FilterInternal(this.stream, this.key, this.buffer, f);
  }
}

/**
 * @tsplus macro remove
 */
export function concreteGroupBy<R, E, K, V, A>(
  _: GroupBy<R, E, K, V, A>
): asserts _ is GroupByInternal<R, E, K, V, A> {
  //
}

export class FirstInternal<R, E, K, V, A> extends GroupByInternal<R, E, K, V, A> {
  constructor(
    stream: Stream<R, E, A>,
    key: (a: A) => Effect<R, E, Tuple<[K, V]>>,
    buffer: number,
    readonly n: number
  ) {
    super(stream, key, buffer);
  }

  grouped(
    __tsplusTrace?: string
  ): Stream<R, E, Tuple<[K, Dequeue<Exit<Option<E>, V>>]>> {
    return super
      .grouped()
      .zipWithIndex()
      .filterEffect((elem) => {
        const {
          tuple: [
            {
              tuple: [_, queue]
            },
            i
          ]
        } = elem;
        return i < this.n
          ? Effect.succeedNow(elem).as(() => true)
          : queue.shutdown.as(() => false);
      })
      .map((tuple) => tuple.get(0));
  }
}

export class FilterInternal<R, E, K, V, A> extends GroupByInternal<R, E, K, V, A> {
  constructor(
    stream: Stream<R, E, A>,
    key: (a: A) => Effect<R, E, Tuple<[K, V]>>,
    buffer: number,
    readonly f: Predicate<K>
  ) {
    super(stream, key, buffer);
  }

  grouped(
    __tsplusTrace?: string
  ): Stream<R, E, Tuple<[K, Dequeue<Exit<Option<E>, V>>]>> {
    return super.grouped().filterEffect((elem) => {
      const {
        tuple: [k, queue]
      } = elem;
      return this.f(k)
        ? Effect.succeedNow(elem).as(() => true)
        : queue.shutdown.as(() => false);
    });
  }
}
