// ets_tracing: off

import * as L from "../../../../Collections/Immutable/List/index.js"
import * as Tp from "../../../../Collections/Immutable/Tuple/index.js"
import * as T from "../../../../Effect/index.js"
import * as E from "../../../../Either/index.js"
import { pipe } from "../../../../Function/index.js"
import * as M from "../../../../Managed/index.js"
import type * as C from "../core.js"
import * as CollectLeft from "./collectLeft.js"
import * as CollectRight from "./collectRight.js"
import * as DistributedWith from "./distributedWith.js"
import * as FlattenExitOption from "./flattenExitOption.js"
import * as FromQueueWithShutdown from "./fromQueueWithShutdown.js"
import * as MapEffect from "./mapEffect.js"

/**
 * Split a stream by a predicate. The faster stream may advance by up to buffer elements further than the slower one.
 */
export function partitionEither_<R, R1, E, E1, A, A1, A2>(
  self: C.Stream<R, E, A>,
  p: (a: A) => T.Effect<R1, E1, E.Either<A1, A2>>,
  buffer = 16
): M.Managed<R & R1, E | E1, Tp.Tuple<[C.IO<E | E1, A1>, C.IO<E | E1, A2>]>> {
  return pipe(
    self,
    MapEffect.mapEffect(p),
    DistributedWith.distributedWith(
      2,
      buffer,
      E.fold(
        (_) => T.succeed((_) => _ === 0),
        (_) => T.succeed((_) => _ === 1)
      )
    ),
    M.chain((dequeues) => {
      if (L.size(dequeues) === 2) {
        return M.succeed(
          Tp.tuple(
            CollectLeft.collectLeft(
              FlattenExitOption.flattenExitOption(
                FromQueueWithShutdown.fromQueueWithShutdown_(L.unsafeFirst(dequeues)!)
              )
            ),
            CollectRight.collectRight(
              FlattenExitOption.flattenExitOption(
                FromQueueWithShutdown.fromQueueWithShutdown_(L.unsafeLast(dequeues)!)
              )
            )
          )
        )
      }

      return M.dieMessage(
        `partitionEither: expected two streams but got ${L.size(dequeues)}`
      )
    })
  )
}

/**
 * Split a stream by a predicate. The faster stream may advance by up to buffer elements further than the slower one.
 *
 * @ets_data_first partitionEither_
 */
export function partitionEither<R1, E1, A, A1, A2>(
  p: (a: A) => T.Effect<R1, E1, E.Either<A1, A2>>,
  buffer = 16
) {
  return <R, E>(self: C.Stream<R, E, A>) => partitionEither_(self, p, buffer)
}
