import * as Context from "../../Context.ts"
import * as Effect from "../../Effect.ts"

/**
 * Collects the durable operations performed directly by a compensated
 * workflow step, which identify the step across workflow replays.
 *
 * @internal
 */
export interface CompensationStep {
  readonly keys: Set<string>
  readonly parent: CompensationStep | undefined
}

/**
 * @internal
 */
export const CurrentCompensationStep = Context.Reference<CompensationStep | undefined>(
  "effect/workflow/Workflow/CurrentCompensationStep",
  { defaultValue: () => undefined }
)

/**
 * Records `key` as a durable operation of `step` and every step enclosing it.
 *
 * @internal
 */
export const recordOperation = (step: CompensationStep | undefined, key: string): void => {
  for (let current = step; current; current = current.parent) {
    current.keys.add(key)
  }
}

/**
 * Records `key` as a durable operation of every enclosing compensated step.
 * The operation body is excluded, because replay skips it once its result is
 * stored.
 *
 * @internal
 */
export const durableOperation = <A, E, R>(
  key: string,
  effect: Effect.Effect<A, E, R>
): Effect.Effect<A, E, R> =>
  Effect.contextWith((context: Context.Context<never>) => {
    const step = Context.get(context, CurrentCompensationStep)
    if (step === undefined) return effect
    recordOperation(step, key)
    return Effect.provideService(effect, CurrentCompensationStep, undefined)
  })
