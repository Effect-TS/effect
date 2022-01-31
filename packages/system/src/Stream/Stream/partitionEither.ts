// ets_tracing: off

import * as A from "../../Collections/Immutable/Chunk/index.js"
import * as Tp from "../../Collections/Immutable/Tuple/index.js"
import * as E from "../../Either/index.js"
import { pipe } from "../../Function/index.js"
import * as T from "../_internal/effect.js"
import * as M from "../_internal/managed.js"
import { collectLeft } from "./collectLeft.js"
import { collectRight } from "./collectRight.js"
import type { Stream } from "./definitions.js"
import { distributedWith } from "./distributedWith.js"
import { flattenExitOption } from "./flattenExitOption.js"
import { fromQueueWithShutdown } from "./fromQueueWithShutdown.js"
import { mapM } from "./mapM.js"

/**
 * Split a stream by a predicate. The faster stream may advance by up to buffer elements further than the slower one.
 */
export function partitionEither_<R, R1, E, E1, O, O2, O3>(
  self: Stream<R, E, O>,
  p: (o: O) => T.Effect<R1, E1, E.Either<O2, O3>>,
  buffer = 16
): M.Managed<
  R & R1,
  never,
  Tp.Tuple<[Stream<unknown, E | E1, O2>, Stream<unknown, E | E1, O3>]>
> {
  return pipe(
    self,
    mapM(p),
    distributedWith(
      2,
      buffer,
      E.fold(
        () => T.succeed((_) => _ === 0),
        () => T.succeed((_) => _ === 1)
      )
    ),
    M.chain((queues) => {
      const [q1, q2] = queues

      if (q1 && q2) {
        return M.succeed(
          Tp.tuple(
            pipe(fromQueueWithShutdown(q1), flattenExitOption, collectLeft),
            pipe(fromQueueWithShutdown(q2), flattenExitOption, collectRight)
          )
        )
      } else {
        return M.dieMessage(
          `partitionEither: expected two streams but got ${A.size(queues)}`
        )
      }
    })
  )
}

/**
 * Split a stream by a predicate. The faster stream may advance by up to buffer elements further than the slower one.
 */
export function partitionEither<R1, E1, O, O2, O3>(
  p: (o: O) => T.Effect<R1, E1, E.Either<O2, O3>>,
  buffer = 16
) {
  return <R, E>(self: Stream<R, E, O>) => partitionEither_(self, p, buffer)
}
