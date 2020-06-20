import { pipe } from "../../Function"
import { Empty, Cause, Both } from "../Cause/cause"
import { Runtime, Fiber } from "../Fiber/fiber"
import { complete as promiseComplete } from "../Promise/complete"
import { fail as promiseFailure } from "../Promise/fail"
import { make as promiseMake } from "../Promise/make"
import { succeed as promiseSucceed } from "../Promise/succeed"
import { wait as promiseWait } from "../Promise/wait"
import { makeRef } from "../Ref"

import { bracket } from "./bracket"
import { chain_ } from "./chain_"
import { done } from "./done"
import { Effect, AsyncRE } from "./effect"
import { effectTotal } from "./effectTotal"
import { ensuring } from "./ensuring"
import { fiberId } from "./fiberId"
import { foldM_ } from "./foldM_"
import { foreach_ } from "./foreach_"
import { fork } from "./fork"
import { forkDaemon } from "./forkDaemon"
import { halt } from "./halt"
import { Do } from "./instances"
import { interruptible } from "./interruptible"
import { map_ } from "./map_"
import { result } from "./result"
import { succeedNow } from "./succeedNow"
import { tapCause } from "./tapCause"
import { tap_ } from "./tap_"
import { uninterruptible } from "./uninterruptible"
import { unit } from "./unit"
import { whenM } from "./whenM"

export const foreachPar_ = <S, R, E, A, B>(
  as: Iterable<A>,
  f: (a: A) => Effect<S, R, E, B>
): AsyncRE<R, E, B[]> => {
  const arr = Array.from(as)

  return chain_(
    effectTotal<B[]>(() => []),
    (array) => {
      const fn = ([a, n]: [A, number]) =>
        chain_(f(a), (b) =>
          effectTotal(() => {
            array[n] = b
          })
        )
      return chain_(
        foreachParUnit_(
          arr.map((a, n) => [a, n] as [A, number]),
          fn
        ),
        () => effectTotal(() => array)
      )
    }
  )
}

export const catchAll = <S, R, E, A>(f: () => Effect<S, R, E, A>) => <S2, R2, E2, A2>(
  effect: Effect<S2, R2, E2, A2>
) => foldM_(effect, f, (x) => succeedNow(x))

export const bracketFiber = <S, R, E, A>(effect: Effect<S, R, E, A>) => <
  S2,
  R2,
  E2,
  A2
>(
  use: (f: Runtime<E, A>) => Effect<S2, R2, E2, A2>
) =>
  bracket(forkDaemon(effect), (f) => chain_(fiberId(), (id) => f.interruptAs(id)), use)

export const waitAll = <E, A>(as: Iterable<Fiber<E, A>>) =>
  result(foreachPar_(as, (f) => chain_(f.wait, done)))

export const joinAll = <E, A>(as: Iterable<Fiber<E, A>>) =>
  tap_(chain_(waitAll(as), done), () => foreach_(as, (f) => f.inheritRefs))

export const foreachParUnit_ = <S, R, E, A>(
  as: Iterable<A>,
  f: (a: A) => Effect<S, R, E, any>
): AsyncRE<R, E, void> => {
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
    .letL("useInterrupter", (s) =>
      pipe(
        s.failureTrigger,
        promiseWait,
        catchAll(() =>
          chain_(
            foreach_(s.fibers, (f) => fork(f.interruptAs(s.parentId))),
            joinAll
          )
        ),
        bracketFiber
      )
    )
    .doL((s) =>
      s.useInterrupter(() =>
        whenM(map_(promiseWait(s.result), (b) => !b))(chain_(s.causes.get, halt))
      )
    )
    .unit()
}
