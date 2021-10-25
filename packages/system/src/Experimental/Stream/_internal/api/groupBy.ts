// ets_tracing: off

import * as Mp from "../../../../Collections/Immutable/Map"
import * as Tp from "../../../../Collections/Immutable/Tuple"
import * as T from "../../../../Effect"
import * as Ex from "../../../../Exit"
import type { Predicate } from "../../../../Function"
import { pipe } from "../../../../Function"
import * as M from "../../../../Managed"
import * as O from "../../../../Option"
import * as P from "../../../../Promise"
import * as Q from "../../../../Queue"
import * as Ref from "../../../../Ref"
import * as GB from "../../GroupBy"
import type * as C from "../core"
import * as DistributedWithDynamic from "./distributedWithDynamic"
import * as FlattenExitOption from "./flattenExitOption"
import * as FromQueueWithShutdown from "./fromQueueWithShutdown"
import * as MapEffect from "./mapEffect"
import * as UnwrapManaged from "./unwrapManaged"

type UniqueKey = number

/**
 * More powerful version of `Stream.groupByKey`
 */
export function groupBy_<R, R1, E, E1, A, K, V>(
  self: C.Stream<R, E, A>,
  f: (a: A) => T.Effect<R1, E1, Tp.Tuple<[K, V]>>,
  buffer = 16
): GB.GroupBy<R & R1, E | E1, K, V> {
  const qstream = UnwrapManaged.unwrapManaged(
    pipe(
      M.do,
      M.bind("decider", () =>
        T.toManaged(P.make<never, (k: K, v: V) => T.UIO<Predicate<UniqueKey>>>())
      ),
      M.bind("out", () =>
        T.toManagedRelease_(
          Q.makeBounded<
            Ex.Exit<
              O.Option<E | E1>,
              Tp.Tuple<[K, Q.Dequeue<Ex.Exit<O.Option<E | E1>, V>>]>
            >
          >(buffer),
          Q.shutdown
        )
      ),
      M.bind("ref", () => T.toManaged(Ref.makeRef<Mp.Map<K, UniqueKey>>(Mp.empty))),
      M.bind("add", ({ decider, out }) =>
        pipe(
          self,
          MapEffect.mapEffect(f),
          DistributedWithDynamic.distributedWithDynamic(
            buffer,
            ({ tuple: [k, v] }) => T.chain_(P.await(decider), (_) => _(k, v)),
            (_) => Q.offer_(out, _)
          )
        )
      ),
      M.tap(({ add, decider, out, ref }) =>
        T.toManaged(
          P.succeed_(decider, (k, _) =>
            pipe(
              ref.get,
              T.map((_) => Mp.lookup_(_, k)),
              T.chain(
                O.fold(
                  () =>
                    T.chain_(add, ({ tuple: [idx, q] }) => {
                      return T.as_(
                        T.zipRight_(
                          Ref.update_(ref, Mp.insert(k, idx)),
                          Q.offer_(
                            out,
                            Ex.succeed(Tp.tuple(k, Q.map_(q, Ex.map(Tp.get(1)))))
                          )
                        ),
                        (_) => _ === idx
                      )
                    }),
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

  return new GB.GroupBy(qstream, buffer)
}

/**
 * More powerful version of `Stream.groupByKey`
 *
 * @ets_data_first groupBy_
 */
export function groupBy<R1, E1, A, K, V>(
  f: (a: A) => T.Effect<R1, E1, Tp.Tuple<[K, V]>>,
  buffer = 16
) {
  return <R, E>(self: C.Stream<R, E, A>) => groupBy_(self, f, buffer)
}
