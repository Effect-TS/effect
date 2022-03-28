import { LazyValue } from "../../../data/LazyValue"
import { Effect } from "../../Effect"
import { CloseableScope, Scope } from "../definition"

/**
 * The global scope which is never closed. Finalizers added to this scope will
 * be immediately discarded and closing this scope has no effect.
 *
 * @tsplus static ets/ScopeOps global
 */
export const global: LazyValue<Scope.Closeable> = new LazyValue(
  () =>
    new CloseableScope({
      fork: Scope.make,
      addFinalizerExit: () => Effect.unit,
      close: () => Effect.unit
    })
)
