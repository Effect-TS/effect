import { Tuple } from "../../../collection/immutable/Tuple"
import type { LazyArg } from "../../../data/Function"
import { Effect } from "../../Effect"
import { currentReleaseMap } from "../../FiberRef/definition/data"
import { get as fiberRefGet } from "../../FiberRef/operations/get"
import { Managed } from "../definition"
import type { Finalizer } from "../ReleaseMap/finalizer"
import type { Reservation } from "../reservation"

/**
 * Creates a `Managed` from a `Reservation` produced by an effect. Evaluating
 * the effect that produces the reservation will be performed
 * *uninterruptibly*, while the acquisition step of the reservation will be
 * performed *interruptibly*. The release step will be performed
 * uninterruptibly as usual.
 *
 * This two-phase acquisition allows for resource acquisition flows that can
 * be safely interrupted and released.
 *
 * @tsplus static ets/ManagedOps fromReservationEffect
 */
export function fromReservationEffect<R, E, A>(
  reservation: LazyArg<Effect<R, E, Reservation<R, E, A>>>,
  __tsplusTrace?: string
): Managed<R, E, A> {
  return Managed(
    Effect.uninterruptibleMask(({ restore }) =>
      Effect.Do()
        .bind("r", () => Effect.environment<R>())
        .bind("releaseMap", () => fiberRefGet(currentReleaseMap.value))
        .bind("reserved", () => reservation())
        .bind("releaseKey", ({ r, releaseMap, reserved }) =>
          releaseMap.addIfOpen((exit) => reserved.release(exit).provideEnvironment(r))
        )
        .flatMap(({ releaseKey, releaseMap, reserved }) => {
          switch (releaseKey._tag) {
            case "None": {
              return Effect.interrupt
            }
            case "Some": {
              return restore(reserved.acquire).map(
                (a): Tuple<[Finalizer, A]> =>
                  Tuple((exit) => releaseMap.release(releaseKey.value, exit), a)
              )
            }
          }
        })
    )
  )
}
