import type { LazyArg } from "../../../data/Function"
import type { UIO } from "../../Effect"
import { Effect } from "../../Effect"
import { Ref } from "../definition"

/**
 * Creates a new `Ref` with the specified value.
 *
 * @tsplus static ets/RefOps make
 */
export function make<A>(value: LazyArg<A>, __tsplusTrace?: string): UIO<Ref<A>> {
  return Effect.succeed(Ref.unsafeMake(value()))
}
