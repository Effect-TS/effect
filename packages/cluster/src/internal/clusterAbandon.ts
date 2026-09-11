import * as Cause from "effect/Cause"
import * as Effect from "effect/Effect"
import * as FiberId from "effect/FiberId"
import { globalValue } from "effect/GlobalValue"
import * as HashSet from "effect/HashSet"

// v3 carries interruption provenance through FiberId rather than cause annotations.
const interruptor = globalValue("@effect/cluster/internal/clusterAbandon/interruptor", () => FiberId.unsafeMake())

export const interrupt: Effect.Effect<void> = Effect.withFiberRuntime((fiber) => {
  // Signal the fiber so recovery cannot swallow abandonment. The runtime defers
  // the signal while masked and retains its provenance when interruption resumes.
  fiber.unsafeInterruptAsFork(interruptor)
  return Effect.void
})

export const isInterruptor = (id: FiberId.FiberId): boolean => HashSet.has(FiberId.ids(id), interruptor.id)

export const isCause = (cause: Cause.Cause<unknown>): boolean => {
  for (const id of Cause.interruptors(cause)) {
    if (isInterruptor(id)) return true
  }
  return false
}
