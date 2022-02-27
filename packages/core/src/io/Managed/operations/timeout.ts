import { Tuple } from "../../../collection/immutable/Tuple"
import { Either } from "../../../data/Either"
import { Option } from "../../../data/Option"
import type { HasClock } from "../../Clock"
import { Effect } from "../../Effect"
import { ExecutionStrategy } from "../../ExecutionStrategy"
import { Exit } from "../../Exit"
import type { Fiber } from "../../Fiber"
import { FiberRef } from "../../FiberRef"
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
  __tsplusTrace?: string
): Managed<R & HasClock, E, Option<A>> {
  return Managed(
    Effect.uninterruptibleMask(({ restore }) =>
      Effect.Do()
        .bind("outerReleaseMap", () => FiberRef.currentReleaseMap.value.get())
        .bind("innerReleaseMap", () => ReleaseMap.make)
        .bind("earlyRelease", ({ innerReleaseMap, outerReleaseMap }) =>
          outerReleaseMap.add((exit) =>
            innerReleaseMap.releaseAll(exit, ExecutionStrategy.Sequential)
          )
        )
        .bind("raceResult", ({ innerReleaseMap }) =>
          restore<R & HasClock, E, Either<Fiber<E, Tuple<[Finalizer, A]>>, A>>(
            self.effect
              .apply(FiberRef.currentReleaseMap.value.locally(innerReleaseMap))
              .raceWith(
                Effect.sleep(duration).map(() => Option.none),
                (result, sleeper) =>
                  sleeper
                    .interrupt()
                    .zipRight(Effect.done(result.map((_) => Either.right(_.get(1))))),
                (_, resultFiber) => Effect.succeed(Either.left(resultFiber))
              )
          )
        )
        .bind("a", ({ innerReleaseMap, raceResult }) =>
          raceResult.fold(
            (fiber) =>
              Effect.fiberId
                .flatMap((id) =>
                  fiber
                    .interrupt()
                    .ensuring(
                      innerReleaseMap.releaseAll(
                        Exit.interrupt(id),
                        ExecutionStrategy.Sequential
                      )
                    )
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
export function timeout(duration: number, __tsplusTrace?: string) {
  return <R, E, A>(self: Managed<R, E, A>): Managed<R & HasClock, E, Option<A>> =>
    self.timeout(duration)
}
