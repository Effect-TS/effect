import { pipe } from "../../Function"

import * as T from "./deps"
import { Managed } from "./managed"
import { ReleaseMap, Finalizer } from "./releaseMap"
import { Reservation } from "./reservation"

/**
 * Creates a `Managed` from a `Reservation` produced by an effect. Evaluating
 * the effect that produces the reservation will be performed *uninterruptibly*,
 * while the acquisition step of the reservation will be performed *interruptibly*.
 * The release step will be performed uninterruptibly as usual.
 *
 * This two-phase acquisition allows for resource acquisition flows that can be
 * safely interrupted and released.
 */
export const makeReserve = <S, R, E, S2, R2, E2, A>(
  reservation: T.Effect<S, R, E, Reservation<S2, R2, E2, A>>
) =>
  new Managed<S | S2, R & R2, E | E2, A>(
    T.uninterruptibleMask(({ restore }) =>
      pipe(
        T.of,
        T.bind("tp", () => T.environment<[R & R2, ReleaseMap]>()),
        T.let("r", (s) => s.tp[0]),
        T.let("releaseMap", (s) => s.tp[1]),
        T.bind("reserved", (s) => T.provideAll_(reservation, s.r)),
        T.bind("releaseKey", (s) =>
          s.releaseMap.addIfOpen((x) => T.provideAll_(s.reserved.release(x), s.r))
        ),
        T.bind("finalizerAndA", (s) => {
          const k = s.releaseKey
          switch (k._tag) {
            case "None": {
              return T.interrupt
            }
            case "Some": {
              return T.map_(
                restore(
                  T.provideSome_(s.reserved.acquire, ([r]: [R & R2, ReleaseMap]) => r)
                ),
                (a): [Finalizer, A] => [(e) => s.releaseMap.release(k.value, e), a]
              )
            }
          }
        }),
        T.map((s) => s.finalizerAndA)
      )
    )
  )
