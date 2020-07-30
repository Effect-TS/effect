import { pipe } from "../../Function"
import { Empty, Cause, Both, Then, Interrupt } from "../Cause/cause"
import { isEmpty } from "../Cause/core"
import * as Fiber from "../Fiber"
import { complete as promiseComplete } from "../Promise/complete"
import { fail as promiseFailure } from "../Promise/fail"
import { make as promiseMake } from "../Promise/make"
import { succeed as promiseSucceed } from "../Promise/succeed"
import { wait as promiseWait } from "../Promise/wait"
import * as R from "../Ref"

import { asUnit } from "./asUnit"
import { bracketFiber } from "./bracketFiber"
import { catchAll } from "./catchAll"
import { chain_ } from "./chain_"
import { checkDescriptor } from "./checkDescriptor"
import * as D from "./do"
import { Effect, AsyncRE } from "./effect"
import { ensuring } from "./ensuring"
import { fiberId } from "./fiberId"
import { foreach_ } from "./foreach_"
import { fork } from "./fork"
import { halt } from "./halt"
import { interruptible } from "./interruptible"
import { map_ } from "./map_"
import { onInterruptExtended_ } from "./onInterrupt_"
import { tap } from "./tap"
import { tapCause } from "./tapCause"
import { tap_ } from "./tap_"
import { uninterruptible } from "./uninterruptible"
import { unit } from "./unit"
import { whenM } from "./whenM"

/**
 * Applies the function `f` to each element of the `Iterable<A>` and runs
 * produced effects in parallel, discarding the results.
 *
 * For a sequential version of this method, see `foreach_`.
 *
 * Optimized to avoid keeping full tree of effects, so that method could be
 * able to handle large input sequences.
 * Behaves almost like this code:
 *
 * Additionally, interrupts all effects on any failure.
 */
export const foreachParUnit_ = <S, R, E, A>(
  as: Iterable<A>,
  f: (a: A) => Effect<S, R, E, any>
): AsyncRE<R, E, void> => {
  const arr = Array.from(as)
  const size = arr.length

  if (size === 0) {
    return unit
  }

  return pipe(
    D.of,
    D.bind("parentId", () => fiberId()),
    D.bind("causes", () => R.makeRef<Cause<E>>(Empty)),
    D.bind("result", () => promiseMake<never, boolean>()),
    D.bind("failureTrigger", () => promiseMake<void, void>()),
    D.bind("status", () => R.makeRef([0, 0, false] as [number, number, boolean])),
    D.bind("rootCause", () =>
      R.makeRef<[Fiber.FiberID, Cause<E>] | undefined>(undefined)
    ),
    D.let("startTask", (s) =>
      pipe(
        s.status,
        R.modify(([started, done, failing]): [boolean, [number, number, boolean]] =>
          failing
            ? [false, [started, done, failing]]
            : [true, [started + 1, done, failing]]
        )
      )
    ),
    D.let("startFailure", (s) =>
      tap_(
        pipe(
          s.status,
          R.update(([started, done, _]): [number, number, boolean] => [
            started,
            done,
            true
          ])
        ),
        () => promiseFailure<void>(undefined)(s.failureTrigger)
      )
    ),
    D.let("task", (s) => (a: A) =>
      uninterruptible(
        whenM(s.startTask)(
          pipe(
            f(a),
            interruptible,
            tapCause((c) =>
              chain_(
                checkDescriptor((d) =>
                  pipe(
                    s.rootCause,
                    R.modify((_): [Cause<E>, [Fiber.FiberID, Cause<E>]] =>
                      _ != null ? [_[1], _] : [c, [d.id, c]]
                    )
                  )
                ),
                (rc) =>
                  rc === c
                    ? s.startFailure
                    : chain_(
                        pipe(
                          s.causes,
                          R.update((l) => Both(c, l))
                        ),
                        () => s.startFailure
                      )
              )
            ),
            ensuring(
              whenM(
                pipe(
                  s.status,
                  R.modify(([started, done, failing]) => [
                    (failing ? started : size) === done + 1,
                    [started, done + 1, failing] as [number, number, boolean]
                  ])
                )
              )(
                promiseComplete(promiseSucceed<void>(undefined)(s.failureTrigger))(
                  s.result
                )
              )
            )
          )
        )
      )
    ),
    D.bind("fibers", (s) => foreach_(arr, (a) => fork(s.task(a)))),
    D.bind("hasCompleted", () => R.makeRef(false)),
    tap((s) =>
      pipe(
        s.failureTrigger,
        promiseWait,
        catchAll(() =>
          chain_(
            foreach_(s.fibers, (f) => fork(f.interruptAs(s.parentId))),
            Fiber.joinAll
          )
        ),
        bracketFiber(() =>
          onInterruptExtended_(
            whenM(map_(promiseWait(s.result), (b) => !b))(
              chain_(s.causes.get, (x) =>
                chain_(s.rootCause.get, (rc) =>
                  chain_(s.hasCompleted.set(true), () =>
                    halt(rc == null ? x : Then(Then(rc[1], Interrupt(rc[0])), x))
                  )
                )
              )
            ),
            () =>
              chain_(s.hasCompleted.get, (hasCompleted) =>
                hasCompleted
                  ? unit
                  : chain_(
                      chain_(
                        chain_(s.startFailure, () => promiseWait(s.result)),
                        () => s.causes.get
                      ),
                      (c) => (isEmpty(c) ? unit : halt(c))
                    )
              )
          )
        )
      )
    ),
    asUnit
  )
}
