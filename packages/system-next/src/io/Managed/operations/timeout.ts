import { Tuple } from "../../../collection/immutable/Tuple"
import { Either } from "../../../data/Either"
import { Option } from "../../../data/Option"
import type { HasClock } from "../../Clock"
import { Effect } from "../../Effect"
import { sequential } from "../../Effect/operations/ExecutionStrategy"
import { interrupt as exitInterrupt } from "../../Exit/operations/interrupt"
import { map_ as exitMap_ } from "../../Exit/operations/map"
import * as Fiber from "../../Fiber"
import { currentReleaseMap } from "../../FiberRef/definition/data"
import { get as fiberRefGet } from "../../FiberRef/operations/get"
import { locally_ } from "../../FiberRef/operations/locally"
import { Managed } from "../definition"
import type { Finalizer } from "../ReleaseMap"
import { ReleaseMap } from "../ReleaseMap"

/**
 * Returns an effect that will timeout this resource, returning `None` if the
 * timeout elapses before the resource was reserved and acquired. If the
 * reservation completes successfully (even after the timeout) the release
 * action will be run on a new fiber. `Some` will be returned if acquisition
 * and reservation complete in time.
 *
 * @tsplus fluent ets/Managed timeout
 */
export function timeout_<R, E, A>(
  self: Managed<R, E, A>,
  duration: number,
  __etsTrace?: string
): Managed<R & HasClock, E, Option<A>> {
  return Managed(
    Effect.uninterruptibleMask(({ restore }) =>
      Effect.Do()
        .bind("outerReleaseMap", () => fiberRefGet(currentReleaseMap.value))
        .bind("innerReleaseMap", () => ReleaseMap.make)
        .bind("earlyRelease", ({ innerReleaseMap, outerReleaseMap }) =>
          outerReleaseMap.add((exit) => innerReleaseMap.releaseAll(exit, sequential))
        )
        .bind("raceResult", ({ innerReleaseMap }) =>
          restore<R & HasClock, E, Either<Fiber.Fiber<E, Tuple<[Finalizer, A]>>, A>>(
            locally_(
              currentReleaseMap.value,
              innerReleaseMap
            )(self.effect).raceWith(
              Effect.sleep(duration).map(() => Option.none),
              (result, sleeper) =>
                Fiber.interrupt(sleeper).zipRight(
                  Effect.done(exitMap_(result, (_) => Either.right(_.get(1))))
                ),
              (_, resultFiber) => Effect.succeed(Either.left(resultFiber))
            )
          )
        )
        .bind("a", ({ innerReleaseMap, raceResult }) =>
          raceResult.fold(
            (fiber) =>
              Effect.fiberId
                .flatMap((id) =>
                  Fiber.interrupt(fiber)
                    .ensuring(innerReleaseMap.releaseAll(exitInterrupt(id), sequential))
                    .forkDaemon()
                )
                .map(() => Option.none),
            (a) => Effect.succeed(Option.some(a))
          )
        )
        .map(({ a, earlyRelease }) => Tuple(earlyRelease, a))
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
export function timeout(duration: number, __etsTrace?: string) {
  return <R, E, A>(self: Managed<R, E, A>): Managed<R & HasClock, E, Option<A>> =>
    timeout_(self, duration)
}
