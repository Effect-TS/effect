import * as Ex from "../../Exit"
import { pipe } from "../../Function"
import * as MP from "../../Map"
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
  f: (o: O) => T.Effect<R1, E1, readonly [K, V]>,
  buffer = 16
): GB.GroupBy<R & R1, E | E1, K, V> {
  const qstream = unwrapManaged(
    pipe(
      M.do,
      M.bind("decider", () =>
        T.toManaged_(
          P.make<
            never,
            (k: K, v: V) => T.Effect<unknown, never, (s: symbol) => boolean>
          >()
        )
      ),
      M.bind("out", () =>
        T.toManaged_(
          Q.makeBounded<
            Ex.Exit<
              O.Option<E | E1>,
              readonly [K, Q.Dequeue<Ex.Exit<O.Option<E | E1>, V>>]
            >
          >(buffer),
          (q) => q.shutdown
        )
      ),
      M.bind("ref", () => T.toManaged_(Ref.makeRef<MP.Map<K, symbol>>(MP.empty))),
      M.bind("add", ({ decider, out }) =>
        pipe(
          mapM_(self, f),
          distributedWithDynamic(
            buffer,
            (kv) => T.chain_(P.await(decider), (_) => _(...kv)),
            out.offer
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
                    T.chain_(add, ([idx, q]) =>
                      pipe(
                        Ref.update_(ref, MP.insert(k, idx)),
                        T.andThen(
                          out.offer(
                            Ex.succeed([
                              k,
                              Q.map_(q, (ex) => Ex.map_(ex, ([_, v]) => v))
                            ])
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
          T.toManaged()
        )
      ),
      M.map(({ out }) => flattenExitOption(fromQueueWithShutdown(out)))
    )
  )

  return GB.make(qstream, buffer)
}

/**
 * More powerful version of `Stream.groupByKey`
 */
export function groupBy<R1, E1, O, K, V>(
  f: (o: O) => T.Effect<R1, E1, readonly [K, V]>,
  buffer = 16
): <R, E>(self: Stream<R, E, O>) => GB.GroupBy<R & R1, E | E1, K, V> {
  return (self) => groupBy_(self, f, buffer)
}
