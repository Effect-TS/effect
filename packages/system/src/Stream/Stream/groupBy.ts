// tracing: off

import * as MP from "../../Collections/Immutable/Map"
import * as Tp from "../../Collections/Immutable/Tuple"
import * as Ex from "../../Exit"
import { pipe } from "../../Function"
import * as O from "../../Option"
import * as P from "../../Promise"
import * as Q from "../../Queue"
import * as T from "../_internal/effect"
import * as M from "../_internal/managed"
import * as Ref from "../_internal/ref"
import * as GB from "../GroupBy"
import type { Stream } from "./definitions"
import { distributedWithDynamic } from "./distributedWithDynamic"
import { flattenExitOption } from "./flattenExitOption"
import { fromQueueWithShutdown } from "./fromQueueWithShutdown"
import { mapM_ } from "./mapM"
import { unwrapManaged } from "./unwrapManaged"

/**
 * More powerful version of `Stream.groupByKey`
 */
export function groupBy_<R, R1, E, E1, O, K, V>(
  self: Stream<R, E, O>,
  f: (o: O) => T.Effect<R1, E1, Tp.Tuple<[K, V]>>,
  buffer = 16
): GB.GroupBy<R & R1, E | E1, K, V> {
  const qstream = unwrapManaged(
    pipe(
      M.do,
      M.bind("decider", () =>
        T.toManaged(
          P.make<
            never,
            (k: K, v: V) => T.Effect<unknown, never, (s: symbol) => boolean>
          >()
        )
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
      M.bind("ref", () => T.toManaged(Ref.makeRef<MP.Map<K, symbol>>(MP.empty))),
      M.bind("add", ({ decider, out }) =>
        pipe(
          mapM_(self, f),
          distributedWithDynamic(
            buffer,
            (kv) => T.chain_(P.await(decider), (_) => _(...kv.tuple)),
            (x) => Q.offer_(out, x)
          )
        )
      ),
      M.tap(({ add, decider, out, ref }) =>
        pipe(
          P.succeed_(decider, (k: K, _: V) =>
            pipe(
              T.map_(ref.get, MP.lookup(k)),
              T.chain(
                O.fold(
                  () =>
                    T.chain_(add, ({ tuple: [idx, q] }) =>
                      pipe(
                        Ref.update_(ref, MP.insert(k, idx)),
                        T.zipRight(
                          Q.offer_(
                            out,
                            Ex.succeed(
                              Tp.tuple(
                                k,
                                Q.map_(q, (ex) => Ex.map_(ex, (_) => _.get(1)))
                              )
                            )
                          )
                        ),
                        T.as((_: symbol) => _ === idx)
                      )
                    ),
                  (idx) => T.succeed((_: symbol) => _ === idx)
                )
              )
            )
          ),
          T.toManaged
        )
      ),
      M.map(({ out }) => flattenExitOption(fromQueueWithShutdown(out)))
    )
  )

  return new GB.GroupBy(qstream, buffer)
}

/**
 * More powerful version of `Stream.groupByKey`
 */
export function groupBy<R1, E1, O, K, V>(
  f: (o: O) => T.Effect<R1, E1, Tp.Tuple<[K, V]>>,
  buffer = 16
): <R, E>(self: Stream<R, E, O>) => GB.GroupBy<R & R1, E | E1, K, V> {
  return (self) => groupBy_(self, f, buffer)
}
