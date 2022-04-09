import type { Scope } from "@effect/core/io/Scope/definition";
import { ScopeSym } from "@effect/core/io/Scope/definition";

export class ScopeInternal implements Scope {
  readonly [ScopeSym]: ScopeSym = ScopeSym;

  constructor(
    readonly _fork: UIO<Scope.Closeable>,
    readonly _addFinalizerExit: (finalizer: Finalizer) => UIO<void>
  ) {}
}

/**
 * @tsplus macro remove
 */
export function concreteScope(_: Scope): asserts _ is ScopeInternal {
  //
}
