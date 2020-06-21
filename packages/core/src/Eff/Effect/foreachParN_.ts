import * as A from "../../Array"
import { halt as promiseHalt } from "../Promise/halt"
import { make as promiseMake } from "../Promise/make"
import { Promise } from "../Promise/promise"
import { succeed as promiseSucceed } from "../Promise/succeed"
import { wait as promiseWait } from "../Promise/wait"
import { makeBounded } from "../Queue"

import { bracket_ } from "./bracket_"
import { chain_ } from "./chain_"
import { collectAllUnit } from "./collectAllUnit"
import { Effect, AsyncRE } from "./effect"
import { foldCauseM_ } from "./foldCauseM_"
import { foreachUnit_ } from "./foreachUnit_"
import { foreach_ } from "./foreach_"
import { forever } from "./forever"
import { fork } from "./fork"
import { Do } from "./instances"
import { map_ } from "./map_"

/**
 * Applies the functionw `f` to each element of the `Iterable<A>` in parallel,
 * and returns the results in a new `readonly B[]`.
 *
 * Unlike `foreachPar`, this method will use at most up to `n` fibers.
 */
export const foreachParN_ = (n: number) => <A, S, R, E, B>(
  as: Iterable<A>,
  f: (a: A) => Effect<S, R, E, B>
): AsyncRE<R, E, readonly B[]> =>
  bracket_(
    makeBounded<readonly [Promise<E, B>, A]>(n),
    (q) => q.shutdown,
    (q) =>
      Do()
        .bind(
          "pairs",
          foreach_(as, (a) => map_(promiseMake<E, B>(), (p) => [p, a] as const))
        )
        .doL((s) => fork(foreachUnit_(s.pairs, (pair) => q.offer(pair))))
        .doL((s) =>
          collectAllUnit(
            A.makeBy(n, () =>
              fork(
                forever(
                  chain_(q.take, ([p, a]) =>
                    foldCauseM_(
                      f(a),
                      (c) => foreach_(s.pairs, ([_]) => promiseHalt(c)(_)),
                      (b) => promiseSucceed(b)(p)
                    )
                  )
                )
              )
            )
          )
        )
        .bindL("res", (s) => foreach_(s.pairs, ([_]) => promiseWait(_)))
        .return((s) => s.res)
  )
