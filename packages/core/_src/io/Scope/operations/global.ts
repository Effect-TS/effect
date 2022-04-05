import { CloseableScopeInternal } from "@effect-ts/core/io/Scope/operations/_internal/CloseableScopeInternal";

/**
 * The global scope which is never closed. Finalizers added to this scope will
 * be immediately discarded and closing this scope has no effect.
 *
 * @tsplus static ets/Scope/Ops global
 */
export const global: LazyValue<Scope.Closeable> = LazyValue.make(
  () =>
    new CloseableScopeInternal(
      Scope.make,
      () => Effect.unit,
      () => Effect.unit
    )
);
