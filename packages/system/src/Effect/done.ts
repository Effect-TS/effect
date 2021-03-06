// tracing: off

import { accessCallTrace, traceFrom } from "@effect-ts/tracing-utils"

import type { Exit } from "../Exit/exit"
import { halt, succeed, suspend } from "./core"

/**
 * Returns an effect from a `Exit` value.
 *
 * @trace call
 */
export function done<E = never, A = unknown>(exit: Exit<E, A>) {
  const trace = accessCallTrace()
  return suspend(
    traceFrom(trace, () => {
      switch (exit._tag) {
        case "Success": {
          return succeed(exit.value)
        }
        case "Failure": {
          return halt(exit.cause)
        }
      }
    })
  )
}
