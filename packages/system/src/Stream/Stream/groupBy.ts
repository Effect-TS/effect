// ets_tracing: off

import * as MP from "../../Collections/Immutable/Map/index.js"
import * as Tp from "../../Collections/Immutable/Tuple/index.js"
import * as Ex from "../../Exit/index.js"
import { pipe } from "../../Function/index.js"
import * as O from "../../Option/index.js"
import * as P from "../../Promise/index.js"
import * as Q from "../../Queue/index.js"
import * as T from "../_internal/effect.js"
import * as M from "../_internal/managed.js"
import * as Ref from "../_internal/ref.js"
import * as GB from "../GroupBy/index.js"
import type { Stream } from "./definitions.js"
import { distributedWithDynamic } from "./distributedWithDynamic.js"
import { flattenExitOption } from "./flattenExitOption.js"
import { fromQueueWithShutdown } from "./fromQueueWithShutdown.js"
import { mapM_ } from "./mapM.js"
import { unwrapManaged } from "./unwrapManaged.js"

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
