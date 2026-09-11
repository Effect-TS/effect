import * as Cause from "effect/Cause"
import * as Effect from "effect/Effect"
import * as FiberId from "effect/FiberId"
import { globalValue } from "effect/GlobalValue"
import * as HashSet from "effect/HashSet"

// v3 carries interruption provenance through FiberId rather than cause annotations.
const interruptor = globalValue("@effect/cluster/internal/clusterAbandon/interruptor", () => FiberId.unsafeMake())

export const interrupt: Effect.Effect<never> = Effect.interruptible(Effect.interruptWith(interruptor))

export const isInterruptor = (id: FiberId.FiberId): boolean => HashSet.has(FiberId.ids(id), interruptor.id)

export const isCause = (cause: Cause.Cause<unknown>): boolean => {
  for (const id of Cause.interruptors(cause)) {
    if (isInterruptor(id)) return true
  }
  return false
}
