import { CloseableScopeInternal } from "@effect/core/io/Scope/operations/_internal/CloseableScopeInternal"

/**
 * The global scope which is never closed. Finalizers added to this scope will
 * be immediately discarded and closing this scope has no effect.
 *
 * @tsplus static effect/core/io/Scope.Ops global
 */
export const global: Scope.Closeable = new CloseableScopeInternal(
  Scope.make,
  () => Effect.unit,
  () => Effect.unit
)
