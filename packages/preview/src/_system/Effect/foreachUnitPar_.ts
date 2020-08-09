import * as A from "../Array"
import { pipe } from "../Function"
import { Both, Cause, Empty } from "../Cause/cause"
import * as Fiber from "../Fiber"
import { fork as managedFork, use_ as managedUse_ } from "../Managed/core"
import { fail as promiseFailure } from "../Promise/fail"
import { make as promiseMake } from "../Promise/make"
import { succeed as promiseSucceed } from "../Promise/succeed"
import { wait as promiseWait } from "../Promise/wait"
import * as R from "../Ref"

import { asUnit } from "./asUnit"
import { catchAll } from "./catchAll"
import { chain, chain_, fork, halt, suspend, unit } from "./core"
import * as D from "./do"
import { AsyncRE, Effect } from "./effect"
import { ensuring } from "./ensuring"
import { fiberId } from "./fiberId"
import { foreach_ } from "./foreach_"
import { interruptible } from "./interruptible"
import { map_ } from "./map_"
import { onInterruptExtended_ } from "./onInterrupt_"
import { tap } from "./tap"
import { tapCause } from "./tapCause"
import { toManaged } from "./toManaged"
import { uninterruptible } from "./uninterruptible"
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
export const foreachUnitPar_ = <S, R, E, A>(
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
    D.bind("result", () => promiseMake<void, void>()),
    D.bind("status", () => R.makeRef([0, 0, false] as [number, number, boolean])),
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
      pipe(
        s.status,
        R.update(([started, done, _]): [number, number, boolean] => [
          started,
          done,
          true
        ]),
        tap(() => promiseFailure<void>(undefined)(s.result))
      )
    ),
    D.let("task", (s) => (a: A) =>
      uninterruptible(
        whenM(s.startTask)(
          pipe(
            suspend(() => f(a)),
            interruptible,
            tapCause((c) =>
              pipe(
                s.causes,
                R.update((l) => Both(l, c)),
                chain(() => s.startFailure)
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
              )(promiseSucceed<void>(undefined)(s.result))
            )
          )
        )
      )
    ),
    D.bind("fibers", (s) => foreach_(arr, (a) => fork(s.task(a)))),
    D.let("interruptor", (s) =>
      pipe(
        s.result,
        promiseWait,
        catchAll(() =>
          chain_(
            foreach_(s.fibers, (f) => fork(f.interruptAs(s.parentId))),
            Fiber.joinAll
          )
        ),
        toManaged(),
        managedFork
      )
    ),
    tap((s) =>
      managedUse_(s.interruptor, () =>
        onInterruptExtended_(
          whenM(
            map_(
              foreach_(s.fibers, (f) => f.wait),
              (fs) => A.findFirst_(fs, (e) => e._tag === "Failure")._tag === "Some"
            )
          )(
            chain_(promiseFailure<void>(undefined)(s.result), () =>
              chain_(s.causes.get, (x) => halt(x))
            )
          ),
          () =>
            chain_(promiseFailure<void>(undefined)(s.result), () =>
              chain_(
                foreach_(s.fibers, (f) => f.wait),
                () => chain_(s.causes.get, (x) => halt(x))
              )
            )
        )
      )
    ),
    asUnit
  )
}
