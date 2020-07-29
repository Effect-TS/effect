import * as A from "../../Array"
import { pipe } from "../../Function"
import { getOrElse_ } from "../../Option"
import { Both, Cause, Empty, Interrupt, Then } from "../Cause/cause"
import { interrupted } from "../Cause/interrupted"
import { interruptedOnly } from "../Cause/interruptedOnly"
import * as Exit from "../Exit"
import { FiberID } from "../Fiber"
import { FiberContext } from "../Fiber/context"
import { join } from "../Fiber/join"
import { joinAll } from "../Fiber/joinAll"
import { halt as promiseHalt } from "../Promise/halt"
import { make as promiseMake } from "../Promise/make"
import { Promise } from "../Promise/promise"
import { succeed as promiseSucceed } from "../Promise/succeed"
import { wait as promiseWait } from "../Promise/wait"
import { makeBounded } from "../Queue"
import * as R from "../Ref"

import { bracket_ } from "./bracket_"
import { chain } from "./chain"
import { chain_ } from "./chain_"
import { checkDescriptor } from "./checkDescriptor"
import { collectAllUnit } from "./collectAllUnit"
import { bind, of } from "./do"
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
import { interrupt } from "./interrupt"
import { map } from "./map"
import { map_ } from "./map_"
import { onInterruptExtended_ } from "./onInterrupt_"
import { result } from "./result"
import { tap } from "./tap"
import { unit } from "./unit"

class Tracker<E, A> {
  private fibers: Set<FiberContext<E, A>> = new Set()
  interrupted = false
  interruptedBy: FiberID | undefined
  cause: Cause<any> | undefined

  track<S, R>(effect: Effect<S, R, E, A>) {
    return pipe(
      of,
      bind("fiber", () => forkDaemon(effect)),
      tap((s) =>
        effectTotal(() => {
          this.fibers.add(s.fiber)

          s.fiber.onDone(() => {
            this.fibers.delete(s.fiber)
          })
        })
      ),
      chain((s) => join(s.fiber))
    )
  }

  interrupt(id: FiberID, cause?: Cause<any>) {
    if (!this.interrupted) {
      this.interrupted = true
      this.interruptedBy = id
      this.cause = cause
    }

    const fibers = Array.from(this.fibers)
    this.fibers.clear()

    return chain_(
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      foreach_(fibers, (f) => fork(f.interruptAs(this.interruptedBy!))),
      joinAll
    )
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
    (q) =>
      pipe(
        of,
        bind("pairs", () =>
          foreach_(as, (a) => map_(promiseMake<E, B>(), (p) => [p, a] as const))
        ),
        tap((s) => fork(foreachUnit_(s.pairs, (pair) => q.offer(pair)))),
        bind("causes", () => R.makeRef<Cause<E>>(Empty)),
        bind("tracker", () => effectTotal(() => new Tracker<E, B>())),
        tap((s) =>
          collectAllUnit(
            A.makeBy(n, () =>
              fork(
                forever(
                  chain_(q.take, ([p, a]) =>
                    foldCauseM_(
                      !s.tracker.interrupted ? s.tracker.track(f(a)) : interrupt,
                      (c) =>
                        chain_(
                          !s.tracker.interrupted
                            ? checkDescriptor((d) => s.tracker.interrupt(d.id, c))
                            : unit,
                          () =>
                            pipe(
                              s.causes,
                              R.update((_) =>
                                c === s.tracker.cause
                                  ? _
                                  : interruptedOnly(c)
                                  ? _
                                  : c._tag === "Then" && interrupted(c)
                                  ? Both(_, c.left)
                                  : Both(_, c)
                              ),
                              chain(() => promiseHalt(c)(p))
                            )
                        ),
                      (b) => promiseSucceed(b)(p)
                    )
                  )
                )
              )
            )
          )
        ),
        bind("res", (s) =>
          onInterruptExtended_(
            foreach_(s.pairs, ([_]) => result(promiseWait(_))),
            () =>
              chain_(
                checkDescriptor((d) => s.tracker.interrupt(d.id)),
                () => chain_(s.causes.get, (c) => halt(c))
              )
          )
        ),
        tap((s) =>
          chain_(s.causes.get, (c) =>
            s.tracker.cause && s.tracker.interruptedBy
              ? halt(Then(s.tracker.cause, Then(Interrupt(s.tracker.interruptedBy), c)))
              : unit
          )
        ),
        bind("end", (s) =>
          done(getOrElse_(Exit.collectAll(...s.res), () => Exit.succeed([])))
        ),
        map((s) => s.end)
      ),
    (q) => q.shutdown
  )
