import type { Scope } from "@effect/core/io/Scope/definition";
import { CloseableScopeSym, ScopeSym } from "@effect/core/io/Scope/definition";

export class CloseableScopeInternal implements Scope.Closeable {
  readonly [ScopeSym]: ScopeSym = ScopeSym;
  readonly [CloseableScopeSym]: CloseableScopeSym = CloseableScopeSym;

  constructor(
    readonly _fork: Effect.UIO<Scope.Closeable>,
    readonly _addFinalizerExit: (finalizer: Scope.Finalizer) => Effect.UIO<void>,
    readonly _close: (exit: LazyArg<Exit<unknown, unknown>>) => Effect.UIO<void>
  ) {}
}

/**
 * @tsplus macro remove
 */
export function concreteCloseableScope(_: Scope): asserts _ is CloseableScopeInternal {
  //
}
