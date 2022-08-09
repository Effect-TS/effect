import type { Scope } from "@effect/core/io/Scope/definition"
import { CloseableScopeSym, ScopeSym } from "@effect/core/io/Scope/definition"

export class CloseableScopeInternal implements Scope.Closeable {
  readonly [ScopeSym]: ScopeSym = ScopeSym
  readonly [CloseableScopeSym]: CloseableScopeSym = CloseableScopeSym

  constructor(
    readonly _fork: Effect<never, never, Scope.Closeable>,
    readonly _addFinalizerExit: (finalizer: Scope.Finalizer) => Effect<never, never, void>,
    readonly _close: (exit: Exit<unknown, unknown>) => Effect<never, never, void>
  ) {}
}

/**
 * @tsplus macro remove
 */
export function concreteCloseableScope(_: Scope): asserts _ is CloseableScopeInternal {
  //
}
