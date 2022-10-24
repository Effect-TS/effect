import { Running } from "@effect/core/io/Scope/ReleaseMap/_internal/State"
import * as Option from "@fp-ts/data/Option"

/**
 * Runs the specified finalizer and removes it from the finalizers associated
 * with this scope.
 *
 * @tsplus static effect/core/io/ReleaseMap.Aspects release
 * @tsplus pipeable effect/core/io/ReleaseMap release
 * @category mutations
 * @since 1.0.0
 */
export function release(key: number, exit: Exit<any, any>) {
  return (self: ReleaseMap): Effect<never, never, any> =>
    self.ref.modify((state) => {
      switch (state._tag) {
        case "Exited": {
          return [Effect.unit, state] as const
        }
        case "Running": {
          const finalizers = state.finalizers()
          const option = Option.fromNullable(finalizers.get(key))
          finalizers.delete(key)
          let effect: Effect<never, never, void>
          switch (option._tag) {
            case "None": {
              effect = Effect.unit
              break
            }
            case "Some": {
              effect = state.update(option.value)(exit)
              break
            }
          }
          return [
            effect,
            new Running(state.nextKey, finalizers, state.update)
          ] as const
        }
      }
    })
      .flatten
}
