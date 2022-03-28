import type { UIO } from "../../Effect"
import { ExecutionStrategy } from "../../ExecutionStrategy"
import { Scope } from "../definition"

/**
 * Makes a scope. Finalizers added to this scope will be run sequentially in
 * the reverse of the order in which they were added when this scope is
 * closed.
 *
 * @tsplus static ets/ScopeOps make
 */
export const make: UIO<Scope.Closeable> = Scope.makeWith(ExecutionStrategy.Sequential)
