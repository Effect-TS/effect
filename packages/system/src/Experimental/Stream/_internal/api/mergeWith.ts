// ets_tracing: off

import * as T from "../../../../Effect"
import * as Ex from "../../../../Exit"
import * as CH from "../../Channel"
import * as MH from "../../Channel/_internal/mergeHelpers"
import * as C from "../core"
import * as Map from "./map"

export type TerminationStrategy = "Left" | "Right" | "Both" | "Either"

/**
 * Merges this stream and the specified stream together to a common element
 * type with the specified mapping functions.
 *
 * New produced stream will terminate when both specified stream terminate if
 * no termination strategy is specified.
 */
export function mergeWith<R, R1, E, E1, A, A1, A2, A3>(
  self: C.Stream<R, E, A>,
  that: C.Stream<R1, E1, A1>,
  l: (a: A) => A2,
  r: (a: A1) => A3,
  strategy: TerminationStrategy = "Both"
): C.Stream<R1 & R, E | E1, A2 | A3> {
  const handler =
    (terminate: boolean) =>
    (
      exit: Ex.Exit<E | E1, any>
    ): MH.MergeDecision<R1, E | E1, unknown, E | E1, any> => {
      if (terminate || !Ex.succeeded(exit)) {
        return MH.done(T.done(exit))
      } else {
        return MH.await_(T.done)
      }
    }

  return new C.Stream<R1 & R, E | E1, A2 | A3>(
    CH.mergeWith_(
      Map.map_(self, l).channel,
      Map.map_(that, r).channel,
      handler(strategy === "Either" || strategy === "Left"),
      handler(strategy === "Either" || strategy === "Right")
    )
  )
}
