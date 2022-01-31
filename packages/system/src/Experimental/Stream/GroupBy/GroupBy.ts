// ets_tracing: off

import * as Mp from "../../../Collections/Immutable/Map/index.js"
import * as Tp from "../../../Collections/Immutable/Tuple/index.js"
import * as T from "../../../Effect/index.js"
import * as Ex from "../../../Exit/index.js"
import type { Predicate } from "../../../Function/index.js"
import { pipe } from "../../../Function/index.js"
import * as M from "../../../Managed/index.js"
import * as O from "../../../Option/index.js"
import * as P from "../../../Promise/index.js"
import * as Q from "../../../Queue/index.js"
import * as Ref from "../../../Ref/index.js"
import * as ChainPar from "../_internal/api/chainPar.js"
import * as DistributedWithDynamic from "../_internal/api/distributedWithDynamic.js"
import * as FilterEffect from "../_internal/api/filterEffect.js"
import * as FlattenExitOption from "../_internal/api/flattenExitOption.js"
import * as FromQueueWithShutdown from "../_internal/api/fromQueueWithShutdown.js"
import * as Map from "../_internal/api/map.js"
import * as MapEffect from "../_internal/api/mapEffect.js"
import * as UnwrapManaged from "../_internal/api/unwrapManaged.js"
import * as ZipWithIndex from "../_internal/api/zipWithIndex.js"
import type * as C from "../_internal/core.js"

export abstract class GroupBy<R, E, K, V, A> {
  readonly _R!: (_: R) => void
  readonly _E!: () => E
  readonly _K!: () => K
  readonly _V!: () => V
  readonly _A!: () => A
}

export type UniqueKey = number

class GroupByInternal<R, E, K, V, A> extends GroupBy<R, E, K, V, A> {
  constructor(
    readonly stream: C.Stream<R, E, A>,
    readonly key: (a: A) => T.Effect<R, E, Tp.Tuple<[K, V]>>,
    readonly buffer: number
  ) {
    super()
  }

  grouped = UnwrapManaged.unwrapManaged(
    pipe(
      M.do,
      M.bind("decider", () =>
        T.toManaged(P.make<never, (k: K, v: V) => T.UIO<Predicate<UniqueKey>>>())
      ),
      M.bind("out", () =>
        T.toManagedRelease_(
          Q.makeBounded<
            Ex.Exit<O.Option<E>, Tp.Tuple<[K, Q.Dequeue<Ex.Exit<O.Option<E>, V>>]>>
          >(this.buffer),
          Q.shutdown
        )
      ),
      M.bind("ref", () => T.toManaged(Ref.makeRef<Mp.Map<K, UniqueKey>>(Mp.empty))),
      M.bind("add", ({ decider, out }) =>
        pipe(
          this.stream,
          MapEffect.mapEffect(this.key),
          DistributedWithDynamic.distributedWithDynamic(
            this.buffer,
            ({ tuple: [k, v] }: Tp.Tuple<[K, V]>) =>
              T.chain_(P.await(decider), (_) => _(k, v)),
            (_) => Q.offer_(out, _)
          )
        )
      ),
      M.tap(({ add, decider, out, ref }) =>
        T.toManaged(
          P.succeed_(decider, (k, _) =>
            pipe(
              ref.get,
              T.map(Mp.lookup(k)),
              T.chain(
                O.fold(
                  () =>
                    T.chain_(add, ({ tuple: [idx, q] }) =>
                      T.as_(
                        T.zipRight_(
                          Ref.update_(ref, Mp.insert(k, idx)),
                          Q.offer_(
                            out,
                            Ex.succeed(
                              Tp.tuple(
                                k,
                                Q.map_(
                                  q,
                                  Ex.map(({ tuple: [_, a] }) => a)
                                )
                              )
                            )
                          )
                        ),
                        (_) => _ === idx
                      )
                    ),
                  (idx) => T.succeed((_) => _ === idx)
                )
              )
            )
          )
        )
      ),
      M.map(({ out }) =>
        FlattenExitOption.flattenExitOption(
          FromQueueWithShutdown.fromQueueWithShutdown_(out)
        )
      )
    )
  )

  /**
   * Only consider the first n groups found in the stream.
   */
  first(n: number): GroupByInternal<R, E, K, V, A> {
    return new FirstInternal<R, E, K, V, A>(this.stream, this.key, this.buffer, n)
  }

  /**
   * Only consider the first n groups found in the stream.
   */
  filter(f: Predicate<K>): GroupByInternal<R, E, K, V, A> {
    return new FilterInternal(this.stream, this.key, this.buffer, f)
  }

  apply<R1, E1, A1>(
    f: (k: K, stream: C.Stream<unknown, E, V>) => C.Stream<R1, E1, A1>
  ): C.Stream<R & R1, E1 | E, A1> {
    return ChainPar.chainPar_(
      this.grouped,
      Number.MAX_SAFE_INTEGER,
      ({ tuple: [k, q] }) =>
        f(
          k,
          FlattenExitOption.flattenExitOption(
            FromQueueWithShutdown.fromQueueWithShutdown_(q)
          )
        )
    )
  }
}

class FirstInternal<R, E, K, V, A> extends GroupByInternal<R, E, K, V, A> {
  constructor(
    stream: C.Stream<R, E, A>,
    key: (a: A) => T.Effect<R, E, Tp.Tuple<[K, V]>>,
    buffer: number,
    readonly n: number
  ) {
    super(stream, key, buffer)
  }

  grouped = pipe(
    super.grouped,
    ZipWithIndex.zipWithIndex,
    FilterEffect.filterEffect((elem) => {
      const {
        tuple: [
          {
            tuple: [_, q]
          },
          i
        ]
      } = elem

      return i < this.n ? T.as_(T.succeed(elem), true) : T.as_(Q.shutdown(q), false)
    }),
    Map.map(Tp.get(0))
  )
}

class FilterInternal<R, E, K, V, A> extends GroupByInternal<R, E, K, V, A> {
  constructor(
    stream: C.Stream<R, E, A>,
    key: (a: A) => T.Effect<R, E, Tp.Tuple<[K, V]>>,
    buffer: number,
    readonly f: Predicate<K>
  ) {
    super(stream, key, buffer)
  }

  grouped = pipe(
    super.grouped,
    FilterEffect.filterEffect((elem) => {
      const {
        tuple: [k, q]
      } = elem

      return this.f(k) ? T.as_(T.succeed(elem), true) : T.as_(Q.shutdown(q), false)
    })
  )
}

function concrete<R, E, K, V, A>(
  _groupBy: GroupBy<R, E, K, V, A>
): asserts _groupBy is GroupByInternal<R, E, K, V, A> {
  //
}

export function make_<R, E, K, V, A>(
  stream: C.Stream<R, E, A>,
  key: (a: A) => T.Effect<R, E, Tp.Tuple<[K, V]>>,
  buffer: number
): GroupBy<R, E, K, V, A> {
  return new GroupByInternal<R, E, K, V, A>(stream, key, buffer)
}

/**
 * @ets_data_first make_
 */
export function make<R, E, K, V, A>(
  key: (a: A) => T.Effect<R, E, Tp.Tuple<[K, V]>>,
  buffer: number
) {
  return (stream: C.Stream<R, E, A>) => make_(stream, key, buffer)
}

/**
 * Only consider the first n groups found in the stream.
 */
export function filter_<R, E, K, V, A>(
  self: GroupBy<R, E, K, V, A>,
  f: Predicate<K>
): GroupBy<R, E, K, V, A> {
  concrete(self)
  return self.filter(f)
}

/**
 * Only consider the first n groups found in the stream.
 *
 * @ets_data_first filter_
 */
export function filter<K>(f: Predicate<K>) {
  return <R, E, V, A>(self: GroupBy<R, E, K, V, A>) => filter_(self, f)
}

/**
 * Only consider the first n groups found in the stream.
 */
export function first_<R, E, K, V, A>(
  self: GroupBy<R, E, K, V, A>,
  n: number
): GroupBy<R, E, K, V, A> {
  concrete(self)
  return self.first(n)
}

/**
 * Only consider the first n groups found in the stream.
 *
 * @ets_data_first first_
 */
export function first(n: number) {
  return <R, E, K, V, A>(self: GroupBy<R, E, K, V, A>) => first_(self, n)
}

export function mergeGroupBy_<R, R1, E, E1, K, V, A, A1>(
  self: GroupBy<R, E, K, V, A>,
  f: (k: K, stream: C.Stream<unknown, E, V>) => C.Stream<R1, E1, A1>
): C.Stream<R & R1, E | E1, A1> {
  concrete(self)

  return self.apply(f)
}

/**
 * @ets_data_first mergeGroupBy_
 */
export function mergeGroupBy<R1, E, E1, K, V, A, A1>(
  f: (k: K, stream: C.Stream<unknown, E, V>) => C.Stream<R1, E1, A1>
) {
  return <R>(self: GroupBy<R, E, K, V, A>) => mergeGroupBy_(self, f)
}
