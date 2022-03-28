import type { UIO } from "../../Effect"
import { Effect } from "../../Effect"
import type { Hub } from "../definition"
import { makeHub } from "./_internal/makeHub"
import { makeUnbounded } from "./_internal/makeUnbounded"
import { Strategy } from "./strategy"

/**
 * Creates an unbounded hub.
 *
 * @tsplus static ets/XHubOps unbounded
 */
export function unbounded<A>(__tsplusTrace?: string): UIO<Hub<A>> {
  return Effect.succeed(makeUnbounded<A>()).flatMap((atomicHub) =>
    makeHub(atomicHub, Strategy.Dropping())
  )
}
