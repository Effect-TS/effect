import { pipe } from "../../Function"
import { Empty, Cause, Both } from "../Cause/cause"
import { complete as promiseComplete } from "../Promise/complete"
import { fail as promiseFailure } from "../Promise/fail"
import { make as promiseMake } from "../Promise/make"
import { succeed as promiseSucceed } from "../Promise/succeed"
import { makeRef } from "../Ref"

import { chain_ } from "./chain_"
import { Effect } from "./effect"
import { ensuring } from "./ensuring"
import { fiberId } from "./fiberId"
import { foreach_ } from "./foreach_"
import { fork } from "./fork"
import { Do } from "./instances"
import { interruptible } from "./interruptible"
import { tapCause } from "./tapCause"
import { tap_ } from "./tap_"
import { uninterruptible } from "./uninterruptible"
import { unit } from "./unit"
import { whenM } from "./whenM"

export const foreachParUnit_ = <S, R, E, A>(
  as: Iterable<A>,
  f: (a: A) => Effect<S, R, E, any>
) => {
  const arr = Array.from(as)
  const size = arr.length

  if (size === 0) {
    return unit
  }

  return Do()
    .bind("parentId", fiberId())
    .bind("causes", makeRef<Cause<E>>(Empty))
    .bind("result", promiseMake<never, boolean>())
    .bind("failureTrigger", promiseMake<void, void>())
    .bind("status", makeRef([0, 0, false] as [number, number, boolean]))
    .letL("startTask", (s) =>
      s.status.modify(([started, done, failing]) =>
        failing
          ? [false, [started, done, failing]]
          : [true, [started + 1, done, failing]]
      )
    )
    .letL("startFailure", (s) =>
      tap_(
        s.status.update(([started, done, _]) => [started, done, true]),
        () => promiseFailure<void>(undefined)(s.failureTrigger)
      )
    )
    .letL("task", (s) => (a: A) =>
      uninterruptible(
        whenM(s.startTask)(
          pipe(
            f(a),
            interruptible,
            tapCause((_) =>
              chain_(
                s.causes.update((l) => Both(l, _)),
                () => s.startFailure
              )
            ),
            ensuring(
              whenM(
                s.status.modify(([started, done, failing]) => [
                  (failing ? started : size) === done + 1,
                  [started, done + 1, failing]
                ])
              )(
                promiseComplete(promiseSucceed<void>(undefined)(s.failureTrigger))(
                  s.result
                )
              )
            )
          )
        )
      )
    )
    .bindL("fibers", (s) => foreach_(arr, (a) => fork(s.task(a))))
}
