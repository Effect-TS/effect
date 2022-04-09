import type { Scope } from "@effect/core/io/Scope/definition";
import { CloseableScopeSym, ScopeSym } from "@effect/core/io/Scope/definition";

export class CloseableScopeInternal implements Scope.Closeable {
  readonly [ScopeSym]: ScopeSym = ScopeSym;
  readonly [CloseableScopeSym]: CloseableScopeSym = CloseableScopeSym;

  constructor(
    readonly _fork: UIO<Scope.Closeable>,
    readonly _addFinalizerExit: (finalizer: Finalizer) => UIO<void>,
    readonly _close: (exit: LazyArg<Exit<unknown, unknown>>) => UIO<void>
  ) {}
}

/**
 * @tsplus macro remove
 */
export function concreteCloseableScope(_: Scope): asserts _ is CloseableScopeInternal {
  //
}
