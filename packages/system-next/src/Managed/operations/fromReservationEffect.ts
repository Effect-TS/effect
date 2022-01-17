import * as Tp from "../../Collections/Immutable/Tuple"
import { provideEnvironment_ } from "../../Effect/operations/provideEnvironment"
import { currentReleaseMap } from "../../FiberRef/definition/data"
import { get as fiberRefGet } from "../../FiberRef/operations/get"
import { pipe } from "../../Function"
import type { Managed } from "../definition"
import { managedApply } from "../definition"
import { addIfOpen_ } from "../ReleaseMap/addIfOpen"
import type { Finalizer } from "../ReleaseMap/finalizer"
import { release_ } from "../ReleaseMap/release"
import type { Reservation } from "../reservation"
import * as T from "./_internal/effect"

/**
 * Creates a `Managed` from a `Reservation` produced by an effect. Evaluating
 * the effect that produces the reservation will be performed
 * *uninterruptibly*, while the acquisition step of the reservation will be
 * performed *interruptibly*. The release step will be performed
 * uninterruptibly as usual.
 *
 * This two-phase acquisition allows for resource acquisition flows that can
 * be safely interrupted and released.
 */
export function fromReservationEffect<R, E, A>(
  reservation: T.Effect<R, E, Reservation<R, E, A>>,
  __trace?: string
): Managed<R, E, A> {
  return managedApply(
    T.uninterruptibleMask((status) =>
      pipe(
        T.do,
        T.bind("r", () => T.environment<R>()),
        T.bind("releaseMap", () => fiberRefGet(currentReleaseMap.value)),
        T.bind("reserved", () => reservation),
        T.bind("releaseKey", ({ r, releaseMap, reserved }) =>
          addIfOpen_(releaseMap, (exit) =>
            provideEnvironment_(reserved.release(exit), r, __trace)
          )
        ),
        T.chain(({ releaseKey, releaseMap, reserved }) => {
          switch (releaseKey._tag) {
            case "None": {
              return T.interrupt
            }
            case "Some": {
              return T.map_(
                status.restore(reserved.acquire),
                (a): Tp.Tuple<[Finalizer, A]> =>
                  Tp.tuple((exit) => release_(releaseMap, releaseKey.value, exit), a)
              )
            }
          }
        })
      )
    )
  )
}
