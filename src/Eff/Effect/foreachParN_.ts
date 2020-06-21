import * as A from "../../Array"
import { Both, Cause, Empty } from "../Cause/cause"
import { interruptedOnly as causeInterruptedOnly } from "../Cause/interruptedOnly"
import { isEmpty as causeIsEmpty } from "../Cause/isEmpty"
import { stripInterrupts } from "../Cause/stripInterrupts"
import { sequenceArray as sequenceExitArray } from "../Exit/instances"
import { FiberContext } from "../Fiber/context"
import { join } from "../Fiber/join"
import { halt as promiseHalt } from "../Promise/halt"
import { make as promiseMake } from "../Promise/make"
import { Promise } from "../Promise/promise"
import { succeed as promiseSucceed } from "../Promise/succeed"
import { wait as promiseWait } from "../Promise/wait"
import { makeBounded } from "../Queue"
import { makeRef } from "../Ref"

import { bracket_ } from "./bracket_"
import { chain_ } from "./chain_"
import { checkDescriptor } from "./checkDescriptor"
import { collectAllUnit } from "./collectAllUnit"
import { done } from "./done"
import { AsyncRE, Effect } from "./effect"
import { effectTotal } from "./effectTotal"
import { foldCauseM_ } from "./foldCauseM_"
import { foreachUnit_ } from "./foreachUnit_"
import { foreach_ } from "./foreach_"
import { forever } from "./forever"
import { fork } from "./fork"
import { forkDaemon } from "./forkDaemon"
import { halt } from "./halt"
import { Do } from "./instances"
import { interrupt } from "./interrupt"
import { map_ } from "./map_"
import { onInterruptE_ } from "./onInterrupt_"
import { result } from "./result"
import { unit } from "./unit"

class Tracker<E, A> {
  private fibers: Set<FiberContext<E, A>> = new Set()

  track<S, R>(effect: Effect<S, R, E, A>) {
    return Do()
      .bind("fiber", forkDaemon(effect))
      .doL((s) =>
        effectTotal(() => {
          this.fibers.add(s.fiber)

          s.fiber.onDone(() => {
            this.fibers.delete(s.fiber)
          })
        })
      )
      .bindL("res", (s) => join(s.fiber))
      .return((s) => s.res)
  }

  andInterrupt<S, R, E, A>(effect: Effect<S, R, E, A>) {
    return Do()
      .bind("res", effect)
      .do(checkDescriptor((d) => foreachUnit_(this.fibers, (f) => f.interruptAs(d.id))))
      .return((s) => s.res)
  }

  interrupt() {
    return Do()
      .bind("cause", makeRef<Cause<E>>(Empty))
      .doL((s) =>
        checkDescriptor((d) =>
          foreachUnit_(this.fibers, (f) =>
            chain_(f.interruptAs(d.id), (e) => {
              if (e._tag === "Failure" && !causeInterruptedOnly(e.cause)) {
                return s.cause.update((_) => Both(_, stripInterrupts(e.cause)))
              } else {
                return unit
              }
            })
          )
        )
      )
      .bindL("finalCause", (s) => s.cause.get)
      .bindL("res", (s) => (causeIsEmpty(s.finalCause) ? unit : halt(s.finalCause)))
      .return((s) => s.res)
  }
}

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
        .bind("shouldContinue", makeRef(true))
        .bind("causes", makeRef<Cause<E>>(Empty))
        .bind(
          "tracker",
          effectTotal(() => new Tracker<E, B>())
        )
        .doL((s) =>
          collectAllUnit(
            A.makeBy(n, () =>
              fork(
                forever(
                  chain_(q.take, ([p, a]) =>
                    chain_(s.shouldContinue.get, (cnt) =>
                      foldCauseM_(
                        cnt ? s.tracker.track(f(a)) : interrupt,
                        (c) =>
                          chain_(
                            s.tracker.andInterrupt(s.shouldContinue.set(false)),
                            () =>
                              cnt
                                ? chain_(
                                    s.causes.update((_) =>
                                      causeInterruptedOnly(c)
                                        ? _
                                        : Both(_, stripInterrupts(c))
                                    ),
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
        .bindL("res", (s) =>
          onInterruptE_(
            foreach_(s.pairs, ([_]) => result(promiseWait(_))),
            () => s.tracker.interrupt()
          )
        )
        .doL((s) => chain_(s.causes.get, (c) => (causeIsEmpty(c) ? unit : halt(c))))
        .bindL("end", (s) => done(sequenceExitArray(s.res)))
        .return((s) => s.end)
  )
