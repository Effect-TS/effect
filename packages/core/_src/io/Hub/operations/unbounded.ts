import { makeHub } from "@effect-ts/core/io/Hub/operations/_internal/makeHub";
import { makeUnbounded } from "@effect-ts/core/io/Hub/operations/_internal/makeUnbounded";
import { Strategy } from "@effect-ts/core/io/Hub/operations/strategy";

/**
 * Creates an unbounded hub.
 *
 * @tsplus static ets/Hub/Ops unbounded
 */
export function unbounded<A>(__tsplusTrace?: string): UIO<Hub<A>> {
  return Effect.succeed(makeUnbounded<A>()).flatMap((atomicHub) => makeHub(atomicHub, Strategy.Dropping()));
}
