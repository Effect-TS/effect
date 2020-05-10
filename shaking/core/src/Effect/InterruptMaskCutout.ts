import { FunctionN } from "fp-ts/lib/function"

import { Effect } from "../Support/Common/effect"

import { interruptibleRegion } from "./interruptibleRegion"

/**
 * The type of a function that can restore outer interruptible state
 */
export type InterruptMaskCutout<S, R, E, A> = FunctionN<
  [Effect<S, R, E, A>],
  Effect<S, R, E, A>
>

export function makeInterruptMaskCutout<S, R, E, A>(
  state: boolean
): InterruptMaskCutout<S, R, E, A> {
  return (inner) => interruptibleRegion(inner, state)
}
