import * as A from "../../Array"
import { Empty, Both, Cause } from "../Cause/cause"
import { isEmpty as causeIsEmpty } from "../Cause/isEmpty"
import { sequenceArray as sequenceExitArray } from "../Exit/instances"
import { halt as promiseHalt } from "../Promise/halt"
import { make as promiseMake } from "../Promise/make"
import { Promise } from "../Promise/promise"
import { succeed as promiseSucceed } from "../Promise/succeed"
import { wait as promiseWait } from "../Promise/wait"
import { makeBounded } from "../Queue"
import { makeRef } from "../Ref"

import { bracket_ } from "./bracket_"
import { chain_ } from "./chain_"
import { collectAllUnit } from "./collectAllUnit"
import { done } from "./done"
import { Effect, AsyncRE } from "./effect"
import { foldCauseM_ } from "./foldCauseM_"
import { foreachUnit_ } from "./foreachUnit_"
import { foreach_ } from "./foreach_"
import { forever } from "./forever"
import { fork } from "./fork"
import { halt } from "./halt"
import { Do } from "./instances"
import { interrupt } from "./interrupt"
import { map_ } from "./map_"
import { result } from "./result"
import { unit } from "./unit"

/**
 * Applies the functionw `f` to each element of the `Iterable<A>` in parallel,
 * and returns the results in a new `readonly B[]`.
 *
 * Unlike `foreachPar`, this method will use at most up to `n` fibers.
 *
 * Note: effects are never interrupted when started, if a failure is detected
 * no new effects will start and the fiber will complete as soon as the running
 * effects complete
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
        .bind("shouldContinue", makeRef(true))
        .bind("causes", makeRef<Cause<E>>(Empty))
        .doL((s) =>
          collectAllUnit(
            A.makeBy(n, () =>
              fork(
                forever(
                  chain_(q.take, ([p, a]) =>
                    chain_(s.shouldContinue.get, (cnt) =>
                      foldCauseM_(
                        cnt ? f(a) : interrupt,
                        (c) =>
                          chain_(s.shouldContinue.set(false), () =>
                            cnt
                              ? chain_(
                                  s.causes.update((_) => Both(_, c)),
                                  () => promiseHalt(c)(p)
                                )
                              : promiseHalt(c)(p)
                          ),
                        (b) => promiseSucceed(b)(p)
                      )
                    )
                  )
                )
              )
            )
          )
        )
        .bindL("res", (s) => foreach_(s.pairs, ([_]) => result(promiseWait(_))))
        .doL((s) => chain_(s.causes.get, (c) => (causeIsEmpty(c) ? unit : halt(c))))
        .bindL("end", (s) => done(sequenceExitArray(s.res)))
        .return((s) => s.end)
  )
