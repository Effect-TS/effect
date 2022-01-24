import * as Tp from "../../../collection/immutable/Tuple"
import * as E from "../../../data/Either"
import { pipe } from "../../../data/Function"
import * as O from "../../../data/Option"
import type { HasClock } from "../../Clock"
import * as Fiber from "../../Fiber"
import { currentReleaseMap } from "../../FiberRef/definition/data"
import { get } from "../../FiberRef/operations/get"
import { locally_ } from "../../FiberRef/operations/locally"
import type { Managed } from "../definition"
import { managedApply } from "../definition"
import * as RM from "../ReleaseMap"
import * as T from "./_internal/effect"
import * as Ex from "./_internal/exit"

/**
 * Returns an effect that will timeout this resource, returning `None` if the
 * timeout elapses before the resource was reserved and acquired. If the
 * reservation completes successfully (even after the timeout) the release
 * action will be run on a new fiber. `Some` will be returned if acquisition
 * and reservation complete in time
 */
export function timeout_<R, E, A>(
  self: Managed<R, E, A>,
  duration: number,
  __trace?: string
): Managed<R & HasClock, E, O.Option<A>> {
  return managedApply(
    T.uninterruptibleMask(({ restore }) =>
      pipe(
        T.Do(),
        T.bind("outerReleaseMap", () => get(currentReleaseMap.value)),
        T.bind("innerReleaseMap", () => RM.make),
        T.bind("earlyRelease", ({ innerReleaseMap, outerReleaseMap }) =>
          RM.add_(outerReleaseMap, (exit) =>
            RM.releaseAll_(innerReleaseMap, exit, T.sequential)
          )
        ),
        T.bind("raceResult", ({ innerReleaseMap }) =>
          restore(
            T.raceWith_(
              locally_(currentReleaseMap.value, innerReleaseMap)(self.effect),
              T.map_(T.sleep(duration), () => O.none),
              (result, sleeper) =>
                T.zipRight_(
                  Fiber.interrupt(sleeper),
                  T.done(Ex.map_(result, (_) => E.right(_.get(1))))
                ),
              (_, resultFiber) => T.succeed(() => E.left(resultFiber)),
              __trace
            )
          )
        ),
        T.bind("a", ({ innerReleaseMap, raceResult }) =>
          E.fold_(
            raceResult,
            (fiber) =>
              pipe(
                T.fiberId,
                T.chain((id) =>
                  pipe(
                    Fiber.interrupt(fiber),
                    T.ensuring(
                      RM.releaseAll_(innerReleaseMap, Ex.interrupt(id), T.sequential)
                    ),
                    T.forkDaemon
                  )
                ),
                T.map(() => O.none)
              ),
            (a) => T.succeed(() => O.some(a))
          )
        ),
        T.map(({ a, earlyRelease }) => Tp.tuple(earlyRelease, a))
      )
    )
  )
}

/**
 * Returns an effect that will timeout this resource, returning `None` if the
 * timeout elapses before the resource was reserved and acquired. If the
 * reservation completes successfully (even after the timeout) the release
 * action will be run on a new fiber. `Some` will be returned if acquisition
 * and reservation complete in time
 */
export function timeout(duration: number, __trace?: string) {
  return <R, E, A>(self: Managed<R, E, A>): Managed<R & HasClock, E, O.Option<A>> =>
    timeout_(self, duration, __trace)
}
