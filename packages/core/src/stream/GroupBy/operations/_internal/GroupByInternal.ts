import type { GroupBy, UniqueKey } from "@effect/core/stream/GroupBy/definition/base"
import { GroupBySym } from "@effect/core/stream/GroupBy/definition/base"
import { _A, _E, _K, _R, _V } from "@effect/core/stream/GroupBy/definition/symbols"
import { mapDequeue } from "@effect/core/stream/GroupBy/operations/_internal/mapDequeue"

export class GroupByInternal<R, E, K, V, A> implements GroupBy<R, E, K, V, A> {
  readonly [GroupBySym]: GroupBySym = GroupBySym
  readonly [_R]!: (_: R) => void
  readonly [_E]!: () => E
  readonly [_K]!: () => K
  readonly [_V]!: () => V
  readonly [_A]!: () => A

  constructor(
    readonly stream: Stream<R, E, A>,
    readonly key: (a: A) => Effect<R, E, readonly [K, V]>,
    readonly buffer: number
  ) {}

  /**
   * Run the function across all groups, collecting the results in an
   * arbitrary order.
   */
  apply<R1, E1, A1>(
    f: (k: K, stream: Stream<never, E, V>) => Stream<R1, E1, A1>
  ): Stream<R | R1, E | E1, A1> {
    return this.grouped().flatMapPar(
      Number.MAX_SAFE_INTEGER,
      ([key, queue]) => f(key, Stream.fromQueueWithShutdown(queue).flattenExitMaybe),
      this.buffer
    )
  }

  grouped(): Stream<R, E, readonly [K, Dequeue<Exit<Maybe<E>, V>>]> {
    return Stream.unwrapScoped(
      Do(($) => {
        const decider = $(
          Deferred.make<never, (k: K, v: V) => Effect<never, never, Predicate<UniqueKey>>>()
        )
        const out = $(
          Effect.acquireRelease(
            Queue.bounded<Exit<Maybe<E>, readonly [K, Dequeue<Exit<Maybe<E>, V>>]>>(
              this.buffer
            ),
            (queue) => queue.shutdown
          )
        )
        const ref = $(Ref.make(HashMap.empty<K, UniqueKey>()))
        const add = $(
          this.stream.mapEffect(this.key).distributedWithDynamic(
            this.buffer,
            ([k, v]) => decider.await.flatMap((f) => f(k, v)),
            (exit) => out.offer(exit)
          )
        )
        $(
          decider.succeed(
            (k: K, _: V) =>
              ref.get
                .map((map) => map.get(k))
                .flatMap((option) =>
                  option.fold(
                    add.flatMap(([id, queue]) =>
                      (
                        ref.update((map) => map.set(k, id)) >
                          out.offer(
                            Exit.succeed(
                              [
                                k,
                                mapDequeue(queue, (exit) => exit.map((_) => _[1]))
                              ] as const
                            )
                          )
                      ).as((n: number) => n === id)
                    ),
                    (id) => Effect.succeed((n: number) => n === id)
                  )
                )
          )
        )
        return Stream.fromQueueWithShutdown(out).flattenExitMaybe
      })
    )
  }

  /**
   * Only consider the first `n` groups found in the stream.
   */
  first(n: number): GroupByInternal<R, E, K, V, A> {
    return new FirstInternal(this.stream, this.key, this.buffer, n)
  }

  /**
   * Filter the groups to be processed.
   */
  filter(f: Predicate<K>): GroupByInternal<R, E, K, V, A> {
    return new FilterInternal(this.stream, this.key, this.buffer, f)
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
    key: (a: A) => Effect<R, E, readonly [K, V]>,
    buffer: number,
    readonly n: number
  ) {
    super(stream, key, buffer)
  }

  grouped(): Stream<R, E, readonly [K, Dequeue<Exit<Maybe<E>, V>>]> {
    return super
      .grouped()
      .zipWithIndex
      .filterEffect((elem) => {
        const [
          [_, queue],
          i
        ] = elem
        return i < this.n
          ? Effect.succeed(elem).as(true)
          : queue.shutdown.as(false)
      })
      .map((tuple) => tuple[0])
  }
}

export class FilterInternal<R, E, K, V, A> extends GroupByInternal<R, E, K, V, A> {
  constructor(
    stream: Stream<R, E, A>,
    key: (a: A) => Effect<R, E, readonly [K, V]>,
    buffer: number,
    readonly f: Predicate<K>
  ) {
    super(stream, key, buffer)
  }

  grouped(): Stream<R, E, readonly [K, Dequeue<Exit<Maybe<E>, V>>]> {
    return super.grouped().filterEffect((elem) => {
      const [k, queue] = elem
      return this.f(k)
        ? Effect.succeed(elem).as(true)
        : queue.shutdown.as(false)
    })
  }
}
